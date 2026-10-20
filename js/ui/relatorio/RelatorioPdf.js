// Relatório de exceções em PDF, pela impressão do navegador ("Salvar como PDF").
// Fluxo: escolher o cliente (ou a carteira) -> calcular as seções (js/nucleo/relatorio) -> desenhar as folhas A4
// (js/ui/relatorio/folhas) com paginação por medição -> imprimir -> limpar. Os filtros do painel continuam valendo.
import { $ } from '../../util/dom.js';
import { formatarNumero, formatarPercentual, escaparHtml, abreviarCliente, textoDaVersao } from '../../util/formatacao.js';
import { normalizarChave } from '../../nucleo/texto.js';
import { montarRelatorio } from '../../nucleo/relatorio/montarRelatorio.js';
import { FOLHAS_DO_RELATORIO, OPCOES_DO_RELATORIO } from '../../config/relatorio.js';
import { VERSAO } from '../../config/versao.js';
import { etiquetasDosFiltros } from '../ResumoFiltros.js';
import { Paginador } from './Paginador.js';
import { DESENHO_DA_FOLHA, preencherSumario } from './folhas/index.js';

const CARTEIRA = '';   // valor da opção "todos os clientes" na escolha
const dataBr = data => data.toLocaleDateString('pt-BR');

export class RelatorioPdf {
  constructor(painel) {
    this.painel = painel;
    this.estado = painel.estado;
    this.raiz = $('#relatorio');
    this.botao = $('#btnRelatorio');
    this.janela = $('#relatorioEscolha');
    this.lista = $('#relatorioClientes');
    this.busca = $('#relatorioBusca');
    this.gerarBotao = $('#relatorioGerar');

    this.botao.onclick = () => this.abrir();
    this.busca.oninput = () => this.#filtrarLista();
    this.lista.onchange = () => { this.gerarBotao.disabled = !this.#escolhido(); };
    this.lista.ondblclick = e => { if (e.target.closest('label')) this.gerarBotao.click(); };
    this.janela.addEventListener('close', () => {
      if (this.janela.returnValue === 'gerar' && this.#escolhido()) this.gerar(this.#escolhido().value || null);
    });
    // fecha a impressão: descarta as folhas (data-manter: os testes inspecionam o PDF gerado depois)
    addEventListener('afterprint', () => { if (!this.raiz.dataset.manter) this.limpar(); });
  }

  get aberta() { return this.janela.open; }

  // Um único cliente no filtro: gera direto. Vários: pergunta qual (ou a carteira inteira).
  abrir() {
    if (!this.estado.carregado) return;
    const clientes = this.estado.agregado.clientes;
    if (!clientes.length) return;
    if (clientes.length === 1) return this.gerar(clientes[0].cliente);
    const total = this.estado.agregado.n;
    this.lista.innerHTML = `<label class="opcao-carteira"><input type="radio" name="clienteRelatorio" value="${CARTEIRA}">
        <span><b>Todos os clientes (carteira)</b><small>${formatarNumero(clientes.length)} clientes · ${formatarNumero(total)} exceções</small></span></label>`
      + clientes.map(c => `<label data-busca="${escaparHtml(normalizarChave(c.cliente))}"><input type="radio" name="clienteRelatorio" value="${escaparHtml(c.cliente)}">
        <span><b>${escaparHtml(abreviarCliente(c.cliente))}</b><small>${formatarNumero(c.total)} exceções · ${formatarPercentual(c.pct)} do total</small></span></label>`).join('');
    this.busca.value = '';
    this.gerarBotao.disabled = true;
    this.janela.returnValue = '';
    this.janela.showModal();
    this.busca.focus();
  }

  #escolhido() {
    return this.lista.querySelector('input:checked');
  }

  #filtrarLista() {
    const termo = normalizarChave(this.busca.value);
    this.lista.querySelectorAll('label[data-busca]').forEach(l => { l.hidden = termo && !l.dataset.busca.includes(termo); });
  }

