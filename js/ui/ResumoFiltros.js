// Filtros ativos como etiquetas removíveis acima do painel, e contador no botão do menu.
import { $ } from '../util/dom.js';
import { escaparHtml, formatarDia, formatarNumero, abreviarCliente, capitalizar } from '../util/formatacao.js';
import { chavePlaca } from '../nucleo/texto.js';
import { ROTULO_CLASSE } from '../nucleo/catalogoExcecoes.js';
import { LISTAS } from '../estado/Estado.js';

const exibir = (lista, valor) => lista === 'cli' ? abreviarCliente(valor) : lista === 'exc' ? capitalizar(valor) : valor;

export class ResumoFiltros {
  constructor(painel) {
    this.estado = painel.estado;
    $('#activeFilters').addEventListener('click', e => {
      const botao = e.target.closest('[data-limpar]');
      if (!botao) return;
      this.estado.limpar(botao.dataset.limpar);
      painel.atualizar(true);
    });
  }

  renderizar() {
    const etiquetas = this.#etiquetas();
    const contador = $('#filterBadge');
    contador.textContent = etiquetas.length;
    contador.classList.toggle('hidden', !etiquetas.length);
    $('#activeFilters').innerHTML = etiquetas.length
      ? '<span class="rotulo-filtros">Filtrando por</span>' + etiquetas.map(([filtro, html]) =>
        `<button class="etiqueta" data-limpar="${filtro}" title="Remover este filtro">${html}<span aria-hidden="true">✕</span></button>`).join('')
      : 'Sem filtros: mostrando a base inteira';
  }

  // [filtro, html] para cada filtro ativo
  #etiquetas() {
    const f = this.estado.filtroAtual();
    const etiquetas = [];
    if (f.de || f.ate) etiquetas.push(['periodo', `período <b>${formatarDia(f.de) || 'início'} a ${formatarDia(f.ate) || 'fim'}</b>`]);
    if (f.classes) etiquetas.push(['classes', `classe <b>${[...f.classes].map(c => ROTULO_CLASSE[c]).join(', ') || 'nenhuma'}</b>`]);
    if (f.placa) etiquetas.push(['placa', `placa contém <b>${escaparHtml(chavePlaca(f.placa))}</b>`]);
    for (const [lista, { singular, plural }] of Object.entries(LISTAS)) {
      const sel = f.listas[lista];
      if (!sel) continue;
      etiquetas.push([lista, sel.size === 1
        ? `${singular} <b>${escaparHtml(exibir(lista, [...sel][0]))}</b>`
        : `<b>${formatarNumero(sel.size)}</b> ${plural}`]);
    }
    if (f.semDuplicados) etiquetas.push(['semDuplicados', '<b>sem duplicados</b>']);
    return etiquetas;
  }
}
