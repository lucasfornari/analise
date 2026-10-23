// Viagens com exceções e exceções por viagem, mês a mês.
// Mais viagens no mês costuma trazer mais exceções; a intensidade real é a quantidade de exceções por viagem.
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
  titulo: 'Viagens e exceções por viagem',
  regra: 'Viagens (SMs distintas) que tiveram ao menos uma exceção. Cada viagem conta em todo mês em que teve exceção, pela data da exceção (não pela data de fim da viagem); no total, conta uma vez só. Exceções por viagem = exceções do mês ÷ viagens do mês: é o que mostra se o mês foi melhor ou pior, já que mais viagens trazem mais exceções. O export do BI traz apenas viagens com exceção.',
  calcular({ registros, agregado }) {
    const { total, porMes, excecoesPorMes, semViagem } = contarViagens(registros);
    const meses = agregado.meses;
    const viagensDoMes = mes => porMes.get(mes)?.size || 0;
    const excecoesDoMes = mes => excecoesPorMes.get(mes) || 0;
    const porViagemDoMes = mes => viagensDoMes(mes) ? excecoesDoMes(mes) / viagensDoMes(mes) : 0;
    const linhas = meses.map(mes => ({
      mes, viagens: viagensDoMes(mes), excecoes: excecoesDoMes(mes), porViagem: viagensDoMes(mes) ? porViagemDoMes(mes) : null,
      variacao: variacaoContraAnterior(viagensDoMes, mes, meses),              // viagens
      variacaoExcecoes: variacaoContraAnterior(excecoesDoMes, mes, meses),
      variacaoPorViagem: variacaoContraAnterior(porViagemDoMes, mes, meses)
    }));
    const somaMeses = linhas.reduce((s, l) => s + l.viagens, 0);
    return { total, meses: linhas, somaMeses, cruzaramMes: Math.max(0, somaMeses - total), semViagem };
  }
};
