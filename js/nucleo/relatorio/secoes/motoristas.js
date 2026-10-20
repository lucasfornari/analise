// Top N motoristas por número de exceções de motorista, com as principais exceções de cada um.
import { principaisExcecoes } from '../apoio.js';

export const motoristas = {
  id: 'motoristas',
  titulo: 'Motoristas com mais exceções',
  regra: 'Motoristas contam só exceções da classe motorista (as de veículo e contexto ficam com a placa). Ordem: mais eventos primeiro.',
  calcular({ agregado, opcoes }) {
    const totalClasse = agregado.MOTORISTA;
    const itens = agregado.motoristas.slice(0, opcoes.topN).map((m, i) => ({
      posicao: i + 1, nome: m.motorista, cliente: m.cliente, total: m.total, pct: totalClasse ? m.total / totalClasse : 0,
      placas: m.nPlacas, localMaisFrequente: m.topLocal, excecoes: principaisExcecoes(m.porExcecao, agregado.classeDaExcecao, opcoes.excecoesPorItem)
    }));
    return { itens, totalClasse, totalDeMotoristas: agregado.motoristas.length, cobertura: totalClasse ? itens.reduce((s, x) => s + x.total, 0) / totalClasse : 0 };
  }
};
