// Tabela ordenável genérica. A ordenação fica no Estado para sobreviver às re-renderizações.
import { escaparHtml } from '../util/formatacao.js';

// coluna: { k: campo, h: título, num: alinhada à direita, cls: classe CSS,
//           f: (linha) => html da célula, v: (linha) => valor usado para ordenar }
export class Tabela {
  // chave: identifica a tabela no estado.ordenacao; aoOrdenar: re-renderiza o painel
  constructor(elemento, chave, estado, aoOrdenar) {
    Object.assign(this, { elemento, chave, estado, aoOrdenar });
  }

  // opcoes: { limite, aoClicar(linha), selecionada(linha) }
  renderizar(colunas, linhas, opcoes = {}) {
    // limite aplicado DEPOIS de ordenar, para ordenar a lista inteira
    const visiveis = this.#ordenar(linhas, colunas).slice(0, opcoes.limite || linhas.length);
    const ordem = this.estado.ordenacao[this.chave] || {};
    const cabecalho = colunas.map(c =>
      `<th data-k="${c.k}" class="${c.num ? 'num ' : ''}${ordem.k === c.k ? ordem.dir : ''}">${c.h}</th>`).join('');
    const corpo = visiveis.length
      ? visiveis.map((linha, i) => this.#linhaHtml(linha, i, colunas, opcoes)).join('')
      : `<tr><td colspan="${colunas.length}" class="vazio">Nenhum evento com esses filtros</td></tr>`;
    this.elemento.innerHTML = `<thead><tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody>`;

    this.elemento.querySelectorAll('th').forEach(th => th.onclick = () => this.#alternarOrdem(th.dataset.k));
    if (opcoes.aoClicar) {
      this.elemento.querySelectorAll('tbody tr[data-i]').forEach(tr => tr.onclick = () => opcoes.aoClicar(visiveis[+tr.dataset.i]));
    }
  }

  #linhaHtml(linha, i, colunas, opcoes) {
    const classes = `${opcoes.aoClicar ? 'click ' : ''}${opcoes.selecionada?.(linha) ? 'sel' : ''}`;
    const celulas = colunas.map(c => `<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${c.f ? c.f(linha) : escaparHtml(linha[c.k])}</td>`).join('');
    return `<tr class="${classes}" data-i="${i}">${celulas}</tr>`;
  }

  // 1º clique: decrescente; clicar de novo na mesma coluna inverte.
  #alternarOrdem(coluna) {
    const atual = this.estado.ordenacao[this.chave];
    this.estado.ordenacao[this.chave] = { k: coluna, dir: atual?.k === coluna && atual.dir === 'desc' ? 'asc' : 'desc' };
    this.aoOrdenar();
  }

  #ordenar(linhas, colunas) {
    const ordem = this.estado.ordenacao[this.chave];
    const coluna = ordem && colunas.find(c => c.k === ordem.k);
    if (!coluna) return linhas;
    const valor = coluna.v || (linha => linha[ordem.k]);
    return [...linhas].sort((a, b) => {
      const x = valor(a), y = valor(b);
      const r = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
      return ordem.dir === 'asc' ? r : -r;
    });
  }
}
