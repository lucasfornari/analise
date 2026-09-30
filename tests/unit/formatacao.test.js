import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarNumero, formatarPercentual, escaparHtml, rotuloMes, formatarDia, ultimoDiaDoMes, abreviarCliente, capitalizar }
  from '../../js/util/formatacao.js';

test('formatação pt-BR', () => {
  assert.equal(formatarNumero(12345), '12.345');
  assert.equal(formatarPercentual(0.7568), '75,7%');
  assert.equal(rotuloMes('2026-03'), 'mar/26');
  assert.equal(formatarDia('2026-03-05'), '05/03/2026');
  assert.equal(formatarDia(''), '');
  assert.equal(ultimoDiaDoMes(2024, 2), 29);
});

test('escaparHtml neutraliza texto vindo da planilha', () => {
  assert.equal(escaparHtml(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  assert.equal(escaparHtml(null), '');
});

test('abreviarCliente e capitalizar', () => {
  assert.equal(abreviarCliente('TRANSPORTES RODOVIARIOS DE CARGAS SILVA LTDA'), 'TRANSP. SILVA');
  assert.equal(abreviarCliente('Beta Logística S/A'), 'Beta Logística');
  assert.equal(capitalizar('VIOLAÇÃO DE BAÚ'), 'Violação de baú');
});
