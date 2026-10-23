// Relatório em PDF: cálculo de cada seção (js/nucleo/relatorio), sobre a planilha de exemplo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPlanilha } from '../../js/nucleo/normalizacao.js';
import { montarRelatorio, SECOES } from '../../js/nucleo/relatorio/montarRelatorio.js';
import { contarViagens } from '../../js/nucleo/relatorio/secoes/viagens.js';
import { principaisExcecoes, distanciaMetros, percentil } from '../../js/nucleo/relatorio/apoio.js';
import { FOLHAS_DO_RELATORIO, OPCOES_DO_RELATORIO } from '../../js/config/relatorio.js';
import { linhasDeExemplo, ESPERADO } from '../fixtures/planilhas.js';

const { registros } = normalizarPlanilha(linhasDeExemplo());
const ids = FOLHAS_DO_RELATORIO.map(f => f.id);
const carteira = montarRelatorio(registros, { ids, opcoes: OPCOES_DO_RELATORIO, carteira: true }).secoes;
const ALFA = 'TRANSPORTES ALFA LTDA';
const doAlfa = montarRelatorio(registros.filter(r => r.cliente === ALFA), { ids, opcoes: OPCOES_DO_RELATORIO }).secoes;

test('toda folha da configuração tem cálculo ou é só de layout (capa e notas)', () => {
  for (const { id } of FOLHAS_DO_RELATORIO) assert.ok(SECOES[id] || ['capa', 'notas'].includes(id), id);
  for (const secao of Object.values(SECOES)) assert.ok(secao.titulo && secao.regra, `${secao.id} sem título ou regra`);
  assert.deepEqual(Object.keys(montarRelatorio(registros, { ids: ['viagens'], opcoes: OPCOES_DO_RELATORIO }).secoes), ['viagens'], 'só calcula o que foi pedido');
});

test('viagens com exceções: SMs distintas por mês da exceção; total conta cada viagem uma vez', () => {
  const v = carteira.viagens.dados;
  assert.equal(v.total, 9);
  assert.deepEqual(v.meses.map(m => [m.mes, m.viagens, m.excecoes]), [['2026-07', 2, 4], ['2026-08', 2, 6], ['2026-09', 5, 17]]);
  assert.equal(v.meses.reduce((s, m) => s + m.excecoes, 0), ESPERADO.eventos);
  assert.deepEqual(v.meses[2].variacao, { anterior: 2, diferenca: 3, pct: 1.5 });              // viagens
  assert.deepEqual(v.meses[2].variacaoExcecoes, { anterior: 6, diferenca: 11, pct: 11 / 6 });
  // intensidade: 17 exceções em 5 viagens (3,4) contra 6 em 2 (3,0)
  assert.equal(v.meses[2].porViagem, 3.4);
  assert.equal(v.meses[2].variacaoPorViagem.anterior, 3);
  assert.ok(Math.abs(v.meses[2].variacaoPorViagem.pct - 0.4 / 3) < 1e-12);
  assert.equal(v.meses[0].variacao, null, 'sem o mês anterior nos dados');
  // viagem com exceção em agosto e setembro: conta nos dois meses e uma vez no total
  const cruzou = contarViagens([{ viagem: '1', mes: '2026-08' }, { viagem: '1', mes: '2026-09' }, { viagem: '2', mes: '2026-09' }, { viagem: '', mes: '2026-09' }]);
  assert.deepEqual([cruzou.total, cruzou.porMes.get('2026-08').size, cruzou.porMes.get('2026-09').size, cruzou.semViagem], [2, 1, 2, 1]);
});

test('mais viagens com menos exceções por viagem: o resumo traz as três variações do último mês juntas', () => {
  // como no caso real que confundiu: exceções quase iguais, viagens subindo, intensidade caindo
  const evento = (viagem, mes) => ({ viagem, mes, cliente: 'C', excecao: 'X', classe: 'MOTORISTA', grupo: 'VELOCIDADE', data: null });
  const agosto = Array.from({ length: 100 }, (_, i) => evento(String(i % 20), '2026-08'));        // 100 em 20 viagens: 5,0
  const setembro = Array.from({ length: 99 }, (_, i) => evento(String(100 + i % 33), '2026-09')); // 99 em 33 viagens: 3,0
  const { ultimoMes } = montarRelatorio([...agosto, ...setembro], { ids: ['resumo'], opcoes: OPCOES_DO_RELATORIO }).secoes.resumo.dados;
  assert.equal(ultimoMes.variacaoExcecoes.diferenca, -1);
  assert.equal(ultimoMes.variacao.pct, 13 / 20);   // viagens: 20 -> 33
  assert.equal(ultimoMes.porViagem, 3);
  assert.equal(ultimoMes.variacaoPorViagem.pct, -0.4);
});

