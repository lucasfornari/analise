// Exceções de uma entidade (motorista, placa, local…) pelo nome e quantidade, nunca só pela classe ou grupo:
// etiquetas com as principais na célula e a lista completa no tooltip (Dica).
import { formatarNumero, formatarPercentual, escaparHtml, capitalizar } from '../util/formatacao.js';
import { ROTULO_CLASSE } from '../nucleo/catalogoExcecoes.js';

const LINHAS_NA_DICA = 12;

// [[nome, quantidade]] da mais para a menos frequente (empate: ordem alfabética, para ser estável)
export const porFrequencia = mapa => [...mapa.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

const classeCss = (classeDe, nome) => (classeDe.get(nome) || '').toLowerCase();

// porExcecao: Map nome -> quantidade; classeDe: Map nome -> classe (agregado.classeDaExcecao)
export function etiquetasExcecoes(porExcecao, classeDe, limite = 2) {
  const itens = porFrequencia(porExcecao), resto = itens.length - limite;
  return itens.slice(0, limite).map(([nome, n]) =>
    `<span class="tag exc ${classeCss(classeDe, nome)}" title="${escaparHtml(capitalizar(nome))}"><span>${escaparHtml(capitalizar(nome))}</span> <b>${formatarNumero(n)}</b></span>`).join('')
    + (resto > 0 ? `<span class="tag mais">+${formatarNumero(resto)}</span>` : '');
}

// Lista com cada exceção (até `limite`), quantidade e participação no total; o restante vira uma linha só.
export function listaExcecoes(porExcecao, classeDe, limite = LINHAS_NA_DICA) {
  const itens = porFrequencia(porExcecao);
  let total = 0;
  for (const [, n] of itens) total += n;
  const linha = ([nome, n]) => {
    const classe = classeDe.get(nome);
    return `<li><i class="ponto ${(classe || '').toLowerCase()}" title="${ROTULO_CLASSE[classe] || ''}"></i>`
      + `<span>${escaparHtml(capitalizar(nome))}</span><b>${formatarNumero(n)}</b><small>${formatarPercentual(n / total)}</small></li>`;
  };
  const resto = itens.slice(limite);
  const somaResto = resto.reduce((s, [, n]) => s + n, 0);
  return `<ul class="lista-excecoes">${itens.slice(0, limite).map(linha).join('')}</ul>`
    + (resto.length ? `<div class="lista-resto">e mais ${formatarNumero(resto.length)} ${resto.length === 1 ? 'exceção' : 'exceções'} (${formatarNumero(somaResto)} ${somaResto === 1 ? 'evento' : 'eventos'})</div>` : '');
}

// Conteúdo do tooltip: título, total de eventos e de tipos de exceção, contexto e a lista.
// extra: linhas de contexto (já escapadas), como cliente ou local mais frequente.
export function dicaExcecoes(titulo, porExcecao, classeDe, extra = [], limite = LINHAS_NA_DICA) {
  let total = 0;
  for (const n of porExcecao.values()) total += n;
  const tipos = porExcecao.size;
  return `<div class="dica-titulo"><b>${escaparHtml(titulo)}</b>`
    + `<span>${formatarNumero(total)} ${total === 1 ? 'evento' : 'eventos'} · ${formatarNumero(tipos)} ${tipos === 1 ? 'exceção' : 'exceções'}</span>`
    + extra.map(t => `<span>${t}</span>`).join('') + '</div>'
    + listaExcecoes(porExcecao, classeDe, limite);
}
