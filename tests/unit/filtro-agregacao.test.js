import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPlanilha } from '../../js/nucleo/normalizacao.js';
import { filtrar, filtrarComFacetas, CAMPO_DA_LISTA } from '../../js/nucleo/filtro.js';
import { agregar, contarPor, mesAnterior, variacaoMensal, reincidencia } from '../../js/nucleo/agregacao.js';
import { linhasDeExemplo, ESPERADO } from '../fixtures/planilhas.js';

const { registros } = normalizarPlanilha(linhasDeExemplo());
const semFiltro = { listas: {} };

test('filtrar combina período, classe, placa/carreta, duplicados e listas', () => {
  const casos = [
    [{}, 27],
    [{ de: '2026-09-01' }, 17],
    [{ ate: '2026-07-31' }, 4],
    [{ classes: new Set(['CONTEXTO']) }, 2],
    [{ placa: 'mji-73' }, 12],                                              // busca na carreta
    [{ semDuplicados: true }, 26],
    [{ listas: { cli: new Set(['GAMA CARGAS']) } }, 6],
    [{ listas: { cli: new Set(['GAMA CARGAS']), pla: new Set(['JKL0M12']) } }, 5],
    [{ de: '2026-09-01', classes: new Set(['MOTORISTA']), listas: { mot: new Set(['JOÃO DA SILVA', 'ANA COSTA']) } }, 7]
  ];
  for (const [filtro, esperado] of casos) assert.equal(filtrar(registros, { listas: {}, ...filtro }).length, esperado, JSON.stringify(filtro, (k, v) => v instanceof Set ? [...v] : v));
});

// Contagem facetada ingênua: um filtro completo por lista, ignorando a própria lista.
function facetasIngenuas(filtro) {
  return Object.fromEntries(Object.entries(CAMPO_DA_LISTA).map(([lista, campo]) =>
    [lista, contarPor(filtrar(registros, { ...filtro, listas: { ...filtro.listas, [lista]: null } }), r => r[campo])]));
}

test('passada única de filtro + facetas é igual ao cálculo ingênuo (200 combinações aleatórias)', () => {
  let s = 7;
  const aleatorio = () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const valores = Object.fromEntries(Object.entries(CAMPO_DA_LISTA).map(([l, c]) => [l, [...new Set(registros.map(r => r[c]).filter(Boolean))]]));
  const talvez = gerar => aleatorio() < 0.5 ? gerar() : null;
  for (let i = 0; i < 200; i++) {
    const filtro = {
      de: aleatorio() < 0.3 ? '2026-08-01' : '', ate: aleatorio() < 0.3 ? '2026-09-10' : '',
      classes: talvez(() => new Set(['MOTORISTA', 'VEICULO', 'CONTEXTO'].filter(() => aleatorio() < 0.6))),
      semDuplicados: aleatorio() < 0.3, placa: aleatorio() < 0.15 ? 'jk' : '',
      listas: Object.fromEntries(Object.keys(CAMPO_DA_LISTA).map(l => [l, talvez(() => new Set(valores[l].filter(() => aleatorio() < 0.5)))]))
    };
    const { filtrados, facetas } = filtrarComFacetas(registros, filtro);
    assert.deepEqual(filtrados, filtrar(registros, filtro), `filtrados #${i}`);
    assert.deepEqual(facetas, facetasIngenuas(filtro), `facetas #${i}`);
  }
});

test('facetas deixam o filtro dinâmico: escolher um cliente restringe motoristas e placas', () => {
  const { facetas } = filtrarComFacetas(registros, { listas: { cli: new Set(['BETA LOGÍSTICA S/A']) } });
  assert.deepEqual([...facetas.mot.keys()], ['PEDRO LIMA']);
  assert.deepEqual([...facetas.pla.keys()], ['GHI7J89']);
  assert.equal(facetas.cli.get('GAMA CARGAS'), 6, 'a própria lista continua mostrando as outras opções');
});

