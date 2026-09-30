import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPlanilha, localDaReferencia } from '../../js/nucleo/normalizacao.js';
import { localizarCabecalho, mapearColunas } from '../../js/nucleo/colunas.js';
import { linhasDeExemplo, ESPERADO, CABECALHO } from '../fixtures/planilhas.js';

const { registros, estatisticas } = normalizarPlanilha(linhasDeExemplo());
const acharPor = (campo, valor) => registros.filter(r => r[campo] === valor);

test('cabeçalho e colunas do export (inclusive as novas)', () => {
  assert.equal(localizarCabecalho([['Relatório'], [], CABECALHO]), 2);
  assert.equal(localizarCabecalho([['A', 'B']]), -1);
  const c = mapearColunas(CABECALHO);
  const esperado = { cliente: 3, viagem: 4, fimViagem: 5, filial: 6, vinculo: 7, placa: 8, carreta: 9, motorista: 10, proprietario: 11,
    tecnologia: 12, perfil: 13, produto: 14, seguradora: 2, corretora: 1, excecao: 15, data: 16, lat: 17, lon: 18, referencia: 19, classe: 20 };
  assert.deepEqual(c, esperado);
  assert.equal(mapearColunas(['Data Exceção Original']).data, -1, 'data só por nome exato');
});

test('estatísticas da leitura', () => {
  assert.deepEqual(
    [estatisticas.validas, estatisticas.duplicadas, estatisticas.descartadas, estatisticas.semCoord, estatisticas.classeCorrigida,
      estatisticas.naoCatalogadas, estatisticas.placasForaDoPadrao, estatisticas.semData],
    [ESPERADO.eventos, ESPERADO.duplicados, 2, 1, ESPERADO.classeCorrigida, ESPERADO.naoCatalogadas, ESPERADO.placasForaDoPadrao, 0]);
  assert.deepEqual(estatisticas.excecoesNaoCatalogadas, [{ nome: 'EXCECAO NOVA DE TESTE', n: 1 }]);
});

test('normalização de nomes, placas, perfis, locais e SM', () => {
  assert.equal(new Set(registros.map(r => r.cliente)).size, ESPERADO.clientes, '"Transportes Alfa Ltda." unificado');
  assert.equal(acharPor('motorista', 'MARIA SOUZA')[0].cliente, 'TRANSPORTES ALFA LTDA');
  assert.ok(acharPor('motorista', 'MARIA SOUZA').every(r => r.placa === 'DEF4567'), 'placa sem hífen');
  assert.equal(acharPor('placa', 'ABC1D23')[0].carreta, 'MJI7358');
  assert.ok(acharPor('cliente', 'GAMA CARGAS').every(r => r.perfil === '(sem perfil)'), '"-" vira sem perfil');
  assert.equal(new Set(acharPor('motorista', 'JOÃO DA SILVA').filter(r => r.excecao.startsWith('VELOCIDADE')).map(r => r.local)).size, 1,
    '"3,73 km de" e "9.88 km de" o mesmo local');
  assert.equal(localDaReferencia(''), '(sem referência)');
  const r = registros[0];
  assert.deepEqual([r.viagem, r.seguradora, r.corretora, r.vinculo, r.tecnologia, r.produto], ['5001', 'YELUM SEGUROS S.A', '41 CORRETORA DE SEGUROS', 'Frota', 'SASCAR', '02071419 - OUTROS']);
  assert.equal(r.fimViagem.getDate(), 28);
});

test('classe e grupo vêm do catálogo; fora dele, da planilha', () => {
  const classes = Object.fromEntries(['TEMPO DE PARADA EXCEDIDO', 'BOTAO DE PANICO', 'ISCA ESTÁ DISTANTE DO VEÍCULO', 'EXCECAO NOVA DE TESTE']
    .map(e => [e, acharPor('excecao', e).map(r => `${r.classe}/${r.grupo}`)[0]]));
  assert.deepEqual(classes, {
    'TEMPO DE PARADA EXCEDIDO': 'MOTORISTA/PARADA', 'BOTAO DE PANICO': 'MOTORISTA/PANICO',
    'ISCA ESTÁ DISTANTE DO VEÍCULO': 'VEICULO/ISCA_LOCALIZADOR', 'EXCECAO NOVA DE TESTE': 'VEICULO/NAO_CATALOGADA'
  });
});

test('duplicado exato: mesma SM, exceção, data e placa', () => {
  const dup = registros.filter(r => r.dup);
  assert.equal(dup.length, 1);
  assert.deepEqual([dup[0].viagem, dup[0].excecao, dup[0].data.getHours()], ['5003', 'VELOCIDADE EXCEDIDA FAIXA 1', 9]);
});

test('erros com mensagem para o usuário', () => {
  assert.throws(() => normalizarPlanilha([['a', 'b']]), /Não encontrei o cabeçalho/);
  assert.throws(() => normalizarPlanilha([['Cliente', 'Exceções']]), /Colunas obrigatórias ausentes: data/);
});
