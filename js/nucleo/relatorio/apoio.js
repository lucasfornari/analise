// Funções compartilhadas pelas seções do relatório (puras, sem DOM).
import { mesAnterior } from '../agregacao.js';

// Principais exceções de uma entidade: [{ nome, classe, n, pct }] + resumo do que ficou de fora.
export function principaisExcecoes(porExcecao, classeDe, limite) {
  const itens = [...porExcecao.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  let total = 0;
  for (const [, n] of itens) total += n;
  const lista = itens.slice(0, limite).map(([nome, n]) => ({ nome, classe: classeDe.get(nome), n, pct: total ? n / total : 0 }));
  const resto = itens.slice(limite);
  return { lista, outras: { tipos: resto.length, eventos: resto.reduce((s, [, n]) => s + n, 0) }, tipos: itens.length };
}

// Variação contra o mês de calendário anterior (null se ele não estiver nos dados).
export function variacaoContraAnterior(valorDoMes, mes, meses) {
  const anterior = mesAnterior(mes);
  if (!meses.includes(anterior)) return null;
  const atual = valorDoMes(mes), antes = valorDoMes(anterior);
  return { anterior: antes, diferenca: atual - antes, pct: antes ? (atual - antes) / antes : null };
}

// Distância em metros entre duas coordenadas (haversine).
export function distanciaMetros(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180, dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

// Percentil (0 a 1) de uma lista de números, pelo valor mais próximo (sem interpolar).
export function percentil(valores, p) {
  if (!valores.length) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.min(ordenados.length - 1, Math.ceil(p * ordenados.length) - 1)];
}
