// Notas e encerramento: como cada número foi calculado, filtros, qualidade da leitura e fim.
import { formatarNumero, escaparHtml } from '../../../util/formatacao.js';
import { bloco } from './comum.js';

export function notas(paginador, { secoes, contexto }) {
  paginador.nova({ secao: 'notas', titulo: 'Notas e metodologia', lead: 'Como cada número deste relatório foi calculado.' });
  paginador.adicionar(bloco(`<dl class="regras-rel">${Object.values(secoes).map(s => `<dt>${s.titulo}</dt><dd>${s.regra}</dd>`).join('')}</dl>`));
  const e = contexto.estatisticas;
  const qualidade = [
    ['Arquivo', escaparHtml(contexto.arquivo)], ['Linhas lidas', formatarNumero(e.lidas)], ['Descartadas (sem cliente ou exceção)', formatarNumero(e.descartadas)],
    ['Sem coordenada', formatarNumero(e.semCoord)], ['Longitude corrigida (vinha dobrada no BI)', formatarNumero(e.coordCorrigidas || 0)],
    ['Classe corrigida pelo catálogo', formatarNumero(e.classeCorrigida)], ['Exceções fora do catálogo', formatarNumero(e.naoCatalogadas)]
  ];
  paginador.adicionar(bloco(`<h2>Filtros aplicados</h2><p>${contexto.filtros.length ? contexto.filtros.map(([, html]) => html).join(' · ') : 'Nenhum: base inteira do arquivo.'}</p>
    <h2>Qualidade da leitura do arquivo</h2><div class="qualidade-rel">${qualidade.map(([r, v]) => `<div><span>${r}</span><b>${v}</b></div>`).join('')}</div>`));
  paginador.adicionar(bloco(`<div class="fim-rel"><div class="fim-logo">${contexto.logo}</div><p>Fim do relatório</p>
    <small>Gerado em ${contexto.geradoEm} pelo Painel de Exceções · Raster, ${escaparHtml(contexto.versao)}. Os dados vêm do export do BI de exceções e refletem os filtros acima.</small></div>`, 'fim-bloco'));
}
