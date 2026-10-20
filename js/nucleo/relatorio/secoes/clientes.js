// Ranking por cliente (só no relatório da carteira).
import { principaisExcecoes } from '../apoio.js';

export const clientes = {
  id: 'clientes',
  titulo: 'Clientes da carteira',
  regra: 'Todos os clientes do recorte, do que tem mais eventos para o que tem menos, com a participação no total, as viagens com exceções e a variação do último mês contra o anterior.',
  calcular({ registros, agregado }) {
    const viagensDoCliente = new Map();
    for (const r of registros) {
      if (!r.viagem) continue;
      let v = viagensDoCliente.get(r.cliente);
      if (!v) viagensDoCliente.set(r.cliente, v = new Set());
      v.add(r.viagem);
    }
    const itens = agregado.clientes.map(c => ({
      posicao: c.rank, nome: c.cliente, total: c.total, pct: c.pct, viagens: viagensDoCliente.get(c.cliente)?.size || 0,
      porClasse: { MOTORISTA: c.MOTORISTA, VEICULO: c.VEICULO, CONTEXTO: c.CONTEXTO }, variacao: c.variacao,
      principal: principaisExcecoes(c.porExcecao, agregado.classeDaExcecao, 1).lista[0] ?? null
    }));
    return { itens };
  }
};
