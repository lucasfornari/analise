import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPlanilha } from '../../js/nucleo/normalizacao.js';

const CABECALHO = ['Cliente', 'Viagem', 'Placa', 'Motorista', 'Perfil', 'Exceções', 'Data Exceção', 'Latitude', 'Longitude', 'Referência', 'Classe'];
const linha = (cliente, exc, extra = {}) => [cliente, extra.viagem ?? '1', extra.placa ?? 'ABC-1234', extra.motorista ?? 'Ana',
  extra.perfil ?? 'Ouro', exc, extra.data ?? '10/01/2026 08:00', extra.lat ?? '-23,5', extra.lon ?? '-46,6', extra.ref ?? '1 km de Santos', extra.classe ?? ''];

test('erro claro quando falta o cabeçalho ou coluna obrigatória', () => {
  assert.throws(() => normalizarPlanilha([['a', 'b']]), /Não encontrei o cabeçalho/);
  assert.throws(() => normalizarPlanilha([['Cliente', 'Exceções']]), /Colunas obrigatórias ausentes: data/);
});

test('gera registros e estatísticas de leitura', () => {
  const { registros, estatisticas } = normalizarPlanilha([
    ['Título'], CABECALHO,
    linha('Alfa Ltda', 'Violação de baú', { classe: 'Veículo' }),
    linha('ALFA LTDA.', 'Violação de baú', { classe: 'Veículo' }),      // duplicado exato
    linha('Beta', 'Final de viagem fora do raio', { lat: '0', lon: '0', perfil: '-', viagem: '2' }),
    linha('Gama', 'Alerta de painel', { data: 'sem data', lat: '', viagem: '3' }),
    [null, null], ['', 'rodapé do BI']
  ]);
  assert.deepEqual(estatisticas, { lidas: 5, vazias: 1, descartadas: 1, semData: 1, semCoord: 2, duplicadas: 1, classeDeduzida: 2, validas: 4 });

  const [alfa, alfaDup, beta, gama] = registros;
  assert.equal(alfaDup.cliente, 'Alfa Ltda', 'grafias diferentes viram o primeiro rótulo visto');
  assert.equal(alfa.dup, false);
  assert.equal(alfaDup.dup, true);
  assert.deepEqual([alfa.classe, alfa.tipo, alfa.placa, alfa.local, alfa.mes, alfa.dia], ['EQ', 'Baú', 'ABC1234', 'Santos', '2026-01', '2026-01-10']);
  assert.deepEqual([alfa.lat, alfa.lon], [-23.5, -46.6]);
  assert.deepEqual([beta.classe, beta.lat, beta.perfil], ['FV', null, '(sem perfil)'], '0,0 não é coordenada');
  assert.deepEqual([gama.classe, gama.csTipo, gama.data, gama.mes], ['CS', 'Alertas de painel', null, null]);
});

test('viagem numérica perde o ".0" do Excel', () => {
  const { registros } = normalizarPlanilha([CABECALHO, linha('A', 'x', { viagem: '123.0' })]);
  assert.equal(registros[0].viagem, '123');
});
