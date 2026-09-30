// Estado único do painel: dados carregados, seleção dos filtros e preferências de visualização.
import { CLASSES } from '../nucleo/classificacao.js';
import { filtrar } from '../nucleo/filtro.js';
import { agregar } from '../nucleo/agregacao.js';

// Listas de multisseleção: campo do registro, nome no plural e chave no objeto de filtro.
export const LISTAS = {
  exc: { campo: 'excecao', plural: 'exceções', chaveFiltro: 'excecoes' },
  cli: { campo: 'cliente', plural: 'clientes', chaveFiltro: 'clientes' },
  per: { campo: 'perfil', plural: 'perfis', chaveFiltro: 'perfis' }
};

export const LINHAS_POR_PAGINA = 15;

export class Estado {
  registros = [];
  meta = {};                  // arquivo, aba, estatísticas e período dos dados
  universo = { exc: new Set(), cli: new Set(), per: new Set() };   // todos os valores de cada lista
  selecao = {};
  ordenacao = {};             // por tabela: { k: coluna, dir: 'asc' | 'desc' }
  limites = {};               // linhas visíveis por tabela ("mostrar mais")
  filtrados = [];
  agregado = null;

  get carregado() { return this.registros.length > 0; }

  carregar(resultado, nomeArquivo) {
    this.registros = resultado.registros;
    for (const [lista, { campo }] of Object.entries(LISTAS)) this.universo[lista] = new Set(this.registros.map(r => r[campo]));
    const dias = this.registros.map(r => r.dia).filter(Boolean).sort();
    this.meta = {
      resultado, nomeArquivo, aba: resultado.aba, estatisticas: resultado.estatisticas,
      inicio: dias[0], fim: dias[dias.length - 1],
      meses: [...new Set(this.registros.map(r => r.mes).filter(Boolean))].sort()
    };
    this.reiniciar();
  }

  reiniciar() {
    this.selecao = {
      de: '', ate: '', placa: '', semDuplicados: false, classes: new Set(CLASSES),
      exc: new Set(this.universo.exc), cli: new Set(this.universo.cli), per: new Set(this.universo.per)
    };
    this.ordenacao = {};
    this.limites = { loc: LINHAS_POR_PAGINA, placa: LINHAS_POR_PAGINA, mot: LINHAS_POR_PAGINA, per: LINHAS_POR_PAGINA };
  }

  // Selecionar tudo equivale a não filtrar (null), o que também deixa o filtro mais rápido.
  filtroAtual() {
    const s = this.selecao;
    const lista = chave => s[chave].size === this.universo[chave].size ? null : s[chave];
    return {
      de: s.de, ate: s.ate, placa: s.placa, semDuplicados: s.semDuplicados,
      classes: s.classes.size === CLASSES.length ? null : s.classes,
      excecoes: lista('exc'), clientes: lista('cli'), perfis: lista('per')
    };
  }

  recalcular() {
    this.filtrados = filtrar(this.registros, this.filtroAtual());
    this.agregado = agregar(this.filtrados);
  }

  // Clicar no item já isolado desfaz o filtro; senão, isola o item.
  alternarUnico(lista, valor) {
    const sel = this.selecao[lista];
    const jaIsolado = sel.size === 1 && sel.has(valor);
    this.selecao[lista] = jaIsolado ? new Set(this.universo[lista]) : new Set([valor]);
  }

  unicoSelecionado(lista) {
    const sel = this.selecao[lista];
    return sel.size === 1 ? [...sel][0] : null;
  }
}
