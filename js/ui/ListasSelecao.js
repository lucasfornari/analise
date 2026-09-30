// Listas de multisseleção (exceções, clientes, perfis) em acordeão: um painel aberto por vez.
// Cada opção mostra quantos eventos teria com os DEMAIS filtros aplicados (contagem facetada).
import { $, $$ } from '../util/dom.js';
import { formatarNumero, abreviarCliente, capitalizar } from '../util/formatacao.js';
import { normalizarChave } from '../nucleo/texto.js';
import { contarPor } from '../nucleo/agregacao.js';
import { filtrar } from '../nucleo/filtro.js';
import { ROTULO_CLASSE } from '../nucleo/classificacao.js';
import { LISTAS } from '../estado/Estado.js';

const rotuloDoValor = (lista, valor) => lista === 'exc' ? capitalizar(valor) : abreviarCliente(valor);

export class ListasSelecao {
  aberta = null;

  constructor(painel) {
    this.painel = painel;
    this.estado = painel.estado;

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

  abrir(lista) {
    this.aberta = lista;
    $$('.acc-sec').forEach(secao => {
      const ativa = secao.dataset.sec === lista;
      secao.classList.toggle('open', ativa);
      secao.querySelector('.acc-head').setAttribute('aria-expanded', ativa);
    });
    if (lista) setTimeout(() => this.#busca(lista).focus({ preventScroll: true }), 30);
  }

  fechar() { this.abrir(null); }

  // Recria as opções a partir dos dados carregados, da mais para a menos frequente.
  montar() {
    this.fechar();
    for (const lista in LISTAS) {
      const { campo } = LISTAS[lista];
      const contagem = contarPor(this.estado.registros, r => r[campo]);
      const ordem = [...contagem.keys()].sort((a, b) => contagem.get(b) - contagem.get(a) || a.localeCompare(b));
      const caixa = $(`#${lista}List`);
      caixa.replaceChildren();
      if (lista === 'exc') this.#montarExcecoes(caixa, ordem);
      else if (lista === 'per') this.#montarPerfis(caixa, ordem);
      else ordem.forEach(valor => caixa.appendChild(this.#opcao(lista, valor, valor)));

      const busca = this.#busca(lista);
      busca.value = '';
      busca.oninput();
    }
  }

  // Exceções agrupadas por classe, com atalho para selecionar só o grupo.
  #montarExcecoes(caixa, ordem) {
    const classeDe = new Map(this.estado.registros.map(r => [r.excecao, r.classe]));
    for (const [classe, rotulo] of Object.entries(ROTULO_CLASSE)) {
      const itens = ordem.filter(e => classeDe.get(e) === classe);
      if (!itens.length) continue;
      const grupo = document.createElement('div');
      grupo.className = 'grp';
      grupo.innerHTML = `<span>${rotulo}</span>`;
      const soEstes = Object.assign(document.createElement('button'), { className: 'btn small grp-btn', textContent: 'só estes' });
      soEstes.onclick = () => { this.estado.selecao.exc = new Set(itens); this.painel.atualizar(true); };
      grupo.appendChild(soEstes);
      caixa.appendChild(grupo);
      itens.forEach(e => caixa.appendChild(this.#opcao('exc', e, capitalizar(e))));
    }
  }

  // Perfil mostra os clientes principais abaixo do nome; a busca também encontra por cliente/seguradora.
  #montarPerfis(caixa, ordem) {
    const clientesPorPerfil = new Map();
    for (const r of this.estado.registros) {
      if (!clientesPorPerfil.has(r.perfil)) clientesPorPerfil.set(r.perfil, new Map());
      const m = clientesPorPerfil.get(r.perfil);
      m.set(r.cliente, (m.get(r.cliente) || 0) + 1);
    }
    for (const perfil of ordem) {
      const clientes = [...clientesPorPerfil.get(perfil).entries()].sort((a, b) => b[1] - a[1]).map(([c]) => abreviarCliente(c));
      const resumo = clientes.slice(0, 2).join(', ') + (clientes.length > 2 ? ` +${clientes.length - 2}` : '');
      caixa.appendChild(this.#opcao('per', perfil, perfil, resumo));
    }
  }

  #opcao(lista, valor, rotulo, detalhe) {
    const linha = document.createElement('label');
    linha.dataset.val = valor;
    linha.dataset.search = normalizarChave(rotulo + ' ' + (detalhe || ''));
    linha.title = valor + (detalhe ? '\n' + detalhe : '');

    const marcador = Object.assign(document.createElement('input'), { type: 'checkbox' });
    marcador.onchange = () => {
      const sel = this.estado.selecao[lista];
      marcador.checked ? sel.add(valor) : sel.delete(valor);
      this.painel.atualizar(true);
    };
    const textos = document.createElement('span');
    textos.append(Object.assign(document.createElement('span'), { className: 't', textContent: rotulo }));
    if (detalhe) textos.append(Object.assign(document.createElement('small'), { textContent: detalhe }));
    linha.append(marcador, textos, document.createElement('em'));
    return linha;
  }

  #busca(lista) { return $(`#${lista}Search`); }
  #buscando(lista) { return !!this.#busca(lista).value.trim(); }

  // Com busca ativa, marcar/desmarcar age só nos itens visíveis.
  #marcar(lista, marcado) {
    const s = this.estado.selecao;
    if (this.#buscando(lista)) {
      const visiveis = $$(`#${lista}List label:not(.hidden)`).map(l => l.dataset.val);
      visiveis.forEach(v => marcado ? s[lista].add(v) : s[lista].delete(v));
    } else {
      s[lista] = marcado ? new Set(this.estado.universo[lista]) : new Set();
    }
    this.painel.atualizar(true);
  }

  // Busca por palavras em qualquer ordem, ignorando acento e caixa.
  #configurarBusca(lista) {
    const campo = this.#busca(lista);
    campo.oninput = () => {
      const consulta = normalizarChave(campo.value);
      const palavras = consulta.split(' ').filter(Boolean);
      let encontrados = 0;
      $$(`#${lista}List label`).forEach(l => {
        const casa = palavras.every(p => l.dataset.search.includes(p));
        l.classList.toggle('hidden', !casa);
        if (casa) encontrados++;
      });
      // esconde o título do grupo quando nenhum item dele aparece
      $$(`#${lista}List .grp`).forEach(grupo => {
        let el = grupo.nextElementSibling, algumVisivel = false;
        while (el && el.tagName === 'LABEL') { if (!el.classList.contains('hidden')) algumVisivel = true; el = el.nextElementSibling; }
        grupo.classList.toggle('hidden', !algumVisivel);
      });
      const [marcarTodos, desmarcar] = $(`.acc-sec[data-sec="${lista}"]`).querySelectorAll('.linkbtns button');
      marcarTodos.textContent = consulta ? 'Marcar visíveis' : 'Marcar todos';
      desmarcar.textContent = consulta ? 'Desmarcar visíveis' : 'Desmarcar';
      $(`#${lista}Hint`).textContent = consulta ? `${encontrados} encontrado${encontrados === 1 ? '' : 's'}` : ' ';
    };
    campo.onkeydown = e => {
      if (e.key === 'Escape' && campo.value) { e.stopPropagation(); campo.value = ''; campo.oninput(); }
    };
  }

  renderizar() {
    const filtro = this.estado.filtroAtual();
    for (const lista in LISTAS) {
      this.#renderizarResumo(lista);
      this.#renderizarOpcoes(lista, filtro);
    }
  }

  #renderizarResumo(lista) {
    const sel = this.estado.selecao[lista], total = this.estado.universo[lista].size;
    const todos = sel.size === total;
    $(`#${lista}Count`).textContent = todos ? 'todos' : `${sel.size}/${total}`;
    $(`#${lista}FlyCnt`).textContent = `${sel.size} de ${total} marcados`;
    $(`.acc-sec[data-sec="${lista}"]`).classList.toggle('partial', !todos);
    const resumo = $(`#${lista}Sum`);
    resumo.textContent = todos ? '' : !sel.size ? 'nenhum marcado'
      : sel.size <= 2 ? [...sel].map(v => rotuloDoValor(lista, v)).join(', ') : `${sel.size} ${LISTAS[lista].plural}`;
    resumo.title = sel.size && !todos ? [...sel].join('\n') : '';
  }

  #renderizarOpcoes(lista, filtro) {
    const sel = this.estado.selecao[lista];
    const contagem = contarPor(filtrar(this.estado.registros, filtro, lista), r => r[LISTAS[lista].campo]);
    $$(`#${lista}List label`).forEach(l => {
      const n = contagem.get(l.dataset.val) || 0;
      l.querySelector('input').checked = sel.has(l.dataset.val);
      l.querySelector('em').textContent = formatarNumero(n);
      l.style.opacity = n ? 1 : 0.45;
    });
  }
}