  // cliente: nome do cliente, ou null para a carteira (todos os clientes do filtro).
  async gerar(cliente) {
    const textoBotao = this.botao.textContent;
    this.botao.disabled = true;
    this.botao.textContent = 'Gerando…';
    try {
      await new Promise(requestAnimationFrame);   // mostra o "Gerando…" antes do cálculo
      await document.fonts?.ready;
      this.montar(cliente);
      // os gráficos são imagens: imprimir antes de carregarem deixa quadrados em branco no PDF
      await Promise.all([...this.raiz.querySelectorAll('img')].map(img => img.decode().catch(() => {})));
      document.body.classList.add('imprimindo-relatorio');
      this.tituloOriginal = document.title;
      document.title = this.nomeDoArquivo;      // vira o nome sugerido do PDF
      window.print();
    } catch (erro) {
      console.error(erro);
      this.limpar();
    } finally {
      this.botao.disabled = false;
      this.botao.textContent = textoBotao;
    }
  }

  // Monta as folhas no contêiner (separado de gerar() para testes e para pré-visualizar).
  montar(cliente) {
    this.limpar();
    const carteira = !cliente;
    const modo = carteira ? 'carteira' : 'cliente';
    const folhas = FOLHAS_DO_RELATORIO.filter(f => f.modos.includes(modo));
    const registros = carteira ? this.estado.filtrados : this.estado.filtrados.filter(r => r.cliente === cliente);
    const { secoes } = montarRelatorio(registros, {
      ids: folhas.map(f => f.id), opcoes: OPCOES_DO_RELATORIO, carteira,
      ...(carteira && { agregado: this.estado.agregado })   // mesmo recorte do painel: não agrega de novo
    });

    const contexto = this.#contexto(cliente, secoes.resumo?.dados);
    const paginador = new Paginador(this.raiz, () =>
      `${contexto.logo}<span>Relatório de exceções</span><span class="contexto"><b>${escaparHtml(contexto.sujeitoCurto)}</b> · ${contexto.periodo}</span>`);
    this.raiz.hidden = false;
    for (const { id } of folhas) DESENHO_DA_FOLHA[id]?.(paginador, { secao: secoes[id], secoes, contexto });

    const inicio = paginador.finalizar(`Gerado em ${contexto.geradoEm} · Painel de Exceções · Raster`);
    preencherSumario(this.raiz, folhas.filter(f => !['capa', 'resumo'].includes(f.id) && inicio[f.id])
      .map(f => ({ titulo: secoes[f.id]?.titulo ?? (f.id === 'notas' ? 'Notas e metodologia' : f.id), pagina: inicio[f.id] })));
    this.nomeDoArquivo = `Relatório de exceções - ${contexto.sujeitoCurto} - ${contexto.periodoArquivo}`.replace(/[\\/:*?"<>|]+/g, '-');
    return paginador.folhas.length;
  }

  #contexto(cliente, resumo) {
    const { meta } = this.estado;
    const inicio = resumo?.inicio, fim = resumo?.fim;
    const periodo = inicio ? `${dataBr(inicio)} a ${dataBr(fim)}` : 'sem datas';
    const nClientes = resumo?.clientes ?? 0;
    return {
      logo: document.querySelector('.brand .logo')?.outerHTML ?? '',
      sujeito: cliente ?? 'Carteira de clientes',
      sujeitoCurto: cliente ? abreviarCliente(cliente) : 'Carteira',
      detalheSujeito: cliente ? '' : `${formatarNumero(nClientes)} ${nClientes === 1 ? 'cliente' : 'clientes'} no período`,
      periodo,
      periodoArquivo: inicio ? `${dataBr(inicio)} a ${dataBr(fim)}`.replace(/\//g, '-') : 'sem datas',
      filtros: etiquetasDosFiltros(this.estado).filter(([filtro]) => !(cliente && filtro === 'cli')),
      geradoEm: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      versao: textoDaVersao(VERSAO),
      arquivo: meta.nomeArquivo ?? '',
      estatisticas: meta.estatisticas ?? meta,
      resumo: resumo ?? {}
    };
  }

  limpar() {
    this.raiz.innerHTML = '';
    this.raiz.hidden = true;
    document.body.classList.remove('imprimindo-relatorio');
    if (this.tituloOriginal) { document.title = this.tituloOriginal; this.tituloOriginal = null; }
  }
}
