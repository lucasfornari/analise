// Volume: o uso normal fica abaixo de 10 mil linhas; o teste usa o dobro, lido no Web Worker com a tela respondendo.
// (Leitura e cálculos com 50 mil linhas são cobertos em tests/unit/desempenho.test.js.)
import { test, expect, enviarArquivo, kpi } from './apoio.js';
import { CATALOGO } from '../../js/nucleo/catalogoExcecoes.js';
import { linhasEmMassa, xlsxDoExport } from '../fixtures/planilhas.js';

const LINHAS = 20_000;
const LIMITE_MS = 15_000;   // com folga para o CI; localmente leva ~2 s
const ROTULO = { MOTORISTA: 'Motorista', VEICULO: 'Veiculo', CONTEXTO: 'Contexto Suspeito' };

test(`carrega ${LINHAS.toLocaleString('pt-BR')} linhas sem travar a tela`, async ({ page }) => {
  test.setTimeout(60_000);
  const bytes = xlsxDoExport(linhasEmMassa(LINHAS, CATALOGO.map(d => [d.nome, ROTULO[d.classe]])));
  await page.goto('./');

  const inicio = Date.now();
  await enviarArquivo(page, 'export-grande.xlsx', bytes);
  // a thread da página continua livre enquanto o worker lê
  const resposta = Date.now();
  expect(await page.evaluate(() => 1 + 1)).toBe(2);
  expect(Date.now() - resposta).toBeLessThan(1000);

  await expect(page.locator('#dash')).toBeVisible({ timeout: LIMITE_MS });
  const duracao = Date.now() - inicio;
  console.log(`  ${LINHAS} linhas carregadas em ${duracao} ms`);
  await expect(kpi(page, 0)).toHaveText('20.000');

  // filtrar continua rápido com o volume todo
  const antes = Date.now();
  await page.locator('#tblCli tbody tr').first().click();
  await expect(page.locator('#filterBadge')).toHaveText('1');
  expect(Date.now() - antes).toBeLessThan(2000);
});
