import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoDaVersao, formatarNumero, formatarPercentual, formatarVariacao, escaparHtml, rotuloMes, formatarDia, ultimoDiaDoMes, abreviarCliente, capitalizar }
  from '../../js/util/formatacao.js';

test('formatação pt-BR', () => {
  const casos = [
    [formatarNumero(12345), '12.345'], [formatarPercentual(0.7568), '75,7%'],
    [formatarVariacao(0.3345), '+33,5%'], [formatarVariacao(-0.12), '−12,0%'], [formatarVariacao(0), '0,0%'], [formatarVariacao(null), '–'],
    [rotuloMes('2026-03'), 'mar/26'], [formatarDia('2026-03-05'), '05/03/2026'], [formatarDia(''), ''], [ultimoDiaDoMes(2024, 2), 29],
    [abreviarCliente('TRANSPORTES RODOVIARIOS DE CARGAS SILVA LTDA'), 'TRANSP. SILVA'], [abreviarCliente('Beta Logística S/A'), 'Beta Logística'],
    [capitalizar('VIOLAÇÃO DE BAÚ'), 'Violação de baú']
  ];
  for (const [obtido, esperado] of casos) assert.equal(obtido, esperado);
});

test('versão do rodapé: publicada ou local', () => {
  assert.equal(textoDaVersao({ versao: 'v0.1.0', data: '30/09/2026', commit: '5f4e44c' }), 'v0.1.0 · 30/09/2026');
  assert.equal(textoDaVersao({ versao: '', data: '', commit: '' }), 'versão local (desenvolvimento)');
});

test('escaparHtml neutraliza texto vindo da planilha', () => {
  assert.equal(escaparHtml(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
  assert.equal(escaparHtml(null), '');
});
