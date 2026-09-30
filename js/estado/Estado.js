// Estado único do painel: dados carregados, seleção dos filtros e preferências de visualização.
import { CLASSES } from '../nucleo/catalogoExcecoes.js';
import { CAMPO_DA_LISTA, filtrarComFacetas, valorNaLista } from '../nucleo/filtro.js';
import { agregar } from '../nucleo/agregacao.js';

// Listas de multisseleção, na ordem do menu: campo do registro e nomes para a interface.
export const LISTAS = {
  cli: { campo: CAMPO_DA_LISTA.cli, titulo: 'Clientes', singular: 'cliente', plural: 'clientes', busca: 'Buscar cliente' },
  mot: { campo: CAMPO_DA_LISTA.mot, titulo: 'Motoristas', singular: 'motorista', plural: 'motoristas', busca: 'Buscar motorista ou cliente' },
  pla: { campo: CAMPO_DA_LISTA.pla, titulo: 'Placas', singular: 'placa', plural: 'placas', busca: 'Buscar placa ou cliente' },
  exc: { campo: CAMPO_DA_LISTA.exc, titulo: 'Exceções', singular: 'exceção', plural: 'exceções', busca: 'Buscar exceção' },
  per: { campo: CAMPO_DA_LISTA.per, titulo: 'Perfil de segurança', singular: 'perfil', plural: 'perfis', busca: 'Buscar perfil, cliente ou seguradora' }
};

export const LINHAS_POR_PAGINA = 15;
const TABELAS_PAGINADAS = ['loc', 'placa', 'mot', 'per', 'reinc', 'cliMes'];

export class Estado {
  registros = [];
  meta = {};                  // arquivo, aba, estatísticas e período dos dados
  universo = {};              // todos os valores de cada lista
  selecao = {};
  ordenacao = {};             // por tabela: { k: coluna, dir: 'asc' | 'desc' }
  limites = {};               // linhas visíveis por tabela ("mostrar mais")
  filtrados = [];
  facetas = {};               // por lista: valor -> eventos com os demais filtros
  agregado = null;

  get carregado() { return this.registros.length > 0; }

  carregar(resultado, nomeArquivo) {
    this.registros = resultado.registros;
    for (const lista of Object.keys(LISTAS)) {
      this.universo[lista] = new Set(this.registros.map(r => valorNaLista(r, lista)));
    }
    let inicio = null, fim = null;
    const meses = new Set();
    for (const r of this.registros) {
      if (!r.dia) continue;
      if (inicio === null || r.dia < inicio) inicio = r.dia;
      if (fim === null || r.dia > fim) fim = r.dia;
      meses.add(r.mes);
    }
    const { registros, ...semRegistros } = resultado;
    this.meta = { ...semRegistros, nomeArquivo, inicio, fim, meses: [...meses].sort() };
    this.reiniciar();
  }

  reiniciar() {
    this.selecao = { de: '', ate: '', placa: '', semDuplicados: false, classes: new Set(CLASSES) };
    for (const lista of Object.keys(LISTAS)) this.selecao[lista] = new Set(this.universo[lista]);
    this.ordenacao = {};
    this.limites = Object.fromEntries(TABELAS_PAGINADAS.map(t => [t, LINHAS_POR_PAGINA]));
  }

  // Selecionar tudo equivale a não filtrar (null), o que também deixa o filtro mais rápido.
  filtroAtual() {
    const s = this.selecao;
    return {
      de: s.de, ate: s.ate, placa: s.placa, semDuplicados: s.semDuplicados,
      classes: s.classes.size === CLASSES.length ? null : s.classes,
      listas: Object.fromEntries(Object.keys(LISTAS).map(l => [l, this.listaCompleta(l) ? null : s[l]]))
    };
  }

  listaCompleta(lista) {
    return this.selecao[lista].size === this.universo[lista].size;
  }

  recalcular() {
    const { filtrados, facetas } = filtrarComFacetas(this.registros, this.filtroAtual());
    this.filtrados = filtrados;
    this.facetas = facetas;
    this.agregado = agregar(filtrados);
  }

  // Clicar no item já isolado desfaz o filtro; senão, isola o item.
  alternarUnico(lista, valor) {
    const jaIsolado = this.unicoSelecionado(lista) === valor;
    this.selecao[lista] = jaIsolado ? new Set(this.universo[lista]) : new Set([valor]);
  }

  unicoSelecionado(lista) {
    const sel = this.selecao[lista];
    return sel.size === 1 && !this.listaCompleta(lista) ? [...sel][0] : null;
  }

  // Remove um filtro específico (etiquetas de filtros ativos).
  limpar(filtro) {
    const s = this.selecao;
    if (filtro === 'periodo') { s.de = ''; s.ate = ''; }
    else if (filtro === 'classes') s.classes = new Set(CLASSES);
    else if (filtro === 'placa') s.placa = '';
    else if (filtro === 'semDuplicados') s.semDuplicados = false;
    else if (LISTAS[filtro]) s[filtro] = new Set(this.universo[filtro]);
  }
}
