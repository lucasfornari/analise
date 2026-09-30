// Volume: o uso normal fica abaixo de 10 mil linhas; 50 mil garante folga (o leitor já foi validado com 150 mil).
// Os limites têm folga para máquinas de CI; a medição local fica bem abaixo deles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync } from 'fflate';
import { CATALOGO } from '../../js/nucleo/catalogoExcecoes.js';
import { abrirXlsx } from '../../js/servicos/leitorXlsx.js';
import { normalizarPlanilha } from '../../js/nucleo/normalizacao.js';
import { filtrarComFacetas } from '../../js/nucleo/filtro.js';
import { agregar } from '../../js/nucleo/agregacao.js';
import { linhasEmMassa, xlsxDoExport } from '../fixtures/planilhas.js';

const LINHAS = 50_000;
const ROTULO = { MOTORISTA: 'Motorista', VEICULO: 'Veiculo', CONTEXTO: 'Contexto Suspeito' };
const massa = linhasEmMassa(LINHAS, CATALOGO.map(d => [d.nome, ROTULO[d.classe]]));

function medir(nome, limiteMs, funcao) {
  const inicio = performance.now();
  const resultado = funcao();
  const ms = Math.round(performance.now() - inicio);
  console.log(`  ${nome}: ${ms} ms (limite ${limiteMs} ms)`);
  assert.ok(ms < limiteMs, `${nome} levou ${ms} ms`);
  return resultado;
}

test(`${LINHAS.toLocaleString('pt-BR')} linhas: leitura, normalização, filtro e agregação dentro do limite`, () => {
  const bytes = xlsxDoExport(massa);
  const linhas = medir('leitura do xlsx', 5000, () => abrirXlsx(bytes, unzipSync)[0].linhas());
  assert.equal(linhas.length, LINHAS + 3);

  const { registros } = medir('normalização', 3000, () => normalizarPlanilha(linhas));
  assert.equal(registros.length, LINHAS);

  const filtro = { classes: new Set(['MOTORISTA', 'VEICULO']), listas: { cli: new Set(registros.slice(0, 5000).map(r => r.cliente)) } };
  const { filtrados } = medir('filtro com facetas', 500, () => filtrarComFacetas(registros, filtro));
  const a = medir('agregação', 1000, () => agregar(filtrados));
  assert.ok(a.n > 0 && a.reincidencia.motoristas.lista.length > 0);
});
