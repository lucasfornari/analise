// Longitude dobrada no export do BI: corrigida sem perder precisão, sem mexer em pontos legítimos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corrigirLongitude, ufDaReferencia } from '../../js/nucleo/coordenadas.js';
import { normalizarPlanilha } from '../../js/nucleo/normalizacao.js';
import { CABECALHO, linhasDeExemplo } from '../fixtures/planilhas.js';

test('UF pelo final da referência', () => {
  assert.equal(ufDaReferencia('0.01 km de POSTO CARRETÃO 02 - PONTE SERRADA/SC'), 'SC');
  assert.equal(ufDaReferencia('0.14 km de KIO SERVICE PLAZA - LIMA/PE'), 'PE');   // Peru também termina em /PE
  assert.equal(ufDaReferencia('ESTACIÓN DE SERVICIO UBAJAY - UBAJAY/AR'), null);  // Argentina
  assert.equal(ufDaReferencia(''), null);
});

test('longitude dobrada volta ao lugar, com a mesma precisão (casos do export real)', () => {
  const casos = [
    [-26.9175, -103.779, 'SC', -51.8895],      // Ponte Serrada/SC (estava no Pacífico)
    [-18.801, -88.9314, 'MG', -44.4657],       // Curvelo/MG
    [-3.862233, -77.067864, 'CE', -38.533932], // Fortaleza/CE (estava no Peru, em terra)
    [-9.9858, -73.143, 'AL', -36.5715],        // São Sebastião/AL (estava no Acre)
    [-10.0705, -135.1644, 'AC', -67.5822],     // Senador Guiomard/AC
    [-31.7963, -116.6368, null, -58.3184]      // Ubajay/AR: sem UF, mas no Pacífico
  ];
  for (const [lat, lon, uf, certo] of casos) assert.deepEqual(corrigirLongitude(lat, lon, uf), { lon: certo, corrigida: true }, `${lat}, ${lon}`);
});

test('pontos legítimos não mudam', () => {
  const casos = [
    [-12.2539, -76.9293, 'PE'],      // Lima, no Peru ("/PE" não é Pernambuco)
    [-14.5672, -75.2091, 'PE'],      // Ica, no Peru
    [-26.9188, -51.8865, 'SC'],      // Ponte Serrada/SC certo
    [-8.05, -34.9, 'PE'],            // Recife
    [-31.7963, -58.3184, null],      // Argentina certa
    [-9.4234, -36.6215, 'RO'],       // referência com UF errada no cadastro, mas coordenada válida em AL
    [19.43, -99.13, null]            // hemisfério norte (México): a regra do Pacífico vale só no sul
  ];
  for (const [lat, lon, uf] of casos) assert.deepEqual(corrigirLongitude(lat, lon, uf), { lon, corrigida: false }, `${lat}, ${lon}`);
});

test('normalização aplica a correção e conta em "Qualidade da leitura"', () => {
  const [cabecalho, primeira] = linhasDeExemplo();
  const coluna = nome => CABECALHO.indexOf(nome);
  const dobrada = Object.assign([...primeira], { [coluna('latitude')]: -26.9175, [coluna('longitude')]: -103.779,
    [coluna('referencia')]: '0.01 km de POSTO CARRETÃO 02 - PONTE SERRADA/SC' });
  const { registros, estatisticas } = normalizarPlanilha([cabecalho, primeira, dobrada]);
  assert.deepEqual([registros[1].lat, registros[1].lon], [-26.9175, -51.8895]);
  assert.equal(registros[0].lon, -53.42362, 'linha certa intacta');
  assert.equal(estatisticas.coordCorrigidas, 1);
});
