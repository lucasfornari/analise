import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, zipSync, strToU8 } from 'fflate';
import XLSX from 'xlsx';
import { abrirXlsx } from '../../js/servicos/leitorXlsx.js';
import { lerPlanilha } from '../../js/servicos/lerPlanilha.js';
import { linhasDeExemplo, xlsxDoExport, xlsxDoExcel, csvDoExport, ESPERADO, CABECALHO } from '../fixtures/planilhas.js';

const pelaSheetJs = (bytes, aba) => {
  const livro = XLSX.read(bytes, { type: 'array', dense: true });
  return XLSX.utils.sheet_to_json(livro.Sheets[aba ?? livro.SheetNames[0]], { header: 1, raw: true, defval: null, blankrows: false });
};
const dependencias = { unzipSync, carregarSheetJs: async () => XLSX };

test('leitor rápido lê igual ao SheetJS (export do BI e arquivo salvo pelo Excel)', () => {
  const textos = [['Cliente', 'Exceções', 'Nota'], ['A & B <ltda>', 'Violação "baú"', 'linha 1\r\nlinha 2'], ['ÁÉÍÕÇ 😀', '', 'x_x000D_y']];
  for (const bytes of [xlsxDoExport(linhasDeExemplo()), xlsxDoExcel(linhasDeExemplo()), xlsxDoExport(textos), xlsxDoExcel(textos)]) {
    const [aba] = abrirXlsx(bytes, unzipSync).slice(-1);
    assert.deepEqual(aba.linhas(), pelaSheetJs(bytes, aba.nome));
  }
});

test('leitor rápido: células esparsas com referência, abas em ordem e arquivo que não é zip', () => {
  const esparsa = XLSX.utils.aoa_to_sheet([[1]]);
  Object.assign(esparsa, { C1: { t: 's', v: 'c' }, A3: { t: 'b', v: true }, D3: { t: 'n', v: 2.5 }, '!ref': 'A1:D3' });
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet([['capa']]), 'Capa');
  XLSX.utils.book_append_sheet(livro, esparsa, 'Esparsa');
  const bytes = new Uint8Array(XLSX.write(livro, { type: 'array', bookType: 'xlsx', bookSST: true }));
  const abas = abrirXlsx(bytes, unzipSync);
  assert.deepEqual(abas.map(a => a.nome), ['Capa', 'Esparsa']);
  assert.deepEqual(abas[1].linhas(), pelaSheetJs(bytes, 'Esparsa'));
  assert.equal(abrirXlsx(new TextEncoder().encode('a;b'), unzipSync), null);
  assert.equal(abrirXlsx(zipSync({ 'x.txt': strToU8('oi') }), unzipSync), null, 'zip sem workbook');
});

test('lerPlanilha: os três formatos chegam ao mesmo resultado', async () => {
  const casos = [
    ['export.xlsx', xlsxDoExport(linhasDeExemplo()), 'rápido', 'Export'],
    ['salvo-no-excel.xlsx', xlsxDoExcel(linhasDeExemplo(), [['Capa', [['sem cabeçalho']]]]), 'rápido', 'Dados'],
    ['export.csv', csvDoExport(linhasDeExemplo()), 'SheetJS', 'Sheet1']
  ];
  const resumos = [];
  for (const [nome, bytes, leitor, aba] of casos) {
    const r = await lerPlanilha(nome, bytes, dependencias);
    assert.deepEqual([r.leitor, r.aba, r.registros.length], [leitor, aba, ESPERADO.eventos], nome);
    resumos.push(r.registros.map(x => [x.cliente, x.excecao, x.classe, x.data.getTime(), x.placa, x.lat, x.local, x.viagem]));
  }
  assert.deepEqual(resumos[1], resumos[0]);
  assert.deepEqual(resumos[2], resumos[0]);
});

test('lerPlanilha: CSV em Windows-1252 (Excel BR), .xls pelo SheetJS e mensagens de erro', async () => {
  const latin1 = Uint8Array.from('Cliente;Exceções;Data Exceção\r\nJoão;Violação porta baú;01/02/2026', c => c.charCodeAt(0));
  const csv = await lerPlanilha('x.csv', latin1, dependencias);
  assert.deepEqual([csv.registros[0].cliente, csv.registros[0].excecao], ['João', 'VIOLACAO PORTA BAU']);

  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(linhasDeExemplo()), 'X');
  const lido = await lerPlanilha('antigo.xls', new Uint8Array(XLSX.write(livro, { type: 'array', bookType: 'biff8' })), dependencias);
  assert.deepEqual([lido.leitor, lido.registros.length], ['SheetJS', ESPERADO.eventos]);

  const erros = [
    ['a.csv', new TextEncoder().encode('coluna A;coluna B\r\n1;2'), /Não encontrei o cabeçalho/],
    ['b.csv', new TextEncoder().encode('Cliente;Exceções\r\nA;B'), /Colunas obrigatórias ausentes: data/],
    ['c.xlsx', xlsxDoExport([CABECALHO]), /Nenhuma linha válida/]
  ];
  for (const [nome, bytes, mensagem] of erros) await assert.rejects(lerPlanilha(nome, bytes, dependencias), mensagem, nome);
});
