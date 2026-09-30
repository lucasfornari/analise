import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarChave, limparTexto, chavePlaca, placaValida } from '../../js/nucleo/texto.js';
import { converterData, converterNumero, dataDoSerialExcel } from '../../js/nucleo/conversores.js';

const partes = d => d && [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()];

test('texto: chave, limpeza e placa', () => {
  const casos = [
    [normalizarChave('  Violação de   baú '), 'VIOLACAO DE BAU'],
    [normalizarChave(null), ''],
    [limparTexto(' Beta   Logística S/A '), 'Beta Logística S/A'],
    [chavePlaca('bry-2e52'), 'BRY2E52'],
    [chavePlaca(undefined), '']
  ];
  for (const [obtido, esperado] of casos) assert.equal(obtido, esperado);
  for (const [placa, valida] of [['ABC1234', true], ['ABC1D23', true], ['XX123', false], ['ABCD123', false], ['', false]]) {
    assert.equal(placaValida(placa), valida, placa);
  }
});

test('converterData: formatos aceitos', () => {
  const casos = [
    ['05/03/2026 14:07', [2026, 3, 5, 14, 7, 0]],
    ['01/02/26', [2026, 2, 1, 0, 0, 0]],
    ['2026-01-31T10:00', [2026, 1, 31, 10, 0, 0]],
    [new Date(2026, 0, 2), [2026, 1, 2, 0, 0, 0]],
    [46235.58952306713, [2026, 8, 1, 14, 8, 55]],   // serial do export real
    [46082.5, [2026, 3, 1, 12, 0, 0]],
    ['46082,5', [2026, 3, 1, 12, 0, 0]]              // serial como texto (CSV)
  ];
  for (const [valor, esperado] of casos) assert.deepEqual(partes(converterData(valor)), esperado, String(valor));
});

test('converterData: rejeita vazio, texto, mês 13 e anos fora de 2000–2100', () => {
  for (const v of [null, '', 'ontem', '05/13/2026', '01/01/1999', new Date('x'), NaN, 12]) assert.equal(converterData(v), null, String(v));
});

test('dataDoSerialExcel mantém o horário local (sem deslocar pelo fuso)', () => {
  assert.deepEqual(partes(dataDoSerialExcel(46235)), [2026, 8, 1, 0, 0, 0]);
});

test('converterNumero: padrão brasileiro e americano', () => {
  const casos = [['-22,9', -22.9], ['-22.9', -22.9], ['1.234,5', 1234.5], [' 10 ', 10], [7, 7],
    [null, null], ['', null], ['abc', null], [Infinity, null], ['1,2,3', null]];
  for (const [valor, esperado] of casos) assert.equal(converterNumero(valor), esperado, String(valor));
});
