// Tabelas do painel: ranking de clientes, locais, placas, motoristas e perfis.
import { $ } from '../util/dom.js';
import { formatarNumero, formatarPercentual, escaparHtml, abreviarCliente, rotuloMes } from '../util/formatacao.js';
import { classeDoTipo } from '../nucleo/classificacao.js';
import { LINHAS_POR_PAGINA } from '../estado/Estado.js';
import { CORES } from '../config/tema.js';
import { Tabela } from './Tabela.js';

const INCREMENTO_PAGINA = 35;

// Colunas reaproveitadas entre tabelas
const negrito = campo => linha => `<b>${formatarNumero(linha[campo])}</b>`;
const numero = campo => linha => formatarNumero(linha[campo]);
const barra = maximo => linha => `<div class="bar" style="width:${(linha.total / maximo) * 100}%"></div>`;
const cliente = (tamanho, extra = () => '') => linha =>
  `<span title="${escaparHtml(linha.cliente)}">${escaparHtml(abreviarCliente(linha.cliente).slice(0, tamanho))}${extra(linha)}</span>`;
const colunasPorClasse = [
  { k: 'EQ', h: 'Equip.', num: true, f: numero('EQ') },
  { k: 'FV', h: 'FV', num: true, f: numero('FV') },
  { k: 'CS', h: 'CS', num: true, f: numero('CS') }
];

// Etiquetas dos tipos mais frequentes, coloridas pela classe.
function etiquetas(tipos, limite = 3) {
  const cor = { CS: 'cs', FV: 'fv', EQ: '' };
  return [...tipos.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite)
    .map(([tipo, n]) => `<span class="tag ${cor[classeDoTipo(tipo)]}">${escaparHtml(tipo)} ${n}</span>`).join('');
}

// Mini gráfico de linha da evolução mensal.
function sparkline(valores) {
  if (!valores.length) return '';
  const largura = 70, altura = 20, maximo = Math.max(...valores, 1);
  const pontos = valores.map((v, i) => [(i / Math.max(valores.length - 1, 1)) * (largura - 4) + 2, altura - 2 - (v / maximo) * (altura - 4)]);
  const [ux, uy] = pontos[pontos.length - 1];
  return `<svg width="${largura}" height="${altura}" aria-hidden="true">` +
    `<polyline points="${pontos.map(p => p.join(',')).join(' ')}" fill="none" stroke="${CORES.indigo}" stroke-width="2"/>` +
    `<circle cx="${ux}" cy="${uy}" r="2.5" fill="${CORES.navy}"/></svg>`;
}

export class Tabelas {
  constructor(painel) {
    this.painel = painel;
    this.estado = painel.estado;
    const nova = (id, chave) => new Tabela($(id), chave, this.estado, () => painel.atualizar());
    this.tabelas = {
      cli: nova('#tblCli', 'cli'), loc: nova('#tblLoc', 'loc'), placa: nova('#tblPlaca', 'placa'),
      mot: nova('#tblMot', 'mot'), per: nova('#tblPer', 'per')
    };
  }

  renderizar() {
    this.#clientes();
    this.#locais();
    this.#placas();
    this.#motoristas();
    this.#perfis();
  }

