// Atalhos de teclado globais.
//   Ctrl+B              mostra ou oculta o menu de filtros
//   Ctrl+Alt+L          limpa todos os filtros (funciona até dentro de campos)
//   L                   limpa todos os filtros, quando não está digitando
// Usa e.code (tecla física) para não depender do layout do teclado, e escuta na fase de captura
// para funcionar mesmo com um painel de seleção aberto.

const TIPOS_NAO_TEXTO = ['checkbox', 'radio', 'button', 'range'];
const digitando = el => el && (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' ||
  (el.tagName === 'INPUT' && !TIPOS_NAO_TEXTO.includes(el.type)));

export class Atalhos {
  constructor(painel) {
    window.addEventListener('keydown', e => this.#tratar(e, painel), true);
  }

  #tratar(e, painel) {
    // com a janela de detalhes aberta, as teclas são dela (Esc fecha, L digita na busca)
    if (e.repeat || painel.detalhe.aberta) return;
    const modificador = e.ctrlKey || e.metaKey;
    if (modificador && !e.shiftKey && !e.altKey && e.code === 'KeyB') {
      e.preventDefault();
      painel.lateral.alternar();
      return;
    }
    const lSimples = !modificador && !e.altKey && !e.shiftKey && e.code === 'KeyL' && !digitando(e.target);
    const ctrlAltL = e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.code === 'KeyL';
    if (lSimples || ctrlAltL) {
      e.preventDefault();
      e.stopPropagation();
      painel.limparFiltros();
    }
  }
}
