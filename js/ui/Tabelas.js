// Tabelas do painel: ranking de clientes, clientes mês a mês, reincidentes, locais, placas, motoristas e perfis.
import { $, $$ } from '../util/dom.js';
import { formatarNumero, formatarPercentual, formatarVariacao, escaparHtml, abreviarCliente, rotuloMes } from '../util/formatacao.js';
import { CLASSES, ROTULO_GRUPO, CLASSE_DO_GRUPO } from '../nucleo/catalogoExcecoes.js';
import { mesAnterior } from '../nucleo/agregacao.js';
import { LINHAS_POR_PAGINA } from '../estado/Estado.js';
import { Tabela } from './Tabela.js';

const INCREMENTO_PAGINA = 35;
const SIGLA_CLASSE = { MOTORISTA: 'Mot.', VEICULO: 'Veíc.', CONTEXTO: 'CS' };

// Colunas reaproveitadas entre tabelas
const negrito = campo => linha => `<b>${formatarNumero(linha[campo])}</b>`;
const barra = maximo => linha => `<div class="bar" style="width:${(linha.total / maximo) * 100}%"></div>`;
const cliente = (tamanho, extra = () => '') => linha =>
  `<span title="${escaparHtml(linha.cliente)}">${escaparHtml(abreviarCliente(linha.cliente).slice(0, tamanho))}${extra(linha)}</span>`;
const colunasPorClasse = CLASSES.map(c => ({ k: c, h: SIGLA_CLASSE[c], num: true, f: linha => formatarNumero(linha[c]) }));

// Variação do último mês contra o anterior; subir é ruim (mais exceções).
function celulaVariacao(variacao) {
  if (!variacao) return '<span class="apagado">–</span>';
  const { pct, diferenca } = variacao;
  const classe = diferenca > 0 ? 'alta' : diferenca < 0 ? 'baixa' : '';
  const seta = diferenca > 0 ? '▲' : diferenca < 0 ? '▼' : '';
  const texto = pct == null ? 'novo' : formatarVariacao(pct);
  return `<span class="variacao ${classe}" title="${formatarNumero(variacao.anterior)} → ${formatarNumero(variacao.atual)} (${diferenca > 0 ? '+' : ''}${formatarNumero(diferenca)})">${seta} ${texto}</span>`;
}
const ordenarVariacao = linha => linha.variacao?.pct ?? (linha.variacao ? Infinity : -Infinity);

// Etiquetas dos grupos mais frequentes, coloridas pela classe.
function etiquetas(grupos, limite = 3) {
  return [...grupos.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite)
    .map(([grupo, n]) => `<span class="tag ${(CLASSE_DO_GRUPO[grupo] || '').toLowerCase()}">${ROTULO_GRUPO[grupo]} ${formatarNumero(n)}</span>`).join('');
}

// Célula de mês com fundo proporcional ao valor (mapa de calor da tabela).
const celulaCalor = (valor, maximo) => valor
  ? `<span class="calor" style="--intensidade:${(valor / maximo).toFixed(2)}">${formatarNumero(valor)}</span>`
  : '<span class="apagado">–</span>';

export class Tabelas {
  modoReincidencia = 'motoristas';   // 'motoristas' | 'placas'

  constructor(painel) {
    this.painel = painel;
    this.estado = painel.estado;
    const nova = (id, chave) => new Tabela($(id), chave, this.estado, () => painel.redesenhar());
    this.tabelas = {
      cli: nova('#tblCli', 'cli'), cliMes: nova('#tblCliMes', 'cliMes'), reinc: nova('#tblReinc', 'reinc'),
      loc: nova('#tblLoc', 'loc'), placa: nova('#tblPlaca', 'placa'), mot: nova('#tblMot', 'mot'), per: nova('#tblPer', 'per')
    };
    const botoes = $$('#reincModo button');
    botoes.forEach(b => b.onclick = () => {
      this.modoReincidencia = b.dataset.v;
      botoes.forEach(x => x.classList.toggle('on', x === b));
      this.estado.limites.reinc = LINHAS_POR_PAGINA;
      this.#reincidentes();
    });
  }

