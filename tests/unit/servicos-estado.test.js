import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import XLSX from 'xlsx';
import { LeitorPlanilha } from '../../js/servicos/LeitorPlanilha.js';
import { Estado } from '../../js/estado/Estado.js';
import { gerarCsv } from '../../js/nucleo/exportacao.js';

const fixture = nome => new Uint8Array(readFileSync(new URL('../fixtures/' + nome, import.meta.url)));
const leitor = new LeitorPlanilha(XLSX);

test('LeitorPlanilha: CSV e XLSX da fixture dão o mesmo resultado', () => {
  const csv = leitor.lerBytes('excecoes.csv', fixture('excecoes.csv'));
  const xlsx = leitor.lerBytes('excecoes.xlsx', fixture('excecoes.xlsx'));
  assert.equal(xlsx.aba, 'Dados', 'pula a aba sem cabeçalho');
  assert.equal(csv.registros.length, 37);
  assert.deepEqual(csv.estatisticas, xlsx.estatisticas);
  assert.deepEqual(csv.registros.map(r => [r.cliente, r.classe, r.dia, r.lat]), xlsx.registros.map(r => [r.cliente, r.classe, r.dia, r.lat]));
});

test('LeitorPlanilha: CSV em Windows-1252 (Excel BR)', () => {
  const latin1 = Uint8Array.from('Cliente;Exceções;Data Exceção\r\nJoão;Violação de baú;01/02/2026', c => c.charCodeAt(0));
  const { registros } = leitor.lerBytes('x.csv', latin1);
  assert.equal(registros[0].cliente, 'João');
  assert.equal(registros[0].tipo, 'Baú');
});

test('LeitorPlanilha: erros de arquivo inválido ou sem linhas', () => {
  assert.throws(() => leitor.lerBytes('invalida.csv', fixture('invalida.csv')), /Não encontrei o cabeçalho/);
  const soCabecalho = new TextEncoder().encode('Cliente;Exceções;Data Exceção\r\n');
  assert.throws(() => leitor.lerBytes('vazia.csv', soCabecalho), /Nenhuma linha válida/);
});

test('Estado: selecionar tudo equivale a não filtrar', () => {
  const estado = new Estado();
  estado.carregar(leitor.lerBytes('excecoes.csv', fixture('excecoes.csv')), 'excecoes.csv');
  assert.deepEqual([estado.meta.inicio, estado.meta.fim, estado.meta.meses.length], ['2026-01-01', '2026-03-27', 3]);
  const f = estado.filtroAtual();
  assert.deepEqual([f.classes, f.clientes, f.excecoes, f.perfis], [null, null, null, null]);
  estado.recalcular();
  assert.equal(estado.agregado.n, 37);
});

test('Estado: alternarUnico isola e desfaz', () => {
  const estado = new Estado();
  estado.carregar(leitor.lerBytes('excecoes.csv', fixture('excecoes.csv')), 'excecoes.csv');
  estado.alternarUnico('cli', 'Gama Cargas');
  assert.equal(estado.unicoSelecionado('cli'), 'Gama Cargas');
  estado.recalcular();
  assert.equal(estado.filtrados.length, 9);
  estado.alternarUnico('cli', 'Gama Cargas');
  assert.equal(estado.selecao.cli.size, 4);
  assert.equal(estado.unicoSelecionado('cli'), null);
});

test('gerarCsv: BOM, ";" e vírgula decimal, com escape de aspas', () => {
  const csv = gerarCsv([{ cliente: 'A; "B"', classe: 'CS', lat: -23.5, lon: null, data: new Date(2026, 0, 2, 3, 4, 5) }]);
  assert.ok(csv.startsWith('﻿cliente;perfil;'));
  const [, linha] = csv.slice(1).split('\r\n');
  const celulas = linha.split(';');
  assert.equal(linha.split('"A; ""B"""').length, 2, 'valor com ; e aspas vai entre aspas');
  assert.ok(celulas.includes('Contexto suspeito'));
  assert.ok(celulas.includes('-23,5'));
  assert.ok(linha.includes('02/01/2026'));
});
