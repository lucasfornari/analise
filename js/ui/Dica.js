// Tooltip global. Um elemento com o atributo data-dica mostra o HTML que o contêiner mais próximo com
// a função _dica(elemento) devolver (ex.: Tabela). Um só balão para a página toda, criado sob demanda.
import { $ } from '../util/dom.js';

const ATRASO_MS = 120;   // evita piscar ao passar o mouse por várias linhas
const MARGEM = 8;

export class Dica {
  alvo = null;

  constructor() {
    this.caixa = $('#dica');
    document.addEventListener('mouseover', e => this.#entrar(e.target));
    document.addEventListener('mouseout', e => { if (this.alvo && !this.alvo.contains(e.relatedTarget)) this.esconder(); });
    document.addEventListener('focusin', e => this.#entrar(e.target));
    document.addEventListener('focusout', () => this.esconder());
    // rolar tira o balão do lugar: some durante a rolagem e volta no fim se o mouse ainda estiver no alvo
    // (sem isso, parar o mouse sobre um nome enquanto a página ainda rola nunca mostrava o balão)
    addEventListener('scroll', () => this.#aoRolar(), true);
    // clicar pode re-renderizar a tabela
    document.addEventListener('pointerdown', () => this.esconder(), true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.esconder(); });
  }

  #entrar(elemento) {
    const alvo = elemento?.closest?.('[data-dica]');
    if (!alvo || alvo === this.alvo) return;
    this.esconder();
    this.alvo = alvo;
    this.espera = setTimeout(() => this.#mostrar(alvo), ATRASO_MS);
  }

  #mostrar(alvo) {
    let fonte = alvo;
    while (fonte && !fonte._dica) fonte = fonte.parentElement;
    const html = fonte?._dica(alvo);
    if (!html || !alvo.isConnected) return;
    // dentro da janela de detalhes (<dialog>, camada superior) o balão precisa estar no próprio dialog
    const camada = alvo.closest('dialog[open]') || document.body;
    if (this.caixa.parentElement !== camada) camada.append(this.caixa);
    this.caixa.innerHTML = html;
    this.caixa.hidden = false;
    // abaixo do elemento; sem espaço, acima. Sempre dentro da janela.
    const r = alvo.getBoundingClientRect(), { width, height } = this.caixa.getBoundingClientRect();
    const x = Math.min(Math.max(MARGEM, r.left), innerWidth - width - MARGEM);
    const abaixo = r.bottom + MARGEM;
    const y = abaixo + height <= innerHeight - MARGEM ? abaixo : Math.max(MARGEM, r.top - height - MARGEM);
    Object.assign(this.caixa.style, { left: x + 'px', top: y + 'px' });
  }

  // Balão junto ao cursor, para alvos que não são elementos (pontos do mapa, desenhados em canvas).
  mostrarNoCursor(html, x, y, camada = document.body) {
    clearTimeout(this.espera);
    this.alvo = null;
    if (this.caixa.parentElement !== camada) camada.append(this.caixa);
    this.caixa.innerHTML = html;
    this.caixa.hidden = false;
    const { width, height } = this.caixa.getBoundingClientRect();
    const esquerda = x + 16 + width <= innerWidth - MARGEM ? x + 16 : x - 16 - width;
    const topo = Math.min(Math.max(MARGEM, y + 16), innerHeight - height - MARGEM);
    Object.assign(this.caixa.style, { left: Math.max(MARGEM, esquerda) + 'px', top: topo + 'px' });
  }

  #aoRolar() {
    const alvo = this.alvo;
    if (!alvo) return;
    clearTimeout(this.espera);
    this.caixa.hidden = true;
    this.espera = setTimeout(() => {
      if (this.alvo === alvo && alvo.isConnected && alvo.matches(':hover')) this.#mostrar(alvo);
    }, ATRASO_MS);
  }

  esconder() {
    clearTimeout(this.espera);
    this.alvo = null;
    this.caixa.hidden = true;
  }
}
