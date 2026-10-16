import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPlanilha } from '../../js/nucleo/normalizacao.js';
import { agregar, completarPonto } from '../../js/nucleo/agregacao.js';
import { agruparPontos, projetar } from '../../js/nucleo/agrupamentoMapa.js';
import { linhasDeExemplo } from '../fixtures/planilhas.js';

const { pontos, locais } = agregar(normalizarPlanilha(linhasDeExemplo()).registros);
const AGRUPAMENTO = { raio: 40, zoomIndividual: 14 };
const resumo = grupos => grupos.map(g => [g.total, g.pontos.length]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);

test('pontos do mapa: um por coordenada, sem olhar a referência em texto', () => {
  // "3,73 km de POSTO LETICIA" e "9.88 km de POSTO LETICIA" são o mesmo local na tabela, mas dois pontos no mapa
  assert.equal(locais.find(l => l.local === 'POSTO LETICIA - CASCAVEL/PR').total, 8);
  assert.deepEqual(pontos.map(completarPonto).map(p => [p.local, p.total, p.lat, p.lon]), [
    ['RECIFE - PE', 10, -8.05, -34.9],
    ['0,31 km de CD CAJAMAR - CAJAMAR/SP', 8, -23.35, -46.87],
    ['3,73 km de POSTO LETICIA - CASCAVEL/PR', 7, -24.89564, -53.42362],
    ['9.88 km de POSTO LETICIA - CASCAVEL/PR', 1, -24.90254, -53.43518]
  ]);
  assert.equal(pontos.reduce((s, p) => s + p.eventos.length, 0), 26, 'o evento sem coordenada fica fora');
});

test('mesma coordenada com referências diferentes é um ponto só', () => {
  const [cabecalho, ...resto] = linhasDeExemplo();
  const iRef = cabecalho.indexOf('referencia');
  const linhas = [cabecalho, ...resto.map((l, i) => l.length > iRef && l[iRef] === 'RECIFE - PE' && i % 2 ? Object.assign([...l], { [iRef]: '0,10 km de PORTO DO RECIFE' }) : l)];
  const recife = agregar(normalizarPlanilha(linhas).registros).pontos.filter(p => p.lat === -8.05).map(completarPonto);
  assert.equal(recife.length, 1);
  assert.equal(recife[0].total, 10);
  assert.equal(recife[0].referencias.size, 2);
});

test('projeção igual à do Leaflet (Web Mercator, tiles de 256 px)', () => {
  assert.deepEqual(projetar(0, 0, 0), [128, 128]);
  const [x, y] = projetar(-23.35, -46.87, 10);
  assert.ok(Math.abs(x - 96942.31) < 0.01 && Math.abs(y - 148566.14) < 0.01, `${x}, ${y}`);
});

test('agrupamento: afastado junta pontos próximos, aproximado mostra cada coordenada', () => {
  // zoom 4 (Brasil inteiro): Cascavel (2 pontos a ~1,4 km) e Cajamar ficam a mais de 40 px; Recife longe de todos
  assert.deepEqual(resumo(agruparPontos(pontos, 4, AGRUPAMENTO)), [[10, 1], [8, 2], [8, 1]]);
  assert.deepEqual(resumo(agruparPontos(pontos, 2, AGRUPAMENTO)), [[16, 3], [10, 1]]);
  // zoom 12: os dois pontos de Cascavel ficam a ~40 px um do outro; no 13, a ~80 px
  assert.deepEqual(resumo(agruparPontos(pontos, 10, AGRUPAMENTO)), [[10, 1], [8, 2], [8, 1]]);
  assert.deepEqual(resumo(agruparPontos(pontos, 13, AGRUPAMENTO)), [[10, 1], [8, 1], [7, 1], [1, 1]]);
  assert.equal(agruparPontos(pontos, 14, { raio: 1e9, zoomIndividual: 14 }).length, 4, 'a partir do zoom individual, nunca agrupa');
});

test('grupo fica na média das coordenadas ponderada pelos eventos e nasce no maior ponto', () => {
  const cascavel = agruparPontos(pontos, 4, AGRUPAMENTO).find(g => g.pontos.length === 2);
  assert.equal(cascavel.pontos[0].total, 7);
  assert.ok(Math.abs(cascavel.lat - (-24.89564 * 7 + -24.90254) / 8) < 1e-9);
  assert.ok(Math.abs(cascavel.lon - (-53.42362 * 7 + -53.43518) / 8) < 1e-9);
});

test('agrupamento cobre todos os pontos uma única vez, com volume', () => {
  const muitos = Array.from({ length: 20000 }, (_, i) => ({ lat: -30 + (i % 150) / 10, lon: -55 + (i / 150 | 0) / 10, total: 1 + (i % 7) }))
    .sort((a, b) => b.total - a.total);
  for (const zoom of [3, 6, 9, 12]) {
    const grupos = agruparPontos(muitos, zoom, AGRUPAMENTO);
    const membros = grupos.flatMap(g => g.pontos);
    assert.equal(membros.length, muitos.length);
    assert.equal(new Set(membros).size, muitos.length);
    assert.equal(grupos.reduce((s, g) => s + g.total, 0), muitos.reduce((s, p) => s + p.total, 0));
  }
});
