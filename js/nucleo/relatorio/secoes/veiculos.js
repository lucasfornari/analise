// Top N veículos (placas) por número de exceções de veículo e contexto suspeito.
import { principaisExcecoes } from '../apoio.js';

export const veiculos = {
  id: 'veiculos',
  titulo: 'Veículos com mais exceções',
  regra: 'Veículos (placa do cavalo) contam exceções de veículo e de contexto suspeito; as de motorista ficam com o motorista. Ordem: mais eventos primeiro.',
  calcular({ agregado, opcoes }) {
    const totalClasse = agregado.VEICULO + agregado.CONTEXTO;
    const itens = agregado.placas.slice(0, opcoes.topN).map((p, i) => ({
      posicao: i + 1, nome: p.placa, cliente: p.cliente, total: p.total, pct: totalClasse ? p.total / totalClasse : 0,
      viagens: p.nViagens, tecnologia: p.tecnologia, excecoes: principaisExcecoes(p.porExcecao, agregado.classeDaExcecao, opcoes.excecoesPorItem)
    }));
    return { itens, totalClasse, totalDeVeiculos: agregado.placas.length, cobertura: totalClasse ? itens.reduce((s, x) => s + x.total, 0) / totalClasse : 0 };
  }
};
