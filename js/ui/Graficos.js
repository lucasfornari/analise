// Gráficos de barras (Chart.js, global Chart do CDN): composição por tipo, evolução mensal e CS por composição.
import { $$ } from '../util/dom.js';
import { formatarNumero, rotuloMes, ultimoDiaDoMes } from '../util/formatacao.js';
import { CLASSES, ROTULO_CLASSE, TIPOS, classeDoTipo } from '../nucleo/classificacao.js';
import { CORES, COR_CLASSE, FONTE } from '../config/tema.js';

// Escreve o valor ao lado (barra horizontal) ou acima (vertical) de cada barra.
const rotulosDeValor = eixo => ({
  id: 'rotulosDeValor',
  afterDatasetsDraw(grafico) {
    const { ctx } = grafico;
    ctx.save();
    ctx.font = '600 11px Barlow, Arial';
    ctx.fillStyle = CORES.ink;
    grafico.data.datasets.forEach((serie, i) => {
      const meta = grafico.getDatasetMeta(i);
      if (meta.hidden) return;
      meta.data.forEach((barra, j) => {
        const valor = serie.data[j];
        if (!valor) return;
        if (eixo === 'x') { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(formatarNumero(valor), barra.x + 5, barra.y); }
        else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(formatarNumero(valor), barra.x, barra.y - 3); }
      });
    });
    ctx.restore();
  }
});

const opcoesBase = (extra = {}) => Object.assign({
  responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + formatarNumero(c.parsed.x ?? c.parsed.y) } } }
}, extra);

const opcoesHorizontais = () => opcoesBase({
  indexAxis: 'y', layout: { padding: { right: 40 } },
  scales: { x: { grid: { color: CORES.line } }, y: { grid: { display: false }, ticks: { color: CORES.ink, font: { size: 13 } } } }
});

export class Graficos {
  graficos = {};
  modoEvolucao = 'classe';   // 'classe' (empilhado por classe) ou 'total'

  constructor(painel) {
    this.estado = painel.estado;
    Chart.defaults.font.family = FONTE;
    Chart.defaults.color = CORES.muted;
    Chart.defaults.locale = 'pt-BR';

    const botoes = $$('#evoMode button');
    botoes.forEach(b => b.onclick = () => {
      this.modoEvolucao = b.dataset.v;
      botoes.forEach(x => x.classList.toggle('on', x === b));
      this.#evolucaoMensal();
    });
  }

  renderizar() {
    this.#composicaoPorTipo();
    this.#evolucaoMensal();
    this.#contextosSuspeitos();
  }

  redimensionar() {
    Object.values(this.graficos).forEach(g => g.resize());
  }

  #desenhar(id, configuracao) {
    this.graficos[id]?.destroy();
    this.graficos[id] = new Chart(document.getElementById(id), configuracao);
  }

  #composicaoPorTipo() {
    const contagem = this.estado.agregado.tipos;
    const tipos = TIPOS.filter(t => contagem.get(t)).sort((a, b) => contagem.get(b) - contagem.get(a));
    this.#desenhar('chTipo', {
      type: 'bar',
      data: { labels: tipos, datasets: [{ data: tipos.map(t => contagem.get(t)), backgroundColor: tipos.map(t => COR_CLASSE[classeDoTipo(t)]), borderRadius: 4, barPercentage: 0.8 }] },
      options: opcoesHorizontais(),
      plugins: [rotulosDeValor('x')]
    });
  }

  // O último mês ganha "*" quando os dados não cobrem o mês inteiro.
  #evolucaoMensal() {
    const linhas = this.estado.agregado.mesClasse;
    const fim = this.estado.meta.fim;
    const ultimoMes = fim ? fim.slice(0, 7) : '';
    const parcial = fim && +fim.slice(8) < ultimoDiaDoMes(+fim.slice(0, 4), +fim.slice(5, 7));
    const porClasse = this.modoEvolucao === 'classe';
    const series = porClasse
      ? CLASSES.map(c => ({ label: ROTULO_CLASSE[c], data: linhas.map(l => l[c]), backgroundColor: COR_CLASSE[c], borderRadius: 3 }))
      : [{ label: 'Total', data: linhas.map(l => l.total), backgroundColor: CORES.navy, borderRadius: 3 }];
    this.#desenhar('chMes', {
      type: 'bar',
      data: { labels: linhas.map(l => rotuloMes(l.mes) + (parcial && l.mes === ultimoMes ? '*' : '')), datasets: series },
      options: opcoesBase({
        plugins: {
          legend: { display: porClasse, position: 'bottom', labels: { boxWidth: 12 } },
          tooltip: { mode: 'index', intersect: false, callbacks: { footer: itens => 'Total: ' + formatarNumero(itens.reduce((s, i) => s + i.parsed.y, 0)) } }
        },
        scales: { x: { grid: { display: false }, ticks: { color: CORES.ink } }, y: { grid: { color: CORES.line } } }
      }),
      plugins: [rotulosDeValor('y')]
    });
  }

  #contextosSuspeitos() {
    const contagem = this.estado.agregado.csTipos;
    const tipos = [...contagem.keys()].sort((a, b) => contagem.get(b) - contagem.get(a));
    this.#desenhar('chCS', {
      type: 'bar',
      data: {
        labels: tipos.length ? tipos : ['Sem CS no filtro'],
        datasets: [{ data: tipos.map(t => contagem.get(t)), backgroundColor: CORES.neon, borderColor: CORES.navy, borderWidth: 1, borderRadius: 4, barPercentage: 0.7 }]
      },
      options: opcoesHorizontais(),
      plugins: [rotulosDeValor('x')]
    });
  }
}
