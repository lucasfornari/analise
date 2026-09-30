import { test } from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { normalizarChave, limparTexto, chavePlaca } from '../../js/nucleo/texto.js';
import { converterData, converterNumero } from '../../js/nucleo/conversores.js';

test('normalizarChave ignora acento, caixa e espaços (inclusive NBSP)', () => {
  assert.equal(normalizarChave('  Violação de   baú '), 'VIOLACAO DE BAU');
  assert.equal(normalizarChave(null), '');
});

test('limparTexto colapsa espaços sem mudar a grafia', () => {
  assert.equal(limparTexto(' Beta   Logística S/A '), 'Beta Logística S/A');
});

test('chavePlaca mantém só letras e números', () => {
  assert.equal(chavePlaca('bry-2e52'), 'BRY2E52');
  assert.equal(chavePlaca(''), '');
});

test('converterData lê dd/mm/aaaa (nunca mm/dd) com e sem hora', () => {
  const d = converterData('05/03/2026 14:07');
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()], [2026, 2, 5, 14, 7]);
  assert.equal(converterData('05/13/2026'), null, 'mês 13 é inválido');
  assert.equal(converterData('01/02/26').getFullYear(), 2026, 'ano com 2 dígitos');
});

test('converterData lê ISO, Date e serial do Excel', () => {
  assert.equal(converterData('2026-01-31T10:00').getDate(), 31);
  assert.equal(converterData(new Date(2026, 0, 2)).getDate(), 2);
  const serial = converterData(46082.5, XLSX.SSF);   // 2026-03-01 12:00
  assert.deepEqual([serial.getFullYear(), serial.getMonth(), serial.getDate(), serial.getHours()], [2026, 2, 1, 12]);
  assert.equal(converterData(46082).getUTCDate(), 1, 'sem SSF usa a conta aproximada');
});

test('converterData rejeita vazio, texto e anos fora de 2000–2100', () => {
  for (const v of [null, '', 'ontem', '01/01/1999', new Date('x')]) assert.equal(converterData(v), null, String(v));
});

test('converterNumero aceita formato brasileiro e americano', () => {
  assert.equal(converterNumero('-22,9'), -22.9);
  assert.equal(converterNumero('-22.9'), -22.9);
  assert.equal(converterNumero('1.234,5'), 1234.5);
  assert.equal(converterNumero(' 10 '), 10);
  assert.equal(converterNumero(7), 7);
  for (const v of [null, '', 'abc', Infinity, '1,2,3']) assert.equal(converterNumero(v), null, String(v));
});
