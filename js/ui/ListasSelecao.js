// Listas de multisseleção (clientes, motoristas, placas, exceções, perfis) em acordeão: um painel aberto por vez.
// Cada opção mostra quantos eventos teria com os DEMAIS filtros (contagem facetada) e, por padrão,
// some quando não tem eventos: escolher um cliente deixa nas outras listas só o que é dele.
import { $, $$ } from '../util/dom.js';
import { formatarNumero, abreviarCliente, capitalizar, escaparHtml } from '../util/formatacao.js';
import { normalizarChave } from '../nucleo/texto.js';
import { CLASSES, ROTULO_CLASSE, ROTULO_GRUPO } from '../nucleo/catalogoExcecoes.js';
import { LISTAS } from '../estado/Estado.js';
import { valorNaLista } from '../nucleo/filtro.js';

const SETA = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
const rotuloDoValor = (lista, valor) => lista === 'exc' ? capitalizar(valor) : lista === 'cli' ? abreviarCliente(valor) : valor;

// Principais clientes de cada valor ("COOPERCARGA, SILVIO +2"), para identificar motoristas, placas e perfis.
function clientesPorValor(registros, lista) {
  const porValor = new Map();
  for (const r of registros) {
    const valor = valorNaLista(r, lista);
    let m = porValor.get(valor);
    if (!m) porValor.set(valor, m = new Map());
    m.set(r.cliente, (m.get(r.cliente) || 0) + 1);
  }
  const resumo = new Map();
  for (const [valor, m] of porValor) {
    const clientes = [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => abreviarCliente(c));
    resumo.set(valor, clientes.slice(0, 2).join(', ') + (clientes.length > 2 ? ` +${clientes.length - 2}` : ''));
  }
  return resumo;
}

export class ListasSelecao {
  aberta = null;
  soDisponiveis = true;    // oculta opções sem eventos nos demais filtros (preferência única para todas as listas)
  #montadas = new Set();   // listas cujo DOM já foi criado (sob demanda: motoristas e placas têm milhares de opções)