test('exceções: total, classes e ranking por nome com percentual', () => {
  const e = carteira.excecoes.dados;
  assert.equal(e.total, ESPERADO.eventos);
  assert.deepEqual(e.porClasse, ESPERADO.classes);
  assert.deepEqual(e.ranking.lista[0], { nome: 'VELOCIDADE EXCEDIDA FAIXA 1', classe: 'MOTORISTA', n: 7, pct: 7 / 27 });
  assert.equal(e.ranking.lista.reduce((s, x) => s + x.n, 0) + e.ranking.outras.eventos, ESPERADO.eventos);
});

test('top motoristas e veículos: regra de classe do painel e principais exceções somando o total', () => {
  const m = carteira.motoristas.dados, v = carteira.veiculos.dados;
  assert.deepEqual(m.itens.map(x => [x.nome, x.total]), [['JOÃO DA SILVA', 10], ['MARIA SOUZA', 3], ['ANA COSTA', 2], ['PEDRO LIMA', 2]]);
  assert.equal(m.totalClasse, ESPERADO.classes.MOTORISTA);
  assert.equal(v.itens[0].nome, 'GHI7J89');
  for (const item of [...m.itens, ...v.itens]) {
    assert.equal(item.excecoes.lista.reduce((s, x) => s + x.n, 0) + item.excecoes.outras.eventos, item.total, item.nome);
    assert.ok(item.excecoes.lista.length <= OPCOES_DO_RELATORIO.excecoesPorItem);
  }
  for (const item of v.itens) for (const x of item.excecoes.lista) assert.notEqual(x.classe, 'MOTORISTA', item.nome);
});

test('locais: sem "(sem referência)", com centro e raio que cobre 90% dos eventos', () => {
  const l = carteira.locais.dados;
  assert.deepEqual(l.itens.map(x => [x.nome, x.total]), [['RECIFE - PE', 10], ['CD CAJAMAR - CAJAMAR/SP', 8], ['POSTO LETICIA - CASCAVEL/PR', 8]]);
  assert.equal(l.itens[0].raio, 0, 'todos os eventos na mesma coordenada');
  const cascavel = l.itens[2];   // 7 eventos num ponto e 1 a ~1,4 km: o raio de 90% alcança o mais distante
  assert.ok(Math.abs(cascavel.centro.lat - (-24.89564 * 7 + -24.90254) / 8) < 1e-9);
  assert.equal(cascavel.raio, Math.round(distanciaMetros(cascavel.centro.lat, cascavel.centro.lon, -24.90254, -53.43518)));
});

test('carteira: clientes com viagens; relatório de um cliente só tem os dados dele', () => {
  assert.deepEqual(carteira.clientes.dados.itens.map(c => [c.nome, c.total, c.viagens]), [[ALFA, 16, 5], ['GAMA CARGAS', 6, 2], ['BETA LOGÍSTICA S/A', 5, 2]]);
  assert.equal(doAlfa.resumo.dados.clientes, 1);
  assert.equal(doAlfa.resumo.dados.eventos, 16);
  assert.equal(doAlfa.viagens.dados.total, 5);   // SMs 5001, 5002, 5003, 5010 e 5011
  assert.ok(doAlfa.motoristas.dados.itens.every(m => m.cliente === ALFA));
});

test('apoio: percentil, distância e principais exceções', () => {
  assert.equal(percentil([5, 1, 3, 2, 4], 0.9), 5);
  assert.equal(percentil([10, 20], 0.5), 10);
  assert.equal(percentil([], 0.9), null);
  assert.ok(Math.abs(distanciaMetros(0, 0, 0, 1) - 111195) < 1);
  const p = principaisExcecoes(new Map([['A', 1], ['B', 3], ['C', 3]]), new Map(), 2);
  assert.deepEqual(p.lista.map(x => x.nome), ['B', 'C']);
  assert.deepEqual(p.outras, { tipos: 1, eventos: 1 });
});
