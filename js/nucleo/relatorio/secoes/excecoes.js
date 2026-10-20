// Exceções (alertas): total, divisão por classe, evolução mensal e ranking por nome.
import { principaisExcecoes } from '../apoio.js';

export const excecoes = {
  id: 'excecoes',
  titulo: 'Exceções',
  regra: 'Exceções e alertas são a mesma coisa: cada linha válida do export é um evento. A classe vem do catálogo fixo de exceções (prevalece sobre a coluna "classe" da planilha).',
  calcular({ agregado, opcoes }) {
    const porExcecao = new Map(agregado.excecoes.map(e => [e.excecao, e.total]));
    return {
      total: agregado.n,
      porClasse: { MOTORISTA: agregado.MOTORISTA, VEICULO: agregado.VEICULO, CONTEXTO: agregado.CONTEXTO },
      porMes: agregado.mesClasse,
      variacao: agregado.variacao,
      ranking: principaisExcecoes(porExcecao, agregado.classeDaExcecao, opcoes.excecoesNoRanking)
    };
  }
};
