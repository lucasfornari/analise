// Janela de detalhes de um local do mapa: placas, motoristas e todos os eventos, com busca e exportação.
// Clicar numa placa ou num motorista filtra o painel inteiro por ele.
import { $, $$ } from '../util/dom.js';
import { formatarNumero, escaparHtml, abreviarCliente, capitalizar, formatarDataHora } from '../util/formatacao.js';
import { baixarArquivo } from '../util/download.js';
import { CLASSE_DO_GRUPO, ROTULO_GRUPO, ROTULO_CLASSE } from '../nucleo/catalogoExcecoes.js';
import { detalharLocal, buscarNoDetalhe } from '../nucleo/detalheLocal.js';
import { gerarCsv } from '../nucleo/exportacao.js';
import { EM_BRANCO } from '../nucleo/filtro.js';
import { Tabela } from './Tabela.js';

const LINHAS_POR_PAGINA = 100;
const porFrequencia = mapa => [...mapa.entries()].sort((a, b) => b[1] - a[1]);

const etiquetas = (grupos, limite = 2) => porFrequencia(grupos).slice(0, limite)
  .map(([g, n]) => `<span class="tag ${(CLASSE_DO_GRUPO[g] || '').toLowerCase()}">${ROTULO_GRUPO[g]} ${formatarNumero(n)}</span>`).join('');
// "JOÃO (3), MARIA (1)" com no máximo 3 nomes
const nomesComContagem = mapa => {
  const itens = porFrequencia(mapa);
  return itens.slice(0, 3).map(([nome, n]) => `${escaparHtml(nome)} (${formatarNumero(n)})`).join(', ') + (itens.length > 3 ? ` +${itens.length - 3}` : '');
};
const cliente = linha => `<span title="${escaparHtml(linha.cliente)}">${escaparHtml(abreviarCliente(linha.cliente))}</span>`;

export class DetalheLocal {
  aba = 'placas';          // 'placas' | 'motoristas' | 'eventos'
  limite = LINHAS_POR_PAGINA;
  local = null;
  detalhe = null;

