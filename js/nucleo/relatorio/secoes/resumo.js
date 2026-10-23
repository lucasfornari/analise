// Resumo executivo: os números principais do recorte e os destaques de cada seção.
import { viagens as secaoViagens } from './viagens.js';

export const resumo = {
  id: 'resumo',
  titulo: 'Resumo',
  regra: 'Números do recorte do relatório: cliente escolhido (ou carteira) com os filtros do painel no momento da geração.',
  calcular(contexto) {
    const { registros, agregado } = contexto;
    let inicio = null, fim = null;
    for (const r of registros) {
      if (!r.data) continue;
      if (!inicio || r.data < inicio) inicio = r.data;
      if (!fim || r.data > fim) fim = r.data;
    }
    const porViagens = secaoViagens.calcular(contexto);
    const viagens = porViagens.total;
    const ultimo = porViagens.meses[porViagens.meses.length - 1];
    return {
      eventos: agregado.n,
      viagens,
      porViagem: viagens ? agregado.n / viagens : null,
      porClasse: { MOTORISTA: agregado.MOTORISTA, VEICULO: agregado.VEICULO, CONTEXTO: agregado.CONTEXTO },
      clientes: agregado.nClientes,
      motoristas: agregado.motoristas.length,
      veiculos: agregado.placas.length,
      locais: agregado.locais.filter(l => l.local !== '(sem referência)').length,
      tiposDeExcecao: agregado.excecoes.length,
      meses: agregado.meses,
      inicio, fim,
      variacao: agregado.variacao,
      // último mês: exceções, viagens e exceções por viagem com a variação de cada um (lidos juntos no destaque)
      ultimoMes: ultimo ?? null,
      destaques: {
        excecao: agregado.excecoes[0] ? { nome: agregado.excecoes[0].excecao, n: agregado.excecoes[0].total, pct: agregado.excecoes[0].total / agregado.n } : null,
        motorista: agregado.motoristas[0] ? { nome: agregado.motoristas[0].motorista, n: agregado.motoristas[0].total } : null,
        veiculo: agregado.placas[0] ? { nome: agregado.placas[0].placa, n: agregado.placas[0].total } : null,
        local: agregado.locais.find(l => l.local !== '(sem referência)') ?? null
      }
    };
  }
};
