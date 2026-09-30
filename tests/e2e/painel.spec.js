// Fluxos principais do painel, com a planilha sintética de tests/fixtures (37 eventos, 4 clientes, jan–mar/2026).
import { test, expect, carregarPlanilha, kpi, FIXTURES } from './apoio.js';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => { await page.goto('./'); });

test('carrega a página com as bibliotecas do CDN', async ({ page }) => {
  await expect(page).toHaveTitle(/Painel de Exceções/);
  await expect(page.locator('#empty')).toBeVisible();
  const libs = await page.evaluate(() => ({ xlsx: !!window.XLSX, chart: !!window.Chart, leaflet: !!window.L, heat: !!window.L?.heatLayer }));
  expect(libs).toEqual({ xlsx: true, chart: true, leaflet: true, heat: true });
  // estilos próprios aplicados (garante que os arquivos CSS foram encontrados)
  await expect(page.locator('header.top')).toHaveCSS('background-color', 'rgb(2, 0, 57)');
});

for (const arquivo of ['excecoes.csv', 'excecoes.xlsx']) {
  test(`lê ${arquivo} e monta o painel`, async ({ page }) => {
    await carregarPlanilha(page, arquivo);
    await expect(page.locator('#fileInfo')).toHaveText(`${arquivo} · 37 eventos`);
    await expect(kpi(page, 0)).toHaveText('37');
    await expect(kpi(page, 1)).toHaveText('17');
    await expect(kpi(page, 2)).toHaveText('10');
    await expect(kpi(page, 3)).toHaveText('10');
    await expect(kpi(page, 4)).toHaveText('4');
    await expect(kpi(page, 5)).toHaveText('75,7%');
    await expect(page.locator('#tblCli tbody tr')).toHaveCount(4);
    await expect(page.locator('#tblCli tbody tr').first()).toContainText('Transportes Alfa');
    await expect(page.locator('#tblLoc tbody tr')).toHaveCount(3);
    await expect(page.locator('#tblPer tbody tr')).toHaveCount(3);
    await expect(page.locator('#tblMot tbody tr')).toHaveCount(2);
    await expect(page.locator('#tblPlaca tbody tr')).toHaveCount(3);
    const graficos = await page.evaluate(() => ['chTipo', 'chMes', 'chCS'].map(id => !!Chart.getChart(id)));
    expect(graficos).toEqual([true, true, true]);
    await expect(page.locator('#mapSub')).toHaveText('32 eventos georreferenciados em 3 locais');
    await expect(page.locator('#quality')).toContainText('Duplicados exatos: 1');
    await expect(page.locator('#quality')).toContainText('Descartadas (sem cliente/exceção): 1');
  });
}

test.describe('arquivo inválido', () => {
  test.use({ errosPermitidos: [/Não encontrei o cabeçalho/] });
  test('mostra erro quando falta o cabeçalho esperado', async ({ page }) => {
    await page.locator('#fileInput').setInputFiles(FIXTURES + 'invalida.csv');
    await expect(page.locator('#errMsg')).toContainText('Não encontrei o cabeçalho');
    await expect(page.locator('#dash')).toBeHidden();
  });
});

