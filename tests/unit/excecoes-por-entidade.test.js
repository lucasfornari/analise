// Exceções pelo nome e quantidade em cada entidade (tooltips, etiquetas e aba Exceções dos detalhes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPlanilha } from '../../js/nucleo/normalizacao.js';
import { agregar, completarPonto } from '../../js/nucleo/agregacao.js';
import { detalharLocal } from '../../js/nucleo/detalheLocal.js';
import { linhasDeExemplo } from '../fixtures/planilhas.js';

const a = agregar(normalizarPlanilha(linhasDeExemplo()).registros);
const soma = mapa => [...mapa.values()].reduce((s, n) => s + n, 0);

test('a soma das exceções de cada entidade é igual ao total exibido', () => {
  for (const lista of ['clientes', 'locais', 'placas', 'motoristas', 'perfis']) {
    for (const item of a[lista]) assert.equal(soma(item.porExcecao), item.total, `${lista}: ${JSON.stringify(Object.values(item)[0])}`);
  }
  for (const ponto of a.pontos) assert.equal(soma(completarPonto(ponto).porExcecao), ponto.total);
});

test('motorista conta só exceções de motorista; placa, só de veículo e contexto', () => {
  const joao = a.motoristas.find(m => m.motorista === 'JOÃO DA SILVA');
  assert.deepEqual([...joao.porExcecao], [
    ['VELOCIDADE EXCEDIDA FAIXA 1', 7], ['PARADA NAO INFORMADA', 1], ['FALTA O INICIO DE VIAGEM', 1], ['TEMPO DE PARADA EXCEDIDO', 1]
  ]);
  // a mesma placa do João: as 10 exceções de motorista ficam de fora
  assert.deepEqual([...a.placas.find(p => p.placa === 'ABC1D23').porExcecao], [['SEM POSICAO FORA DE AREA DE RISCO (COM SM)', 2]]);
  for (const m of a.motoristas) for (const nome of m.porExcecao.keys()) assert.equal(a.classeDaExcecao.get(nome), 'MOTORISTA');
  for (const p of a.placas) for (const nome of p.porExcecao.keys()) assert.notEqual(a.classeDaExcecao.get(nome), 'MOTORISTA');
});

test('classe de cada exceção pelo catálogo (inclusive as corrigidas) e pela planilha nas não catalogadas', () => {
  assert.equal(a.classeDaExcecao.get('BOTAO DE PANICO'), 'MOTORISTA');
  assert.equal(a.classeDaExcecao.get('ISCA ESTÁ DISTANTE DO VEÍCULO'), 'VEICULO');
  assert.equal(a.classeDaExcecao.get('EXCECAO NOVA DE TESTE'), 'VEICULO');
  assert.equal(a.classeDaExcecao.size, a.excecoes.length);
});

test('detalhes do local: aba Exceções e exceções de cada placa e motorista no local', () => {
  const d = detalharLocal(a.locais.find(l => l.local === 'RECIFE - PE').eventos);
  assert.deepEqual(d.excecoes.slice(0, 3).map(e => [e.excecao, e.classe, e.total, e.nPlacas, e.nMotoristas]), [
    ['VELOCIDADE EXCEDIDA FAIXA 3', 'MOTORISTA', 2, 1, 1],
    ['VIOLACAO PORTA BAU', 'VEICULO', 2, 1, 1],
    ['BOTAO DE PANICO', 'MOTORISTA', 1, 1, 1]
  ]);
  assert.equal(d.excecoes.reduce((s, e) => s + e.total, 0), d.resumo.eventos);
  // no local, a placa mostra todas as classes (é o que aconteceu ali)
  assert.deepEqual([...d.placas.find(p => p.placa === 'GHI7J89').porExcecao].sort(), [
    ['BOTAO DE PANICO', 1], ['DESENGATE DA CARRETA 01', 1], ['FALTA O INICIO DE VIAGEM', 1], ['VIOLACAO PORTA BAU', 2]
  ]);
  assert.match(d.excecoes[1].busca, /ghi7j89/i, 'busca da aba encontra pela placa');
});
