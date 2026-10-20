// Relatório de exceções (PDF): calcula os dados de cada seção a partir dos registros do recorte.
// Cada seção é um módulo em ./secoes com { id, titulo, regra, calcular(contexto) }; a ordem e quais entram
// vêm de quem chama (js/config/relatorio.js). Puro, sem DOM: testado em Node.
import { agregar } from '../agregacao.js';
import { resumo } from './secoes/resumo.js';
import { viagens } from './secoes/viagens.js';
import { excecoes } from './secoes/excecoes.js';
import { clientes } from './secoes/clientes.js';
import { motoristas } from './secoes/motoristas.js';
import { veiculos } from './secoes/veiculos.js';
import { locais } from './secoes/locais.js';

export const SECOES = Object.freeze(Object.fromEntries([resumo, viagens, excecoes, clientes, motoristas, veiculos, locais].map(s => [s.id, s])));

// registros: eventos do recorte (filtros do painel + cliente escolhido; todos os clientes = carteira).
// ids: seções a calcular (as que não têm cálculo, como capa e notas, são ignoradas aqui).
// opcoes: { topN, excecoesPorItem, excecoesNoRanking, percentilRaio }
// agregado: agregação já calculada destes mesmos registros (a carteira reaproveita a do painel).
export function montarRelatorio(registros, { ids, opcoes, carteira = false, agregado = agregar(registros) }) {
  const contexto = { registros, agregado, opcoes, carteira };
  const secoes = {};
  for (const id of ids) {
    const secao = SECOES[id];
    if (secao) secoes[id] = { id, titulo: secao.titulo, regra: secao.regra, dados: secao.calcular(contexto) };
  }
  return { secoes, agregado };
}
