import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localizarCabecalho, mapearColunas } from '../../js/nucleo/colunas.js';
import { classificar, tipoDoEvento, composicaoCS, localDaReferencia, classeDoTipo, TIPOS } from '../../js/nucleo/classificacao.js';

test('localizarCabecalho pula linhas de título', () => {
  assert.equal(localizarCabecalho([['Relatório'], [], ['Cliente', 'Exceções']]), 2);
  assert.equal(localizarCabecalho([['A', 'B']]), -1);
});

test('mapearColunas: nome exato tem prioridade, depois prefixo', () => {
  const c = mapearColunas(['Cliente', 'Cód. Viagem', 'Exceções', 'Data Exceção', 'Latitude (graus)', 'Perfil de Segurança']);
  assert.equal(c.cliente, 0);
  assert.equal(c.viagem, 1);
  assert.equal(c.excecao, 2);
  assert.equal(c.data, 3);
  assert.equal(c.lat, 4, 'por prefixo');
  assert.equal(c.perfil, 5);
  assert.equal(c.placa, -1);
});

test('mapearColunas: data só por nome exato', () => {
  assert.equal(mapearColunas(['Data Exceção Original']).data, -1);
});

test('classificar usa a coluna Classe e, sem ela, deduz pela exceção', () => {
  assert.equal(classificar('Contexto suspeito', 'x'), 'CS');
  assert.equal(classificar('Motorista', 'x'), 'FV');
  assert.equal(classificar('Veículo', 'x'), 'EQ');
  assert.equal(classificar('', 'Alerta de painel'), 'CS');
  assert.equal(classificar(null, 'Final de viagem fora do raio'), 'FV');
  assert.equal(classificar('', 'Antena violada'), 'EQ');
});

test('tipoDoEvento detalha equipamento e fim de viagem', () => {
  assert.equal(tipoDoEvento('EQ', 'Violação de baú'), 'Baú');
  assert.equal(tipoDoEvento('EQ', 'Desengate de carreta'), 'Desengate');
  assert.equal(tipoDoEvento('EQ', 'Painel violado'), 'Painel');
  assert.equal(tipoDoEvento('EQ', 'Bateria'), 'Equip. outros');
  assert.equal(tipoDoEvento('FV', 'Final de viagem fora do raio'), 'FV fora do raio');
  assert.equal(tipoDoEvento('FV', 'Entrega pendente'), 'FV entrega pendente');
  assert.equal(tipoDoEvento('FV', 'Final de viagem não informado'), 'FV não informada');
  assert.equal(tipoDoEvento('FV', 'Outro'), 'FV outros');
  assert.equal(tipoDoEvento('CS', 'qualquer'), 'Contexto suspeito');
  for (const t of TIPOS) assert.ok(['EQ', 'FV', 'CS'].includes(classeDoTipo(t)));
});

test('composicaoCS identifica os alertas combinados', () => {
  assert.equal(composicaoCS('Desengate + valor da SM'), 'Desengate + valor SM');
  assert.equal(composicaoCS('Alerta + perda de sinal'), 'Alerta + perda de sinal');
  assert.equal(composicaoCS('Parada proibida'), 'Parada proibida + violação');
  assert.equal(composicaoCS('Alertas de painel'), 'Alertas de painel');
  assert.equal(composicaoCS('?'), 'Outros');
});

test('localDaReferencia remove a distância', () => {
  assert.equal(localDaReferencia('2,5 km de Campinas - SP'), 'Campinas - SP');
  assert.equal(localDaReferencia('Recife - PE'), 'Recife - PE');
  assert.equal(localDaReferencia(''), '(sem referência)');
});