  constructor(painel) {
    this.painel = painel;
    this.janela = $('#detalheLocal');
    this.busca = $('#detalheBusca');
    this.tabela = new Tabela($('#tblDetalhe'), 'detalhe', painel.estado, () => this.#renderizarTabela());

    $$('#detalheAbas button').forEach(b => b.onclick = () => this.#trocarAba(b.dataset.v));
    this.busca.oninput = () => { this.limite = LINHAS_POR_PAGINA; this.#renderizarTabela(); };
    $('#detalheMais').onclick = () => { this.limite += LINHAS_POR_PAGINA; this.#renderizarTabela(); };
    $('#detalheExportar').onclick = () => this.#exportar();
    $('#detalheFechar').onclick = () => this.fechar();
    // clique no fundo escurecido (fora do conteúdo) fecha
    this.janela.addEventListener('click', e => { if (e.target === this.janela) this.fechar(); });
  }

  get aberta() { return this.janela.open; }

  abrir(local) {
    this.local = local;
    this.detalhe = detalharLocal(local.eventos);
    this.busca.value = '';
    this.limite = LINHAS_POR_PAGINA;
    this.#renderizarCabecalho();
    this.#trocarAba('placas');
    if (!this.janela.open) this.janela.showModal();
  }

  fechar() {
    if (this.janela.open) this.janela.close();
  }

  #renderizarCabecalho() {
    const { resumo } = this.detalhe;
    $('#detalheTitulo').textContent = this.local.local;
    $('#detalheResumo').textContent = resumo.primeiro
      ? `De ${formatarDataHora(resumo.primeiro)} a ${formatarDataHora(resumo.ultimo)}, com os filtros atuais do painel`
      : 'Com os filtros atuais do painel';
    $('#detalheIndicadores').innerHTML = [
      [resumo.eventos, 'eventos'], [resumo.placas, 'placas'], [resumo.motoristas, 'motoristas'],
      [resumo.viagens, 'SMs'], [resumo.clientes, 'clientes']
    ].map(([n, rotulo]) => `<div><b>${formatarNumero(n)}</b><span>${rotulo}</span></div>`).join('');
  }

  #trocarAba(aba) {
    this.aba = aba;
    this.limite = LINHAS_POR_PAGINA;
    $$('#detalheAbas button').forEach(b => b.classList.toggle('on', b.dataset.v === aba));
    this.#renderizarTabela();
  }

  #renderizarTabela() {
    const linhas = buscarNoDetalhe(this.detalhe[this.aba], this.busca.value);
    const [colunas, aoClicar] = this.#colunas();
    this.tabela.chave = 'detalhe-' + this.aba;   // ordenação guardada por aba
    this.tabela.renderizar(colunas, linhas, { limite: this.limite, aoClicar });
    const mais = $('#detalheMais');
    mais.classList.toggle('hidden', linhas.length <= this.limite);
    mais.textContent = `Mostrar mais (${formatarNumero(linhas.length - this.limite)} restantes)`;
    const total = this.detalhe[this.aba].length;
    $('#detalheNota').textContent = linhas.length < total ? `${formatarNumero(linhas.length)} de ${formatarNumero(total)} na busca` : '';
  }

  // [colunas da aba, ação ao clicar numa linha]
  #colunas() {
    const filtrarPor = (lista, valor) => valor === EM_BRANCO ? undefined : () => this.#filtrarPainel(lista, valor);
    if (this.aba === 'placas') return [[
      { k: 'placa', h: 'Placa', f: p => `<b>${escaparHtml(p.placa)}</b>` },
      { k: 'carretas', h: 'Carreta', v: p => [...p.carretas].join(' '), f: p => escaparHtml([...p.carretas].join(', ')) },
      { k: 'motoristas', h: 'Motoristas', v: p => p.motoristas.size, f: p => nomesComContagem(p.motoristas) },
      { k: 'cliente', h: 'Cliente', f: cliente },
      { k: 'total', h: 'Eventos', num: true, f: p => `<b>${formatarNumero(p.total)}</b>` },
      { k: 'nViagens', h: 'SMs', num: true },
      { k: 'ultimo', h: 'Último evento', v: p => p.ultimo?.getTime() ?? 0, f: p => `<span class="nowrap">${formatarDataHora(p.ultimo)}</span>` },
      { k: 'grupos', h: 'Grupos', v: p => p.total, f: p => etiquetas(p.grupos) }
    ], p => filtrarPor('pla', p.placa)?.()];
    if (this.aba === 'motoristas') return [[
      { k: 'motorista', h: 'Motorista', f: m => `<b>${escaparHtml(m.motorista)}</b>` },
      { k: 'placas', h: 'Placas', v: m => m.placas.size, f: m => nomesComContagem(m.placas) },
      { k: 'cliente', h: 'Cliente', f: cliente },
      { k: 'total', h: 'Eventos', num: true, f: m => `<b>${formatarNumero(m.total)}</b>` },
      { k: 'nViagens', h: 'SMs', num: true },
      { k: 'ultimo', h: 'Último evento', v: m => m.ultimo?.getTime() ?? 0, f: m => `<span class="nowrap">${formatarDataHora(m.ultimo)}</span>` },
      { k: 'grupos', h: 'Grupos', v: m => m.total, f: m => etiquetas(m.grupos) }
    ], m => filtrarPor('mot', m.motorista)?.()];
    return [[
      { k: 'data', h: 'Data/hora', v: e => e.registro.data?.getTime() ?? 0, f: e => `<span class="nowrap">${formatarDataHora(e.registro.data)}</span>` },
      { k: 'excecao', h: 'Exceção', v: e => e.registro.excecao,
        f: e => `${escaparHtml(capitalizar(e.registro.excecao))} <span class="tag ${e.registro.classe.toLowerCase()}">${ROTULO_CLASSE[e.registro.classe]}</span>` },
      { k: 'placa', h: 'Placa', v: e => e.registro.placa,
        f: e => `<b>${escaparHtml(e.registro.placa)}</b>${e.registro.carreta ? ` <small class="apagado">${escaparHtml(e.registro.carreta)}</small>` : ''}` },
      { k: 'motorista', h: 'Motorista', v: e => e.registro.motorista, f: e => escaparHtml(e.registro.motorista) },
      { k: 'viagem', h: 'SM', v: e => e.registro.viagem, f: e => escaparHtml(e.registro.viagem) },
      { k: 'cliente', h: 'Cliente', v: e => e.registro.cliente, f: e => cliente(e.registro) }
    ], null];
  }

  #filtrarPainel(lista, valor) {
    this.painel.estado.alternarUnico(lista, valor);
    this.fechar();
    this.painel.atualizar(true);
  }

  #exportar() {
    const nome = 'excecoes_' + this.local.local.normalize('NFD').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').toLowerCase() + '.csv';
    baixarArquivo(nome, gerarCsv(this.local.eventos), 'text/csv;charset=utf-8');
  }
}
