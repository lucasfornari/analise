// Formatação de valores para exibição (pt-BR).

const numero = new Intl.NumberFormat('pt-BR');
export const formatarNumero = valor => numero.format(valor);

export const formatarPercentual = fracao =>
  (fracao * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// Todo texto vindo da planilha passa por aqui antes de entrar em innerHTML.
export const escaparHtml = texto => String(texto ?? '').replace(/[&<>"']/g, c => ENTIDADES[c]);

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
// '2026-03' -> 'mar/26'
export const rotuloMes = chave => { const [ano, mes] = chave.split('-'); return MESES[+mes - 1] + '/' + ano.slice(2); };

// '2026-03-05' -> '05/03/2026'
export const formatarDia = dia => dia ? dia.split('-').reverse().join('/') : '';

export const ultimoDiaDoMes = (ano, mes) => new Date(ano, mes, 0).getDate();

// Encurta razão social para caber nas tabelas: tira LTDA/S.A. e abrevia "Transportes Rodoviários de Cargas".
export const abreviarCliente = nome => nome
  .replace(/\s+(LTDA\.?|S\/?A\.?|EIRELI|ME)$/i, '')
  .replace(/TRANSPORTES? RODOVIARIOS? DE CARGAS?/i, 'TRANSP.')
  .trim();

// 'VIOLAÇÃO DE BAÚ' -> 'Violação de baú'
export const capitalizar = texto => { const t = texto.toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };

// Variação relativa com sinal: +33,5% / −12,0%. Para exceções, subir é ruim.
export const formatarVariacao = fracao => fracao == null ? '–'
  : (fracao > 0 ? '+' : fracao < 0 ? '−' : '') + formatarPercentual(Math.abs(fracao));

export const formatarDataHora = data => data ? data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
