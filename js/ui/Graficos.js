// Gráficos de barras (Chart.js, global Chart do CDN): composição por grupo, evolução mensal e exceções mais frequentes.
import { $, $$ } from '../util/dom.js';
import { formatarNumero, rotuloMes, ultimoDiaDoMes, capitalizar } from '../util/formatacao.js';
import { CLASSES, ROTULO_CLASSE, ROTULO_GRUPO, CLASSE_DO_GRUPO } from '../nucleo/catalogoExcecoes.js';
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

const opcoesHorizontais = (tamanhoFonte = 13) => opcoesBase({
  indexAxis: 'y', layout: { padding: { right: 48 } },
  scales: { x: { grid: { color: CORES.line } }, y: { grid: { display: false }, ticks: { color: CORES.ink, font: { size: tamanhoFonte } } } }
});

const TOP_EXCECOES = 12;
const encurtar = (texto, max = 42) => texto.length > max ? texto.slice(0, max - 1) + '…' : texto;

export class Graficos {
  graficos = {};
  modoEvolucao = 'classe';   // 'classe' (empilhado por classe) ou 'total'

  constructor(painel) {
    this.estado = painel.estado;
    Chart.defaults.font.family = FONTE;
    Chart.defaults.color = CORES.muted;
    Chart.defaults.locale = 'pt-BR';

    $('#legendaGrupos').innerHTML = CLASSES.map(c =>
      `<span><i style="background:${COR_CLASSE[c]}"></i>${ROTULO_CLASSE[c]}</span>`).join('');

    const botoes = $$('#evoMode button');
    botoes.forEach(b => b.onclick = () => {
      this.modoEvolucao = b.dataset.v;
      botoes.forEach(x => x.classList.toggle('on', x === b));
      this.#evolucaoMensal();
    });
  }

  renderizar() {
    this.#composicaoPorGrupo();
    this.#evolucaoMensal();
    this.#excecoesMaisFrequentes();
  }

  redimensionar() {
    Object.values(this.graficos).forEach(g => g.resize());
  }

  #desenhar(id, configuracao) {
    this.graficos[id]?.destroy();
    this.graficos[id] = new Chart(document.getElementById(id), configuracao);
  }

  #composicaoPorGrupo() {
    const contagem = this.estado.agregado.grupos;
    const grupos = [...contagem.keys()].sort((a, b) => contagem.get(b) - contagem.get(a));
    this.#desenhar('chGrupo', {
      type: 'bar',
      data: {
        labels: grupos.map(g => ROTULO_GRUPO[g]),
        datasets: [{ data: grupos.map(g => contagem.get(g)), backgroundColor: grupos.map(g => COR_CLASSE[CLASSE_DO_GRUPO[g]] || CORES.muted), borderColor: CORES.navy, borderWidth: 1, borderRadius: 4, barPercentage: 0.8 }]
      },
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

  #excecoesMaisFrequentes() {
    const excecoes = this.estado.agregado.excecoes.slice(0, TOP_EXCECOES);
    this.#desenhar('chExc', {
      type: 'bar',
      data: {
        labels: excecoes.length ? excecoes.map(e => encurtar(capitalizar(e.excecao))) : ['Sem eventos no filtro'],
        datasets: [{ data: excecoes.map(e => e.total), backgroundColor: excecoes.map(e => COR_CLASSE[e.classe]), borderColor: CORES.navy, borderWidth: 1, borderRadius: 4, barPercentage: 0.8 }]
      },
      options: Object.assign(opcoesHorizontais(11.5), {
        plugins: { legend: { display: false }, tooltip: { callbacks: { title: itens => capitalizar(excecoes[itens[0].dataIndex]?.excecao || ''), label: c => ' ' + formatarNumero(c.parsed.x) } } }
      }),
      plugins: [rotulosDeValor('x')]
    });
  }
}
