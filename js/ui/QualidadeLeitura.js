// Conferência da leitura e da normalização do arquivo, e opção de ignorar duplicados exatos.
import { $ } from '../util/dom.js';
import { formatarNumero, escaparHtml, formatarDia, capitalizar } from '../util/formatacao.js';

export class QualidadeLeitura {
  constructor(painel) {
    this.painel = painel;
    this.estado = painel.estado;
  }

  renderizar() {
    const { meta, universo, selecao } = this.estado;
    const e = meta.estatisticas;
    const itens = [
      ['Arquivo', escaparHtml(meta.nomeArquivo) + (meta.aba ? ' / aba ' + escaparHtml(meta.aba) : '')],
      ['Linhas com conteúdo', formatarNumero(e.lidas)],
      ['Eventos válidos', formatarNumero(e.validas)],
      ['Descartadas (sem cliente/exceção)', formatarNumero(e.descartadas)],
      ['Sem data', formatarNumero(e.semData)],
      ['Sem coordenada', formatarNumero(e.semCoord)],
      ['Classe corrigida pelo catálogo', formatarNumero(e.classeCorrigida)],
      ['Exceções fora do catálogo', formatarNumero(e.naoCatalogadas)],
      ['Placas fora do padrão', formatarNumero(e.placasForaDoPadrao)],
      ['Duplicados exatos', formatarNumero(e.duplicadas)],
      ['Período', `${formatarDia(meta.inicio)} a ${formatarDia(meta.fim)}`],
      ['Clientes', formatarNumero(universo.cli.size)],
      ['Motoristas', formatarNumero(universo.mot.size)],
      ['Placas', formatarNumero(universo.pla.size)],
      ['Tipos de exceção', formatarNumero(universo.exc.size)],
      ['Perfis de segurança', formatarNumero(universo.per.size)]
    ];
    // exceções novas precisam entrar no catálogo para terem classe e grupo fixos
    const foraDoCatalogo = e.excecoesNaoCatalogadas.length
      ? `<div class="fora-catalogo"><b>Fora do catálogo</b> (classe tirada da planilha; incluir em js/nucleo/catalogoExcecoes.js): ${
        e.excecoesNaoCatalogadas.map(x => `${escaparHtml(capitalizar(x.nome))} (${formatarNumero(x.n)})`).join(', ')}</div>`
      : '';
    const opcaoDuplicados = e.duplicadas
      ? `<label class="opcao-duplicados"><input type="checkbox" id="chkDup" ${selecao.semDuplicados ? 'checked' : ''}> Ignorar duplicados exatos (mesma SM, exceção, data e placa)</label>`
      : '';
    $('#quality').innerHTML = itens.map(([rotulo, valor]) => `<span>${rotulo}: <b>${valor}</b></span>`).join('') + foraDoCatalogo + opcaoDuplicados;

    const marcador = $('#chkDup');
    if (marcador) marcador.onchange = () => { selecao.semDuplicados = marcador.checked; this.painel.atualizar(true); };
  }
}
