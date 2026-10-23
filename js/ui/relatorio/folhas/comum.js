// Peças de HTML compartilhadas pelas folhas do relatório. Todo texto da planilha passa por escaparHtml.
import { formatarNumero, formatarPercentual, formatarVariacao, escaparHtml, capitalizar, rotuloMes } from '../../../util/formatacao.js';
import { mesAnterior } from '../../../nucleo/agregacao.js';
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

const decimal = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ESTAVEL = 0.01;   // variação abaixo de 1% é "praticamente igual"
const sentido = (v, subiu, caiu, igual) => Math.abs(v.pct ?? 1) < ESTAVEL ? igual : v.diferenca > 0 ? subiu : caiu;

// Último mês contra o anterior: viagens, exceções e exceções por viagem (tabela) e a conclusão em palavras.
// A conclusão vem das exceções por viagem: mais exceções com mais viagens não é piora. m: linha de viagens.meses.
const comparavel = m => !!(m?.variacao && m.variacaoExcecoes && m.variacaoPorViagem);

export function tabelaDoMes(m) {
  if (!comparavel(m)) return '';
  const linha = (rotulo, antes, agora, variacao, opcoes, classe = '') =>
    `<tr class="${classe}"><td>${rotulo}</td><td class="num">${antes}</td><td class="num">${agora}</td><td class="num">${variacaoHtml(variacao, opcoes)}</td></tr>`;
  return `<table class="tabela-rel numerica comparacao-rel">
      <thead><tr><th></th><th class="num">${rotuloMes(mesAnterior(m.mes))}</th><th class="num">${rotuloMes(m.mes)}</th><th class="num">Variação</th></tr></thead>
      <tbody>${linha('Viagens com exceção', formatarNumero(m.variacao.anterior), formatarNumero(m.viagens), m.variacao, { neutra: true })}
      ${linha('Exceções', formatarNumero(m.variacaoExcecoes.anterior), formatarNumero(m.excecoes), m.variacaoExcecoes)}
      ${linha('<b>Exceções por viagem</b>', decimal(m.variacaoPorViagem.anterior), `<b>${decimal(m.porViagem)}</b>`, m.variacaoPorViagem, {}, 'principal')}</tbody></table>`;
}

export function conclusaoDoMes(m) {
  if (!comparavel(m)) return '';
  const atual = rotuloMes(m.mes), anterior = rotuloMes(mesAnterior(m.mes));
  const v = m.variacaoPorViagem, percentual = formatarPercentual(Math.abs(v.pct));
  const media = `Cada viagem teve, em média, <b>${decimal(m.porViagem)}</b> exceções`;
  const resultado = sentido(v,
    `<b class="piora">piorou</b>. ${media}, contra ${decimal(v.anterior)} em ${anterior} (${percentual} a mais)`,
    `<b class="melhora">melhorou</b>. ${media}, contra ${decimal(v.anterior)} em ${anterior} (${percentual} a menos)`,
    `<b>ficou estável</b>. ${media}, como em ${anterior} (${decimal(v.anterior)})`);
  const viagens = sentido(m.variacao, 'mais viagens com exceção', 'menos viagens com exceção', 'o mesmo número de viagens com exceção');
  const excecoes = sentido(m.variacaoExcecoes, 'mais exceções', 'menos exceções', 'praticamente o mesmo número de exceções');
  return `<p class="conclusao-rel">Em ${atual} houve ${viagens} e ${excecoes} que em ${anterior}. Resultado: ${resultado}.</p>`;
}
