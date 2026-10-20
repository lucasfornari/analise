// Viagens com exceções, mês a mês.
import { variacaoContraAnterior } from '../apoio.js';

// Viagens (SMs) distintas no total e em cada mês. Uma viagem conta em todo mês em que teve exceção;
// no total, uma vez só (a soma dos meses pode passar do total: viagens que cruzaram a virada do mês).
export function contarViagens(registros) {
  const todas = new Set(), porMes = new Map(), excecoesPorMes = new Map();
  let semViagem = 0;
  for (const r of registros) {
    if (r.mes) excecoesPorMes.set(r.mes, (excecoesPorMes.get(r.mes) || 0) + 1);
    if (!r.viagem) { semViagem++; continue; }
    todas.add(r.viagem);
    if (!r.mes) continue;
    let doMes = porMes.get(r.mes);
    if (!doMes) porMes.set(r.mes, doMes = new Set());
    doMes.add(r.viagem);
  }
  return { total: todas.size, porMes, excecoesPorMes, semViagem };
}

export const viagens = {
  id: 'viagens',
  titulo: 'Viagens com exceções',
  regra: 'Viagens (SMs distintas) que tiveram ao menos uma exceção. Cada viagem conta em todo mês em que teve exceção, pela data da exceção (não pela data de fim da viagem); no total, conta uma vez só. O export do BI traz apenas viagens com exceção.',
  calcular({ registros, agregado }) {
    const { total, porMes, excecoesPorMes, semViagem } = contarViagens(registros);
    const meses = agregado.meses;
    const viagensDoMes = mes => porMes.get(mes)?.size || 0;
    const linhas = meses.map(mes => {
      const viagensMes = viagensDoMes(mes), excecoes = excecoesPorMes.get(mes) || 0;
      return { mes, viagens: viagensMes, excecoes, porViagem: viagensMes ? excecoes / viagensMes : null, variacao: variacaoContraAnterior(viagensDoMes, mes, meses) };
    });
    const somaMeses = linhas.reduce((s, l) => s + l.viagens, 0);
    return { total, meses: linhas, somaMeses, cruzaramMes: Math.max(0, somaMeses - total), semViagem };
  }
};