  renderizar() {
    this.#clientes();
    this.#clientesMensal();
    this.#reincidentes();
    this.#locais();
    this.#placas();
    this.#motoristas();
    this.#perfis();
  }

  // Clicar numa linha isola o painel no item (cliente, placa, motorista, perfil); clicar de novo desfaz.
  #isolar(lista, valor) {
    this.estado.alternarUnico(lista, valor);
    this.painel.atualizar(true);
  }

  #clientes() {
    const { clientes } = this.estado.agregado;
    const isolado = this.estado.unicoSelecionado('cli');
    this.tabelas.cli.renderizar([
      { k: 'rank', h: '#', num: true },
      { k: 'cliente', h: 'Cliente', cls: 'nowrap', f: cliente(Infinity) },
      { k: 'total', h: 'Total', num: true, f: negrito('total') },
      { k: 'pct', h: '%', num: true, f: r => formatarPercentual(r.pct) },
      { k: 'acum', h: '% acum.', num: true, f: r => formatarPercentual(r.acum) },
      ...colunasPorClasse,
      { k: 'variacao', h: 'Var. mês', num: true, v: ordenarVariacao, f: r => celulaVariacao(r.variacao) }
    ], clientes, { aoClicar: r => this.#isolar('cli', r.cliente), selecionada: r => r.cliente === isolado });
  }

  // Uma coluna por mês com eventos e participação do cliente no total daquele mês.
  #clientesMensal() {
    const { clientes, meses } = this.estado.agregado;
    const colunasMes = meses.map(m => ({
      k: 'mes-' + m, h: rotuloMes(m), num: true, v: r => r.m[m] || 0,
      f: r => `${formatarNumero(r.m[m] || 0)} <small class="apagado">${formatarPercentual(r.pctMes[m])}</small>`
    }));
    const ultimo = meses[meses.length - 1];
    const tituloVariacao = ultimo ? `${rotuloMes(ultimo)} × ${rotuloMes(mesAnterior(ultimo))}` : 'Variação';
    this.tabelas.cliMes.renderizar([
      { k: 'cliente', h: 'Cliente', cls: 'nowrap', f: cliente(Infinity) },
      ...colunasMes,
      { k: 'total', h: 'Total', num: true, f: negrito('total') },
      { k: 'variacao', h: tituloVariacao, num: true, v: ordenarVariacao, f: r => celulaVariacao(r.variacao) },
      { k: 'diferenca', h: 'Diferença', num: true, v: r => r.variacao?.diferenca ?? 0,
        f: r => r.variacao ? `${r.variacao.diferenca > 0 ? '+' : ''}${formatarNumero(r.variacao.diferenca)}` : '<span class="apagado">–</span>' }
    ], clientes, { limite: this.estado.limites.cliMes, aoClicar: r => this.#isolar('cli', r.cliente) });
    this.#botaoMais('cliMes', clientes.length);
  }

  // Motoristas ou placas com eventos em meses seguidos.
  #reincidentes() {
    const { meses, reincidencia } = this.estado.agregado;
    const porMotorista = this.modoReincidencia === 'motoristas';
    const { porMes, lista } = reincidencia[this.modoReincidencia];
    const nome = porMotorista ? 'motorista' : 'placa';
    const listaFiltro = porMotorista ? 'mot' : 'pla';
    $('#reincSub').textContent = `${porMotorista ? 'Motoristas com exceções de motorista' : 'Placas com exceções de veículo ou contexto suspeito'} em meses seguidos. Clique para filtrar`;
    $('#reincResumo').innerHTML = porMes.filter(m => m.reincidentes !== null).map(m =>
      `<div class="reinc-mes"><b>${formatarPercentual(m.pct ?? 0)}</b> <span>${rotuloMes(m.mes)}: ${formatarNumero(m.reincidentes)} de ${formatarNumero(m.ativos)} ${porMotorista ? 'motoristas' : 'placas'} também tiveram evento em ${rotuloMes(mesAnterior(m.mes))}</span></div>`
    ).join('') || '<div class="apagado">A reincidência mês a mês precisa de pelo menos dois meses seguidos no filtro.</div>';

    const maximo = Math.max(1, ...lista.flatMap(e => meses.map(m => e.m[m] || 0)));
    const isolado = this.estado.unicoSelecionado(listaFiltro);
    this.tabelas.reinc.renderizar([
      { k: nome, h: porMotorista ? 'Motorista' : 'Placa', cls: 'nowrap', f: r => `<b>${escaparHtml(r[nome])}</b>` },
      { k: 'cliente', h: 'Cliente', f: cliente(22) },
      ...meses.map(m => ({ k: 'mes-' + m, h: rotuloMes(m), num: true, v: r => r.m[m] || 0, f: r => celulaCalor(r.m[m], maximo) })),
      { k: 'sequencia', h: 'Meses seguidos', num: true },
      { k: 'total', h: 'Total', num: true, f: negrito('total') },
      { k: 'variacao', h: 'Var. mês', num: true, v: ordenarVariacao, f: r => celulaVariacao(r.variacao) },
      { k: 'grupos', h: 'Principais grupos', v: r => r.total, f: r => etiquetas(r.grupos, 2) }
    ], lista, {
      limite: this.estado.limites.reinc,
      aoClicar: r => this.#isolar(listaFiltro, r[nome]),
      selecionada: r => r[nome] === isolado
    });
    this.#botaoMais('reinc', lista.length);
  }

  // Clicar num local centraliza o mapa nele e abre a lista de eventos.
  #locais() {
    const locais = this.estado.agregado.locais;
    this.tabelas.loc.renderizar([
      { k: 'local', h: 'Local' },
      { k: 'total', h: 'Eventos', num: true, f: negrito('total') },
      { k: 'nPl', h: 'Placas', num: true },
      { k: 'nCli', h: 'Clientes', num: true },
      { k: 'grupos', h: 'Grupos', v: r => r.total, f: r => etiquetas(r.grupos) }
    ], locais, { limite: this.estado.limites.loc, aoClicar: r => this.painel.mapa.focar(r) });
    this.#botaoMais('loc', locais.length);
  }

  #placas() {
    const placas = this.estado.agregado.placas;
    const isolada = this.estado.unicoSelecionado('pla');
    this.tabelas.placa.renderizar([
      { k: 'placa', h: 'Placa', f: r => `<b>${escaparHtml(r.placa)}</b>` },
      { k: 'cliente', h: 'Cliente', cls: 'nowrap', f: cliente(22) },
      { k: 'total', h: 'Eventos', num: true, f: negrito('total') },
      { k: 'nViagens', h: 'SMs', num: true },
      { k: 'tecnologia', h: 'Tecnologia' },
      { k: 'grupos', h: 'Grupos', v: r => r.total, f: r => etiquetas(r.grupos, 2) }
    ], placas, {
      limite: this.estado.limites.placa, aoClicar: r => this.#isolar('pla', r.placa), selecionada: r => r.placa === isolada
    });
    this.#botaoMais('placa', placas.length);
  }

  #motoristas() {
    const motoristas = this.estado.agregado.motoristas;
    const isolado = this.estado.unicoSelecionado('mot');
    this.tabelas.mot.renderizar([
      { k: 'motorista', h: 'Motorista', cls: 'nowrap', f: r => `<span title="Local mais frequente: ${escaparHtml(r.topLocal)} (${formatarNumero(r.topLocalN)})">${escaparHtml(r.motorista)}</span>` },
      { k: 'cliente', h: 'Cliente', cls: 'nowrap', f: cliente(20) },
      { k: 'total', h: 'Eventos', num: true, f: negrito('total') },
      { k: 'nPlacas', h: 'Placas', num: true },
      { k: 'grupos', h: 'Grupos', v: r => r.total, f: r => etiquetas(r.grupos, 2) }
    ], motoristas, {
      limite: this.estado.limites.mot, aoClicar: r => this.#isolar('mot', r.motorista), selecionada: r => r.motorista === isolado
    });
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
      limite: this.estado.limites.per, aoClicar: r => this.#isolar('per', r.perfil), selecionada: r => r.perfil === isolado
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
      this.painel.redesenhar();
    };
  }
}
