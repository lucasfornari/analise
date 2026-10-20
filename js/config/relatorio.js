// Relatório em PDF: folhas na ordem em que saem. Para incluir ou remover uma folha, edite esta lista.
// Cada id tem o cálculo em js/nucleo/relatorio/secoes (se precisar de dados) e o desenho em js/ui/relatorio/folhas.
// modos: em quais relatórios a folha entra ('cliente' = um cliente; 'carteira' = todos os clientes).
const AMBOS = ['cliente', 'carteira'];
export const FOLHAS_DO_RELATORIO = Object.freeze([
  { id: 'capa', modos: AMBOS },
  { id: 'resumo', modos: AMBOS },
  { id: 'viagens', modos: AMBOS },
  { id: 'excecoes', modos: AMBOS },
  { id: 'clientes', modos: ['carteira'] },
  { id: 'motoristas', modos: AMBOS },
  { id: 'veiculos', modos: AMBOS },
  { id: 'locais', modos: AMBOS },
  { id: 'notas', modos: AMBOS }
]);

export const OPCOES_DO_RELATORIO = Object.freeze({
  topN: 10,                 // itens nas listas de motoristas, veículos e locais
  excecoesPorItem: 5,       // principais exceções de cada item
  excecoesNoRanking: 15,    // exceções na folha de exceções
  percentilRaio: 0.9        // raio sugerido do alvo: cobre 90% dos eventos do local
});
