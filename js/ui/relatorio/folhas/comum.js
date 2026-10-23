// Peças de HTML compartilhadas pelas folhas do relatório. Todo texto da planilha passa por escaparHtml.
import { formatarNumero, formatarPercentual, formatarVariacao, escaparHtml, capitalizar } from '../../../util/formatacao.js';
import { ROTULO_CLASSE } from '../../../nucleo/catalogoExcecoes.js';

export const bloco = (html, classe = '') => {
  const div = document.createElement('div');
  div.className = classe;
  div.innerHTML = html;
  return div;
};

export const pct = fracao => formatarPercentual(fracao ?? 0);

// Cartão de indicador: valor grande, rótulo e detalhe opcional.
export const cartao = (valor, rotulo, detalhe = '', classe = '') =>
  `<div class="cartao-rel ${classe}"><b>${valor}</b><span>${rotulo}</span>${detalhe ? `<small>${detalhe}</small>` : ''}</div>`;

// Variação mês a mês: subir é ruim (mais exceções). neutra: sem cor (ex.: viagens, onde subir não é piora).
export function variacaoHtml(variacao, { neutra = false } = {}) {
  if (!variacao) return '<span class="apagado">–</span>';
  const { pct: fracao, diferenca } = variacao;
  const classe = neutra ? 'neutra' : diferenca > 0 ? 'alta' : diferenca < 0 ? 'baixa' : '';
  const seta = diferenca > 0 ? '▲' : diferenca < 0 ? '▼' : '';
  return `<span class="variacao ${classe}">${seta ? seta + ' ' : ''}${fracao == null ? 'novo' : formatarVariacao(fracao)}</span>`;
}

// Principais exceções de um item: nome, quantidade e % do total do item, e o que ficou de fora.
export function excecoesHtml({ lista, outras }) {
  const linhas = lista.map(e => `<li><i class="ponto ${(e.classe || '').toLowerCase()}" title="${ROTULO_CLASSE[e.classe] || ''}"></i>`
    + `<span>${escaparHtml(capitalizar(e.nome))}</span><b>${formatarNumero(e.n)}</b><small>${pct(e.pct)}</small></li>`).join('');
  const resto = outras.tipos
    ? `<li class="resto">+ ${formatarNumero(outras.tipos)} ${outras.tipos === 1 ? 'outra exceção' : 'outras exceções'} (${formatarNumero(outras.eventos)} ${outras.eventos === 1 ? 'evento' : 'eventos'})</li>` : '';
  return `<ul class="exc-rel">${linhas}${resto}</ul>`;
}

// Nome principal com uma linha de apoio embaixo (cliente, coordenada…).
export const nomeComApoio = (nome, apoio) => `<b class="nome-rel">${escaparHtml(nome)}</b>${apoio ? `<small class="apoio-rel">${apoio}</small>` : ''}`;

export const legendaClasses = () => `<div class="legenda-rel">${['MOTORISTA', 'VEICULO', 'CONTEXTO']
  .map(c => `<span><i class="ponto ${c.toLowerCase()}"></i>${ROTULO_CLASSE[c]}</span>`).join('')}</div>`;
