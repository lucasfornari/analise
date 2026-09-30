// Frase com os filtros ativos acima do painel e contador no botão do menu.
import { $ } from '../util/dom.js';
import { escaparHtml, formatarDia } from '../util/formatacao.js';
import { chavePlaca } from '../nucleo/texto.js';
import { ROTULO_CLASSE } from '../nucleo/classificacao.js';

export class ResumoFiltros {
  constructor(painel) {
    this.estado = painel.estado;
  }

  renderizar() {
    const partes = this.#partes(this.estado.filtroAtual());
    const contador = $('#filterBadge');
    contador.textContent = partes.length;
    contador.classList.toggle('hidden', !partes.length);
    $('#activeFilters').innerHTML = partes.length ? 'Filtrando por ' + partes.join(' · ') : 'Sem filtros: mostrando a base inteira';
  }

  #partes(f) {
    const universo = this.estado.universo;
    const unico = conjunto => escaparHtml([...conjunto][0]);
    const partes = [];
    if (f.de || f.ate) partes.push(`período <b>${formatarDia(f.de) || 'início'} a ${formatarDia(f.ate) || 'fim'}</b>`);
    if (f.classes) partes.push(`classes <b>${[...f.classes].map(c => ROTULO_CLASSE[c]).join(', ') || 'nenhuma'}</b>`);
    if (f.excecoes) partes.push(`<b>${f.excecoes.size}</b> de ${universo.exc.size} exceções`);
    if (f.clientes) partes.push(f.clientes.size === 1 ? `cliente <b>${unico(f.clientes)}</b>` : `<b>${f.clientes.size}</b> clientes`);
    if (f.perfis) partes.push(f.perfis.size === 1 ? `perfil <b>${unico(f.perfis)}</b>` : `<b>${f.perfis.size}</b> perfis`);
    if (f.placa) partes.push(`placa contém <b>${escaparHtml(chavePlaca(f.placa))}</b>`);
    if (f.semDuplicados) partes.push('<b>sem duplicados</b>');
    return partes;
  }
}
