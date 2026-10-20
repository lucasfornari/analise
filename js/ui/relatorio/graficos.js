// Gráficos do relatório: desenhados com o Chart.js (global do CDN) em alta resolução e convertidos em
// imagem, para a impressão sair nítida e a memória ser liberada logo em seguida.
import { CORES } from '../../config/tema.js';
import { rotulosDeValor } from '../Graficos.js';
import { formatarNumero } from '../../util/formatacao.js';

const PX_POR_MM = 96 / 25.4;
const RESOLUCAO = 3;   // 3x a resolução da tela: nítido em PDF/impressão sem pesar demais

// config: configuração do Chart.js (tipo, dados, opções); largura/altura em mm. Retorna <img>.
export function graficoComoImagem(config, { largura, altura, rotulos = 'y' }) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(largura * PX_POR_MM);
  canvas.height = Math.round(altura * PX_POR_MM);
  Object.assign(canvas.style, { width: canvas.width + 'px', height: canvas.height + 'px', position: 'fixed', left: '-20000px' });
  document.body.append(canvas);
  const grafico = new Chart(canvas, {
    ...config,
    options: {
      responsive: false, animation: false, devicePixelRatio: RESOLUCAO,
      ...config.options,
      plugins: { legend: { display: false }, tooltip: { enabled: false }, ...config.options?.plugins }
    },
    plugins: [...(config.plugins || []), ...(rotulos ? [rotulosDeValor(rotulos)] : [])]
  });
  const imagem = new Image();
  imagem.src = canvas.toDataURL('image/png');
  imagem.className = 'grafico-rel';
  imagem.style.height = altura + 'mm';
  imagem.alt = '';
  grafico.destroy();
  canvas.remove();
  return imagem;
}

export const eixoY = () => ({ grid: { color: CORES.line }, ticks: { color: CORES.muted, precision: 0, callback: v => formatarNumero(v) }, beginAtZero: true });
export const eixoX = () => ({ grid: { display: false }, ticks: { color: CORES.ink, font: { size: 12 } } });