  constructor(painel) {
    this.painel = painel;
    this.estado = painel.estado;
    $('#acc').innerHTML = Object.entries(LISTAS).map(([lista, l]) => this.#secaoHtml(lista, l)).join('');
    $$('[data-so-disponiveis]').forEach(c => c.onchange = () => {
      this.soDisponiveis = c.checked;
      $$('[data-so-disponiveis]').forEach(x => { x.checked = c.checked; });
      this.#renderizarOpcoes(this.aberta);
    });

    $$('.acc-head').forEach(cabeca => cabeca.onclick = () => {
      const lista = cabeca.parentElement.dataset.sec;
      this.abrir(this.aberta === lista ? null : lista);
    });
    $$('.fly-close').forEach(b => b.onclick = e => { e.stopPropagation(); this.fechar(); });
    document.addEventListener('mousedown', e => {
      if (this.aberta && !e.target.closest('.acc-body') && !e.target.closest('.acc-head')) this.fechar();
    });
    // Esc com texto na busca limpa a busca (tratado no campo); sem texto, fecha o painel
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.aberta && !(e.target.matches('input[type=search]') && e.target.value)) this.fechar();
    });

    $$('[data-all]').forEach(b => b.onclick = () => this.#marcar(b.dataset.all, true));
    $$('[data-none]').forEach(b => b.onclick = () => this.#marcar(b.dataset.none, false));
    for (const lista in LISTAS) this.#configurarBusca(lista);
  }

  #secaoHtml(lista, l) {
    return `<section class="acc-sec" data-sec="${lista}">
      <button class="acc-head" aria-expanded="false"><span class="ttl">${l.titulo}</span><span class="sum" id="${lista}Sum"></span><span class="cnt" id="${lista}Count"></span>${SETA}</button>
      <div class="acc-body" role="dialog" aria-label="Filtro de ${l.plural}">
        <div class="fly-head"><h4>${l.titulo}</h4><span class="cnt" id="${lista}FlyCnt"></span><button class="fly-close" title="Fechar (Esc)" aria-label="Fechar">✕</button></div>
        <input type="search" id="${lista}Search" placeholder="${l.busca}">
        <div class="acc-tools"><span id="${lista}Hint">&nbsp;</span><span class="linkbtns"><button data-all="${lista}">Marcar todos</button><button data-none="${lista}">Desmarcar</button></span></div>
        <label class="so-disponiveis"><input type="checkbox" data-so-disponiveis checked> Só opções com eventos nos demais filtros</label>
        <div class="checklist" id="${lista}List"></div>
        <div class="fly-foot"><span>O filtro é aplicado na hora e combina com os demais. Com busca ativa, marcar e desmarcar valem só para os itens encontrados.</span><button class="btn primary fly-close">Concluir</button></div>
      </div>
    </section>`;
  }

  abrir(lista) {
    this.aberta = lista;
    $$('.acc-sec').forEach(secao => {
      const ativa = secao.dataset.sec === lista;
      secao.classList.toggle('open', ativa);
      secao.querySelector('.acc-head').setAttribute('aria-expanded', ativa);
    });
    if (!lista) return;
    this.#montar(lista);
    this.#renderizarOpcoes(lista);
    setTimeout(() => this.#busca(lista).focus({ preventScroll: true }), 30);
  }

  fechar() { this.abrir(null); }

  // Novo arquivo ou limpeza de filtros: descarta as opções montadas e as buscas.
  reiniciar() {
    this.fechar();
    this.#montadas.clear();
    for (const lista in LISTAS) {
      $(`#${lista}List`).replaceChildren();
      this.#busca(lista).value = '';
      this.#atualizarFerramentas(lista, '', 0);
    }
  }

  // Cria as opções da lista, da mais para a menos frequente na base inteira.
  #montar(lista) {
    if (this.#montadas.has(lista)) return;
    this.#montadas.add(lista);
    const registros = this.estado.registros;
    const contagem = new Map();
    for (const r of registros) {
      const valor = valorNaLista(r, lista);
      contagem.set(valor, (contagem.get(valor) || 0) + 1);
    }
    const ordem = [...contagem.keys()].sort((a, b) => contagem.get(b) - contagem.get(a) || a.localeCompare(b));
    const caixa = $(`#${lista}List`);
    const fragmento = document.createDocumentFragment();

    if (lista === 'exc') {
      // exceções agrupadas por classe, com atalho para selecionar só o grupo
      const definicao = new Map(registros.map(r => [r.excecao, r]));
      for (const classe of CLASSES) {
        const itens = ordem.filter(e => definicao.get(e).classe === classe);
        if (!itens.length) continue;
        const grupo = document.createElement('div');
        grupo.className = 'grp';
        grupo.innerHTML = `<span>${ROTULO_CLASSE[classe]}</span>`;
        const soEstes = Object.assign(document.createElement('button'), { className: 'btn small grp-btn', textContent: 'só estes' });
        soEstes.onclick = () => { this.estado.selecao.exc = new Set(itens); this.painel.atualizar(true); };
        grupo.appendChild(soEstes);
        fragmento.appendChild(grupo);
        for (const e of itens) fragmento.appendChild(this.#opcao(lista, e, capitalizar(e), ROTULO_GRUPO[definicao.get(e).grupo]));
      }
    } else {
      const detalhes = lista === 'cli' ? new Map() : clientesPorValor(registros, lista);
      for (const valor of ordem) fragmento.appendChild(this.#opcao(lista, valor, valor, detalhes.get(valor)));
    }
    caixa.replaceChildren(fragmento);
  }

  #opcao(lista, valor, rotulo, detalhe) {
    const linha = document.createElement('label');
    linha.dataset.val = valor;
    linha.dataset.search = normalizarChave(rotulo + ' ' + (detalhe || ''));
    linha.title = valor + (detalhe ? '\n' + detalhe : '');
    linha.innerHTML = `<input type="checkbox"><span><span class="t">${escaparHtml(rotulo)}</span>${detalhe ? `<small>${escaparHtml(detalhe)}</small>` : ''}</span><em></em>`;
    const marcador = linha.firstChild;
    marcador.onchange = () => {
      const sel = this.estado.selecao[lista];
      marcador.checked ? sel.add(valor) : sel.delete(valor);
      this.painel.atualizar(true);
    };
    return linha;
  }

  #busca(lista) { return $(`#${lista}Search`); }

  // Com busca ativa, marcar/desmarcar age só nos itens visíveis.
  #marcar(lista, marcado) {
    const s = this.estado.selecao;
    if (this.#busca(lista).value.trim()) {
      const visiveis = $$(`#${lista}List label:not(.hidden)`).map(l => l.dataset.val);
      visiveis.forEach(v => marcado ? s[lista].add(v) : s[lista].delete(v));
    } else {
      s[lista] = marcado ? new Set(this.estado.universo[lista]) : new Set();
    }
    this.painel.atualizar(true);
  }

  #configurarBusca(lista) {
    const campo = this.#busca(lista);
    campo.oninput = () => this.#renderizarOpcoes(lista);
    campo.onkeydown = e => {
      if (e.key === 'Escape' && campo.value) { e.stopPropagation(); campo.value = ''; campo.oninput(); }
    };
  }

  #atualizarFerramentas(lista, consulta, encontrados) {
    const [marcarTodos, desmarcar] = $(`.acc-sec[data-sec="${lista}"]`).querySelectorAll('.linkbtns button');
    marcarTodos.textContent = consulta ? 'Marcar visíveis' : 'Marcar todos';
    desmarcar.textContent = consulta ? 'Desmarcar visíveis' : 'Desmarcar';
    $(`#${lista}Hint`).textContent = consulta ? `${formatarNumero(encontrados)} encontrado${encontrados === 1 ? '' : 's'}` : ' ';
  }

  renderizar() {
    for (const lista in LISTAS) this.#renderizarResumo(lista);
    this.#renderizarOpcoes(this.aberta);
  }

  #renderizarResumo(lista) {
    const sel = this.estado.selecao[lista], total = this.estado.universo[lista].size;
    const todos = this.estado.listaCompleta(lista);
    $(`#${lista}Count`).textContent = todos ? 'todos' : `${formatarNumero(sel.size)}/${formatarNumero(total)}`;
    $(`#${lista}FlyCnt`).textContent = `${formatarNumero(sel.size)} de ${formatarNumero(total)} marcados`;
    $(`.acc-sec[data-sec="${lista}"]`).classList.toggle('partial', !todos);
    const resumo = $(`#${lista}Sum`);
    resumo.textContent = todos ? '' : !sel.size ? 'nenhum marcado'
      : sel.size <= 2 ? [...sel].map(v => rotuloDoValor(lista, v)).join(', ') : `${formatarNumero(sel.size)} ${LISTAS[lista].plural}`;
    resumo.title = sel.size && !todos && sel.size <= 50 ? [...sel].join('\n') : '';
  }

  // Busca por palavras em qualquer ordem (ignora acento e caixa) e oculta opções sem eventos, se pedido.
  #renderizarOpcoes(lista) {
    if (!lista || !this.#montadas.has(lista)) return;
    const sel = this.estado.selecao[lista], contagem = this.estado.facetas[lista];
    const consulta = normalizarChave(this.#busca(lista).value);
    const palavras = consulta.split(' ').filter(Boolean);
    const soDisponiveis = this.soDisponiveis;
    let encontrados = 0;
    for (const l of $$(`#${lista}List label`)) {
      const n = contagem.get(l.dataset.val) || 0;
      const visivel = palavras.every(p => l.dataset.search.includes(p)) && (!soDisponiveis || n > 0);
      l.classList.toggle('hidden', !visivel);
      if (!visivel) continue;
      encontrados++;
      l.firstChild.checked = sel.has(l.dataset.val);
      l.lastChild.textContent = formatarNumero(n);
      l.classList.toggle('zerada', !n);
    }
    // esconde o título do grupo quando nenhum item dele aparece
    $$(`#${lista}List .grp`).forEach(grupo => {
      let el = grupo.nextElementSibling, algumVisivel = false;
      while (el && el.tagName === 'LABEL') { if (!el.classList.contains('hidden')) algumVisivel = true; el = el.nextElementSibling; }
      grupo.classList.toggle('hidden', !algumVisivel);
    });
    this.#atualizarFerramentas(lista, consulta, encontrados);
  }
}