test.describe('filtros', () => {
  test.beforeEach(async ({ page }) => { await carregarPlanilha(page); });

  test('classe, mês e placa', async ({ page }) => {
    await page.locator('#classChips .chip', { hasText: 'Contexto suspeito' }).click();
    await expect(kpi(page, 0)).toHaveText('27');
    await expect(page.locator('#filterBadge')).toHaveText('1');
    await page.locator('#classChips .chip', { hasText: 'Contexto suspeito' }).click();

    await page.locator('#monthPresets .chip', { hasText: 'mar/26' }).click();
    await expect(kpi(page, 0)).toHaveText('12');
    await expect(page.locator('#dtFrom')).toHaveValue('2026-03-01');
    await page.locator('#monthPresets .chip', { hasText: 'Tudo' }).click();

    await page.locator('#plateSearch').fill('abc-1d');
    await expect(kpi(page, 0)).toHaveText('12');
    await expect(page.locator('#activeFilters')).toContainText('placa contém ABC1D');
  });

  test('clique no ranking filtra pelo cliente e clique de novo desfaz', async ({ page }) => {
    const linha = page.locator('#tblCli tbody tr').first();
    await linha.click();
    await expect(kpi(page, 0)).toHaveText('10');
    await expect(page.locator('#cliCount')).toHaveText('1/4');
    await page.locator('#tblCli tbody tr').first().click();
    await expect(kpi(page, 0)).toHaveText('37');
  });

  test('lista de clientes: busca, desmarcar e fechar com Esc', async ({ page }) => {
    await page.locator('.acc-sec[data-sec="cli"] .acc-head').click();
    await expect(page.locator('.acc-sec[data-sec="cli"]')).toHaveClass(/open/);
    await page.locator('#cliSearch').fill('gama');
    await expect(page.locator('#cliHint')).toHaveText('1 encontrado');
    await page.locator('.acc-sec[data-sec="cli"] [data-none]').click();
    await expect(kpi(page, 0)).toHaveText('28');
    await page.locator('#cliSearch').press('Escape');       // 1º Esc limpa a busca
    await expect(page.locator('#cliSearch')).toHaveValue('');
    await page.locator('#cliSearch').press('Escape');       // 2º Esc fecha o painel
    await expect(page.locator('.acc-sec[data-sec="cli"]')).not.toHaveClass(/open/);
    await expect(page.locator('#cliCount')).toHaveText('3/4');
  });

  test('exceções: "só estes" seleciona um grupo de classe', async ({ page }) => {
    await page.locator('.acc-sec[data-sec="exc"] .acc-head').click();
    await page.locator('#excList .grp', { hasText: 'Fim de viagem' }).getByRole('button', { name: 'só estes' }).click();
    await expect(kpi(page, 0)).toHaveText('10');
  });

  test('ignorar duplicados', async ({ page }) => {
    await page.locator('#chkDup').check();
    await expect(kpi(page, 0)).toHaveText('36');
  });

  test('atalhos: Ctrl+Alt+L limpa filtros e Ctrl+B recolhe o menu', async ({ page }) => {
    await page.locator('#classChips .chip', { hasText: 'Equipamento' }).click();
    await expect(kpi(page, 0)).toHaveText('20');
    await page.keyboard.press('Control+Alt+KeyL');
    await expect(kpi(page, 0)).toHaveText('37');
    await expect(page.locator('#filterBadge')).toBeHidden();

    await page.keyboard.press('Control+KeyB');
    await expect(page.locator('.app')).toHaveClass(/collapsed/);
    await page.reload();                                      // preferência persiste
    await expect(page.locator('.app')).toHaveClass(/collapsed/);
    await page.keyboard.press('Control+KeyB');
    await expect(page.locator('.app')).not.toHaveClass(/collapsed/);
  });

  test('ordenação das tabelas e "mostrar mais"', async ({ page }) => {
    const th = page.locator('#tblCli th[data-k="cliente"]');
    await th.click();                                                   // 1º clique: decrescente
    await expect(page.locator('#tblCli th[data-k="cliente"]')).toHaveClass(/desc/);
    await expect(page.locator('#tblCli tbody tr').nth(1)).toContainText('Gama');
    await th.click();
    await expect(page.locator('#tblCli tbody tr').first()).toContainText('Beta');
    await expect(page.locator('[data-more="loc"]')).toBeHidden();      // só 3 locais
  });
});

test('mapa: alterna entre calor e locais', async ({ page }) => {
  await carregarPlanilha(page);
  const calor = page.locator('#map canvas.leaflet-heatmap-layer');
  const marcadores = page.locator('#map .leaflet-overlay-pane canvas:not(.leaflet-heatmap-layer)');   // preferCanvas: marcadores em canvas
  await expect(calor).toHaveCount(1);
  await page.locator('#mapMode button', { hasText: 'Locais' }).click();
  await expect(calor).toHaveCount(0);
  await expect(marcadores).toHaveCount(1);
  await page.locator('#mapBase button', { hasText: 'Satélite' }).click();
  await page.locator('#tblLoc tbody tr').first().click();
});

test('exporta o CSV filtrado', async ({ page }) => {
  await carregarPlanilha(page);
  await page.locator('#monthPresets .chip', { hasText: 'mar/26' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#btnExport').click()]);
  expect(download.suggestedFilename()).toBe('excecoes_filtradas.csv');
  const texto = (await readFile(await download.path(), 'utf8')).replace(/^﻿/, '');
  const linhas = texto.split('\r\n');
  expect(linhas[0]).toBe('cliente;perfil;filial;placa;carreta;motorista;excecao;classe;tipo;data;local;referencia;lat;lon;viagem;tecnologia');
  expect(linhas).toHaveLength(13);
});
