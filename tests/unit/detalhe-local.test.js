import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPlanilha } from '../../js/nucleo/normalizacao.js';
import { agregar } from '../../js/nucleo/agregacao.js';
import { detalharLocal, buscarNoDetalhe } from '../../js/nucleo/detalheLocal.js';
import { linhasDeExemplo } from '../fixtures/planilhas.js';

const { registros } = normalizarPlanilha(linhasDeExemplo());
const recife = agregar(registros).locais.find(l => l.local === 'RECIFE - PE');
const detalhe = detalharLocal(recife.eventos);

test('resumo do local: eventos, placas, motoristas, SMs, clientes e período', () => {
  const { resumo } = detalhe;
  assert.deepEqual([resumo.eventos, resumo.placas, resumo.motoristas, resumo.viagens, resumo.clientes], [10, 3, 2, 4, 2]);
  assert.deepEqual([resumo.primeiro.getMonth() + 1, resumo.primeiro.getDate(), resumo.primeiro.getHours()], [8, 20, 22]);
  assert.deepEqual([resumo.ultimo.getMonth() + 1, resumo.ultimo.getDate(), resumo.ultimo.getHours()], [9, 19, 4]);
});

test('por placa: eventos de todas as classes, motoristas, SMs e último evento', () => {
  assert.deepEqual(detalhe.placas.map(p => [p.placa, p.total, p.nViagens, [...p.motoristas.keys()]]), [
    ['GHI7J89', 5, 2, ['PEDRO LIMA']],
    ['JKL0M12', 4, 2, ['ANA COSTA']],   // SMs 7001 e 7002
    ['XX123', 1, 1, ['ANA COSTA']]
  ]);
  assert.equal(detalhe.placas[1].ultimo.getDate(), 19);
  assert.equal(detalhe.placas[0].cliente, 'BETA LOGÍSTICA S/A');
});

test('por motorista e lista de eventos do mais recente ao mais antigo', () => {
  assert.deepEqual(detalhe.motoristas.map(m => [m.motorista, m.total, [...m.placas.keys()].sort()]),
    [['ANA COSTA', 5, ['JKL0M12', 'XX123']], ['PEDRO LIMA', 5, ['GHI7J89']]]);
  const datas = detalhe.eventos.map(e => e.registro.data.getTime());
  assert.deepEqual(datas, [...datas].sort((a, b) => b - a));
});

test('busca por placa, motorista, SM ou exceção, sem acento e em qualquer ordem', () => {
  const casos = [
    [detalhe.eventos, 'ghi7', 5], [detalhe.eventos, '7002', 2], [detalhe.eventos, 'costa isca', 1],
    [detalhe.eventos, 'distante veiculo', 1], [detalhe.placas, 'pedro', 1], [detalhe.motoristas, 'xx123', 1],
    [detalhe.eventos, '', 10], [detalhe.eventos, 'inexistente', 0]
  ];
  for (const [linhas, consulta, esperado] of casos) assert.equal(buscarNoDetalhe(linhas, consulta).length, esperado, consulta);
});

test('placa ou motorista em branco vira "(em branco)" no detalhe', () => {
  const d = detalharLocal([{ ...recife.eventos[0], placa: '', motorista: '' }]);
  assert.deepEqual([d.placas[0].placa, d.motoristas[0].motorista], ['(em branco)', '(em branco)']);
});
