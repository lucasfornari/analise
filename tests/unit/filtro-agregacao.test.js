import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrar } from '../../js/nucleo/filtro.js';
import { agregar, contarPor } from '../../js/nucleo/agregacao.js';

const r = (cliente, classe, extra = {}) => ({
  cliente, classe, excecao: 'E-' + classe, perfil: 'P1', placa: 'ABC1234', carreta: '', motorista: 'Ana',
  tipo: classe === 'CS' ? 'Contexto suspeito' : classe === 'FV' ? 'FV outros' : 'Baú', csTipo: classe === 'CS' ? 'Outros' : null,
  dia: '2026-01-10', mes: '2026-01', local: 'Santos', lat: -23, lon: -46, viagem: 'V1', tecnologia: 'X', dup: false, ...extra
});

const base = [
  r('Alfa', 'EQ'), r('Alfa', 'EQ', { dup: true }), r('Alfa', 'CS', { dia: '2026-02-01', mes: '2026-02' }),
  r('Beta', 'FV', { placa: 'XYZ9K88', motorista: 'Bia', local: 'Recife', lat: null, lon: null }),
  r('Gama', 'EQ', { placa: '', carreta: 'CAR1A11', perfil: 'P2' })
];

test('filtrar combina período, classe, listas, placa/carreta e duplicados', () => {
  assert.equal(filtrar(base, {}).length, 5);
  assert.equal(filtrar(base, { de: '2026-02-01' }).length, 1);
  assert.equal(filtrar(base, { ate: '2026-01-31' }).length, 4);
  assert.equal(filtrar(base, { classes: new Set(['EQ']) }).length, 3);
  assert.equal(filtrar(base, { clientes: new Set(['Beta']) }).length, 1);
  assert.equal(filtrar(base, { perfis: new Set(['P2']) }).length, 1);
  assert.equal(filtrar(base, { placa: 'car-1a' }).length, 1, 'busca também na carreta');
  assert.equal(filtrar(base, { semDuplicados: true }).length, 4);
});

test('filtrar com "ignorar" desconsidera a própria lista (contagem facetada)', () => {
  const f = { clientes: new Set(['Beta']), excecoes: new Set(['E-EQ']) };
  assert.equal(filtrar(base, f).length, 0);
  assert.equal(filtrar(base, f, 'cli').length, 3);
  assert.equal(filtrar(base, f, 'exc').length, 1);
});

test('agregar: totais, Pareto e top 3', () => {
  const a = agregar(base);
  assert.deepEqual([a.n, a.EQ, a.FV, a.CS, a.nClientes, a.geo], [5, 3, 1, 1, 3, 4]);
  assert.deepEqual(a.clientes.map(c => [c.cliente, c.total, c.rank]), [['Alfa', 3, 1], ['Beta', 1, 2], ['Gama', 1, 3]]);
  assert.equal(a.clientes[1].acum, 0.8);
  assert.equal(a.top3pct, 1);
  assert.deepEqual(a.meses, ['2026-01', '2026-02']);
  assert.deepEqual(a.mesClasse[0], { mes: '2026-01', EQ: 3, FV: 1, CS: 0, total: 4 });
});

test('agregar: placas ignoram FV e motoristas só contam FV', () => {
  const a = agregar(base);
  assert.deepEqual(a.placas.map(p => [p.placa, p.total, p.nViagens]), [['ABC1234', 3, 1]]);
  assert.deepEqual(a.motoristas.map(m => [m.motorista, m.total, m.topLocal]), [['Bia', 1, 'Recife']]);
});

test('agregar: locais com coordenada média', () => {
  const santos = agregar(base).locais.find(l => l.local === 'Santos');
  assert.deepEqual([santos.total, santos.nc, santos.lat, santos.nCli], [4, 4, -23, 2]);
  assert.equal(agregar(base).locais.find(l => l.local === 'Recife').lat, null);
});

test('agregar e contarPor com lista vazia', () => {
  const a = agregar([]);
  assert.deepEqual([a.n, a.top3pct, a.clientes.length], [0, 0, 0]);
  assert.equal(contarPor([{ k: '' }, { k: null }, { k: 'a' }], x => x.k).size, 1);
});
