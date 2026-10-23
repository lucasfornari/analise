// Mapa em tela cheia, com os filtros do menu lateral numa gaveta por cima do mapa.
// A tela cheia é a página inteira (document.documentElement) e o CSS (body.mapa-tela-cheia) esconde o resto:
// assim o menu, as listas, o tooltip e as janelas continuam onde estão e funcionando, sem mover nada no DOM.
// Sem a Fullscreen API (ou se o navegador recusar), o mesmo modo ocupa só a janela.
import { $ } from '../util/dom.js';

export class TelaCheiaMapa {
  ativa = false;

  constructor(painel) {
    this.painel = painel;
    this.botao = $('#btnTelaCheia');
    this.botaoFiltros = $('#btnFiltrosMapa');
    this.botao.onclick = () => this.alternar();
    this.botaoFiltros.onclick = () => this.alternarFiltros();
    // Esc do navegador sai da tela cheia sem passar por aqui
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && this.ativa) this.#aplicar(false); });
  }

  alternar() {
    this.ativa ? this.sair() : this.entrar();
  }

  async entrar() {
    this.#aplicar(true);
    try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* fica em tela cheia só na janela */ }
  }

  sair() {
    if (document.fullscreenElement) document.exitFullscreen();
    this.#aplicar(false);
  }

  alternarFiltros(abrir = !document.body.classList.contains('filtros-flutuantes')) {
    if (!abrir) this.painel.listas.fechar();
    document.body.classList.toggle('filtros-flutuantes', abrir);
    this.botaoFiltros.setAttribute('aria-expanded', abrir);
    requestAnimationFrame(() => this.painel.mapa.redimensionar());   // a gaveta empurra o mapa para o lado
  }

  #aplicar(ativa) {
    this.ativa = ativa;
    document.body.classList.toggle('mapa-tela-cheia', ativa);
    if (!ativa) this.alternarFiltros(false);
    this.botao.setAttribute('aria-pressed', ativa);
    this.botao.title = ativa ? 'Sair da tela cheia (Esc)' : 'Mapa em tela cheia';
    this.botao.setAttribute('aria-label', this.botao.title);
    // o Leaflet precisa remedir o contêiner depois da troca de tamanho
    requestAnimationFrame(() => this.painel.mapa.redimensionar());
    setTimeout(() => this.painel.mapa.redimensionar(), 200);
    if (!ativa) $('#map').scrollIntoView({ block: 'center' });
  }
}