test('agregar: totais, classes, meses, grupos e variação do total', () => {
  const a = agregar(registros);
  assert.deepEqual([a.n, a.MOTORISTA, a.VEICULO, a.CONTEXTO, a.nClientes, a.geo],
    [ESPERADO.eventos, ESPERADO.classes.MOTORISTA, ESPERADO.classes.VEICULO, ESPERADO.classes.CONTEXTO, ESPERADO.clientes, ESPERADO.georreferenciados]);
  assert.deepEqual(Object.fromEntries(a.mesClasse.map(m => [m.mes, m.total])), ESPERADO.porMes);
  assert.equal(a.grupos.get('VELOCIDADE'), 11);
  assert.deepEqual(a.variacao, { atual: 17, anterior: 6, diferenca: 11, pct: 11 / 6 });
  assert.equal(a.excecoes[0].excecao, 'VELOCIDADE EXCEDIDA FAIXA 1');
  assert.equal(a.locais.length, ESPERADO.locais);
  assert.deepEqual(a.locais.find(l => l.local === 'POSTO LETICIA - CASCAVEL/PR').eventos.length, 8);
});

test('agregar: clientes com Pareto, participação no mês e variação mensal', () => {
  const [alfa, gama] = agregar(registros).clientes;
  assert.deepEqual([alfa.cliente, alfa.total, alfa.rank, alfa.m], ['TRANSPORTES ALFA LTDA', 16, 1, { '2026-07': 4, '2026-08': 4, '2026-09': 8 }]);
  assert.equal(alfa.pctMes['2026-07'], 1, 'único cliente em julho');
  assert.equal(alfa.pctMes['2026-09'], 8 / 17);
  assert.deepEqual(alfa.variacao, { atual: 8, anterior: 4, diferenca: 4, pct: 1 });
  assert.deepEqual([gama.cliente, gama.variacao.pct], ['GAMA CARGAS', null], 'sem eventos no mês anterior: variação sem percentual');
});

test('agregar: placas ignoram exceções de motorista e motoristas só contam as de motorista', () => {
  const a = agregar(registros);
  // pânico do Pedro e isca da Ana foram reclassificados pelo catálogo
  assert.deepEqual(a.placas.map(p => [p.placa, p.total]), [['GHI7J89', 3], ['JKL0M12', 3], ['ABC1D23', 2], ['DEF4567', 1], ['XX123', 1]]);
  assert.deepEqual(a.motoristas.map(m => [m.motorista, m.total]), [['JOÃO DA SILVA', 10], ['MARIA SOUZA', 3], ['ANA COSTA', 2], ['PEDRO LIMA', 2]]);
});

test('reincidência mês a mês: só meses de calendário seguidos contam', () => {
  const { motoristas, placas } = agregar(registros).reincidencia;
  assert.deepEqual(motoristas.lista.map(e => [e.motorista, e.sequencia, e.mesesAtivos]), [['JOÃO DA SILVA', 3, 3], ['PEDRO LIMA', 2, 2]]);
  assert.deepEqual(motoristas.porMes.map(m => [m.mes, m.ativos, m.reincidentes]), [['2026-07', 2, null], ['2026-08', 2, 1], ['2026-09', 4, 2]]);
  assert.deepEqual(placas.lista.map(e => [e.placa, e.sequencia]), [['GHI7J89', 2], ['ABC1D23', 2]]);

  const buraco = reincidencia([{ m: { '2026-01': 1, '2026-03': 1 } }, { m: { '2025-12': 2, '2026-01': 1 } }], ['2025-12', '2026-01', '2026-03']);
  assert.equal(buraco.lista.length, 1, 'jan e mar não são seguidos; dez/25 e jan/26 são');
  assert.equal(buraco.porMes[2].reincidentes, null, 'fev ausente: março não é comparável');
});

test('mesAnterior e variacaoMensal', () => {
  assert.deepEqual(['2026-01', '2026-10', '2026-03'].map(mesAnterior), ['2025-12', '2026-09', '2026-02']);
  assert.equal(variacaoMensal({ '2026-09': 5 }, ['2026-09']), null, 'um mês só');
  assert.equal(variacaoMensal({ '2026-07': 5, '2026-09': 5 }, ['2026-07', '2026-09']), null, 'mês anterior ausente');
  assert.deepEqual(variacaoMensal({ '2026-08': 4 }, ['2026-08', '2026-09']), { atual: 0, anterior: 4, diferenca: -4, pct: -1 });
});

test('agregar e contarPor com lista vazia', () => {
  const a = agregar([]);
  assert.deepEqual([a.n, a.variacao, a.clientes.length, a.reincidencia.motoristas.lista.length], [0, null, 0, 0]);
  assert.equal(contarPor([{ k: '' }, { k: null }, { k: 'a' }], x => x.k).size, 1);
  assert.equal(filtrarComFacetas([], semFiltro).filtrados.length, 0);
});
