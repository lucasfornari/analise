// Menu lateral de filtros recolhível; a preferência fica salva no navegador.
import { $ } from '../util/dom.js';

const CHAVE_PREFERENCIA = 'painelFiltros';
const DURACAO_TRANSICAO = 230;   // ms, igual à transição do grid em css/layout.css

export class PainelLateral {
  constructor(painel) {
    this.painel = painel;
    this.app = $('.app');
    this.botao = $('#btnHamb');
    this.botao.onclick = () => this.alternar();
    if (this.#lerPreferencia() === '0') this.#aplicar(false);
  }

  get aberto() { return !this.app.classList.contains('collapsed'); }

  alternar() {
    this.painel.listas.fechar();
    this.#aplicar(!this.aberto);
    this.#salvarPreferencia(this.aberto ? '1' : '0');
    // mapa e gráficos precisam remedir depois que a largura muda
    setTimeout(() => this.painel.redimensionar(), DURACAO_TRANSICAO);
  }

  #aplicar(aberto) {
    this.app.classList.toggle('collapsed', !aberto);
    this.botao.setAttribute('aria-expanded', aberto);
  }

  // localStorage pode estar bloqueado (aba anônima, política do navegador): a preferência é opcional.
  #lerPreferencia() {
    try { return localStorage.getItem(CHAVE_PREFERENCIA); } catch { return null; }
  }

  #salvarPreferencia(valor) {
    try { localStorage.setItem(CHAVE_PREFERENCIA, valor); } catch { /* sem persistência */ }
  }
}