  // Clicar num cliente isola o painel nele; clicar de novo desfaz.
  #clientes() {
    const { clientes, meses } = this.estado.agregado;
    const isolado = this.estado.unicoSelecionado('cli');
    this.tabelas.cli.renderizar([
      { k: 'rank', h: '#', num: true },
      { k: 'cliente', h: 'Cliente', cls: 'nowrap', f: cliente(Infinity) },
      { k: 'total', h: 'Total', num: true, f: negrito('total') },
      { k: 'bar', h: '', v: r => r.total, cls: 'barcell', f: barra(clientes[0]?.total || 1) },
      { k: 'pct', h: '%', num: true, f: r => formatarPercentual(r.pct) },
      { k: 'acum', h: '% acum.', num: true, f: r => formatarPercentual(r.acum) },
      ...colunasPorClasse,
      { k: 'trend', h: 'Mês a mês', v: r => r.total, f: r =>
        `<span title="${meses.map(m => `${rotuloMes(m)}: ${r.m[m] || 0}`).join(' | ')}">${sparkline(meses.map(m => r.m[m] || 0))}</span>` }
    ], clientes, {
      aoClicar: r => { this.estado.alternarUnico('cli', r.cliente); this.painel.atualizar(true); },
      selecionada: r => r.cliente === isolado
    });
  }

  // Clicar num local centraliza o mapa nele.
  #locais() {
    const locais = this.estado.agregado.locais;
    this.tabelas.loc.renderizar([
      { k: 'local', h: 'Local' },
      { k: 'total', h: 'Eventos', num: true, f: negrito('total') },
      { k: 'nPl', h: 'Placas', num: true },
      { k: 'nCli', h: 'Clientes', num: true },
      { k: 'tipos', h: 'Tipos', v: r => r.total, f: r => etiquetas(r.tipos) }
    ], locais, { limite: this.estado.limites.loc, aoClicar: r => this.painel.mapa.focar(r) });
    this.#botaoMais('loc', locais.length);
  }

  // Clicar numa placa filtra o painel por ela.
  #placas() {
    const placas = this.estado.agregado.placas;
    this.tabelas.placa.renderizar([
      { k: 'placa', h: 'Placa', f: r => `<b>${escaparHtml(r.placa)}</b>` },
      { k: 'cliente', h: 'Cliente', f: cliente(22) },
      { k: 'total', h: 'Eventos', num: true, f: negrito('total') },
      { k: 'nViagens', h: 'Viagens', num: true },
      { k: 'porViagem', h: 'Por viagem', num: true, f: r => r.porViagem.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) },
      { k: 'tecnologia', h: 'Tecnologia' },
      { k: 'tipos', h: 'Tipos', v: r => r.total, f: r => etiquetas(r.tipos) }
    ], placas, { limite: this.estado.limites.placa, aoClicar: r => this.painel.filtros.definirPlaca(r.placa) });
    this.#botaoMais('placa', placas.length);
  }

  #motoristas() {
    const motoristas = this.estado.agregado.motoristas;
    this.tabelas.mot.renderizar([
      { k: 'motorista', h: 'Motorista' },
      { k: 'cliente', h: 'Cliente', f: cliente(20) },
      { k: 'total', h: 'FV', num: true, f: negrito('total') },
      { k: 'topLocal', h: 'Local mais frequente', f: r => `<span class="menor">${escaparHtml(r.topLocal)} (${r.topLocalN})</span>` }
    ], motoristas, { limite: this.estado.limites.mot });
    this.#botaoMais('mot', motoristas.length);
  }

  #perfis() {
    const perfis = this.estado.agregado.perfis;
    const isolado = this.estado.unicoSelecionado('per');
    this.tabelas.per.renderizar([
      { k: 'perfil', h: 'Perfil de segurança', cls: 'nowrap', f: r => `<span title="${escaparHtml(r.perfil)}" class="texto-perfil">${escaparHtml(r.perfil)}</span>` },
      { k: 'cliente', h: 'Cliente', f: cliente(20, r => r.nCli > 1 ? ` +${r.nCli - 1}` : '') },
      { k: 'total', h: 'Total', num: true, f: negrito('total') },
      { k: 'bar', h: '', v: r => r.total, cls: 'barcell', f: barra(perfis[0]?.total || 1) },
      ...colunasPorClasse
    ], perfis, {
      limite: this.estado.limites.per,
      aoClicar: r => { this.estado.alternarUnico('per', r.perfil); this.painel.atualizar(true); },
      selecionada: r => r.perfil === isolado
    });
    this.#botaoMais('per', perfis.length);
  }

  // "Mostrar mais" abre de 35 em 35; no fim da lista vira "Mostrar menos".
  #botaoMais(chave, total) {
    const botao = $(`[data-more="${chave}"]`);
    const limites = this.estado.limites;
    botao.classList.toggle('hidden', total <= LINHAS_POR_PAGINA);
    botao.textContent = limites[chave] >= total ? 'Mostrar menos' : `Mostrar mais (${formatarNumero(total)} no total)`;
    botao.onclick = () => {
      limites[chave] = limites[chave] >= total ? LINHAS_POR_PAGINA : limites[chave] + INCREMENTO_PAGINA;
      this.painel.atualizar();
    };
  }
}
