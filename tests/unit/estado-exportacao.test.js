import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPlanilha } from '../../js/nucleo/normalizacao.js';
import { gerarCsv, COLUNAS_EXPORTADAS } from '../../js/nucleo/exportacao.js';
import { Estado } from '../../js/estado/Estado.js';
import { linhasDeExemplo, ESPERADO } from '../fixtures/planilhas.js';

function estadoCarregado() {
  const estado = new Estado();
  estado.carregar({ ...normalizarPlanilha(linhasDeExemplo()), aba: 'Export' }, 'export.xlsx');
  return estado;
}

test('Estado: carrega período, universos e começa sem filtro', () => {
  const estado = estadoCarregado();
  assert.deepEqual([estado.meta.inicio, estado.meta.fim, estado.meta.meses], ['2026-07-03', '2026-09-19', ['2026-07', '2026-08', '2026-09']]);
  assert.deepEqual([estado.universo.cli.size, estado.universo.mot.size, estado.universo.pla.size], [ESPERADO.clientes, ESPERADO.motoristas, ESPERADO.placas]);
  const f = estado.filtroAtual();
  assert.equal(f.classes, null);
  assert.ok(Object.values(f.listas).every(l => l === null), 'tudo marcado = sem filtro');
  estado.recalcular();
  assert.equal(estado.agregado.n, ESPERADO.eventos);
  assert.equal(estado.facetas.mot.get('JOÃO DA SILVA'), 12);
  assert.ok(!estado.universo.mot.has('(em branco)'), 'sem motorista vazio no exemplo, sem opção "(em branco)"');   // inclui os 2 eventos de veículo da placa dele
});

test('Estado: filtros combinados, isolar item e remover filtro por filtro', () => {
  const estado = estadoCarregado();
  estado.alternarUnico('cli', 'TRANSPORTES ALFA LTDA');
  estado.selecao.classes.delete('VEICULO');
  estado.selecao.de = '2026-09-01';
  estado.recalcular();
  assert.equal(estado.filtrados.length, 7);
  assert.equal(estado.unicoSelecionado('cli'), 'TRANSPORTES ALFA LTDA');

  estado.limpar('periodo');
  estado.recalcular();
  assert.equal(estado.filtrados.length, 13);   // Alfa (16) sem as 3 de veículo
  estado.limpar('classes');
  estado.alternarUnico('cli', 'TRANSPORTES ALFA LTDA');   // clicar de novo desfaz
  estado.recalcular();
  assert.deepEqual([estado.filtrados.length, estado.unicoSelecionado('cli')], [ESPERADO.eventos, null]);
});

test('gerarCsv: BOM, ";", vírgula decimal, rótulos e escape', () => {
  const { registros } = normalizarPlanilha(linhasDeExemplo());
  const csv = gerarCsv([{ ...registros[0], cliente: 'A; "B"' }]);
  assert.ok(csv.startsWith('﻿' + COLUNAS_EXPORTADAS.join(';')));
  const linha = csv.split('\r\n')[1];
  assert.ok(linha.startsWith('"A; ""B"""'));
  for (const trecho of ['Motorista', 'Velocidade', '-24,89564', '03/07/2026', '5001']) assert.ok(linha.includes(trecho), trecho);
});
