// Fluxos do painel com a planilha de exemplo (tests/fixtures/planilhas.js): 27 eventos, 3 clientes, jul–set/2026.
import { test, expect, carregarPlanilha, enviarArquivo, kpi, linhas, PLANILHAS } from './apoio.js';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => { await page.goto('./'); });

// Espera a rolagem suave terminar (posição igual em dois quadros seguidos).
const esperarRolagem = page => page.waitForFunction(() => new Promise(fim => {
  const y = scrollY;
  requestAnimationFrame(() => requestAnimationFrame(() => fim(scrollY === y)));
}));

test('carrega a página com as bibliotecas do CDN', async ({ page }) => {
  await expect(page).toHaveTitle(/Painel de Exceções/);
  await expect(page.locator('#empty')).toBeVisible();
  const libs = await page.evaluate(() => ({ chart: !!window.Chart, leaflet: !!window.L, heat: !!window.L?.heatLayer }));
  expect(libs).toEqual({ chart: true, leaflet: true, heat: true });
  await expect(page.locator('header.top')).toHaveCSS('background-color', 'rgb(2, 0, 57)');   // CSS próprio carregado
  await expect(page.locator('.acc-sec')).toHaveCount(5);
});

test('rodapé mostra a versão publicada (ou execução local)', async ({ page }) => {
  const versao = page.locator('#appVersion');
  if (process.env.COMMIT_ESPERADO) {
    // pacote do deploy ou site no ar: versão semântica e exatamente o commit publicado
    await expect(versao).toHaveText(/^v\d+\.\d+\.\d+ · \d{2}\/\d{2}\/\d{4}$/);
    await expect(versao).toHaveAttribute('data-commit', process.env.COMMIT_ESPERADO);
    await expect(versao.locator('a')).toHaveAttribute('href', /\/releases\/tag\/v\d+\.\d+\.\d+$/);
  } else {
    await expect(versao).toHaveText('versão local (desenvolvimento)');
  }
});

for (const nome of Object.keys(PLANILHAS)) {
  test(`lê ${nome} e monta o painel`, async ({ page }) => {
    await carregarPlanilha(page, nome);
    await expect(page.locator('#fileInfo')).toHaveText(`${nome} · 27 eventos`);
    await expect(page.locator('#kpis .kpi .v')).toHaveText(['27', '17', '8', '2', '3', '+183,3%']);
    await expect(linhas(page, 'tblCli')).toHaveCount(3);
    await expect(linhas(page, 'tblCli').first()).toContainText('TRANSPORTES ALFA');
    await expect(linhas(page, 'tblLoc')).toHaveCount(4);
    await expect(linhas(page, 'tblMot')).toHaveCount(4);
    await expect(linhas(page, 'tblPlaca')).toHaveCount(5);
    await expect(linhas(page, 'tblPer')).toHaveCount(3);
    expect(await page.evaluate(() => ['chGrupo', 'chMes', 'chExc'].map(id => !!Chart.getChart(id)))).toEqual([true, true, true]);
    await expect(page.locator('#mapSub')).toHaveText('26 eventos georreferenciados em 3 locais');
    await expect(page.locator('#quality')).toContainText('Classe corrigida pelo catálogo: 3');
    await expect(page.locator('#quality .fora-catalogo')).toContainText('Excecao nova de teste (1)');
  });
}

test.describe('arquivo inválido', () => {
  test.use({ errosPermitidos: [/Não encontrei o cabeçalho/] });
  test('mostra erro quando falta o cabeçalho esperado', async ({ page }) => {
    await enviarArquivo(page, 'invalida.csv', new TextEncoder().encode('coluna A;coluna B\r\n1;2'));
    await expect(page.locator('#errMsg')).toContainText('Não encontrei o cabeçalho');
    await expect(page.locator('#dash')).toBeHidden();
    await expect(page.locator('#progresso')).toBeHidden();
  });
});

test.describe('com a planilha carregada', () => {
  test.beforeEach(async ({ page }) => { await carregarPlanilha(page); });

  test('filtros combinados e etiquetas removíveis', async ({ page }) => {
    await linhas(page, 'tblCli').first().click();                                    // cliente Alfa
    await expect(kpi(page, 0)).toHaveText('16');
    await page.locator('#classChips .chip', { hasText: 'Veículo' }).click();         // tira veículo
    await expect(kpi(page, 0)).toHaveText('13');
    await page.locator('#monthPresets .chip', { hasText: 'set/26' }).click();
    await expect(kpi(page, 0)).toHaveText('7');
    await expect(page.locator('#filterBadge')).toHaveText('3');
    await expect(page.locator('#activeFilters .etiqueta')).toHaveCount(3);

    await page.locator('#activeFilters .etiqueta', { hasText: 'período' }).click();
    await expect(kpi(page, 0)).toHaveText('13');
    await page.locator('#activeFilters .etiqueta', { hasText: 'classe' }).click();
    await expect(kpi(page, 0)).toHaveText('16');
    await page.locator('#plateSearch').fill('mji-73');                                // busca parcial na carreta
    await expect(kpi(page, 0)).toHaveText('12');
    await expect(page.locator('#activeFilters')).toContainText('placa contém MJI73');
  });

  test('listas dinâmicas: escolher um cliente deixa só os motoristas dele', async ({ page }) => {
    await linhas(page, 'tblCli').filter({ hasText: 'BETA' }).click();
    await page.locator('.acc-sec[data-sec="mot"] .acc-head').click();
    const visiveis = page.locator('#motList label:not(.hidden)');
    await expect(visiveis).toHaveCount(1);
    await expect(visiveis).toContainText('PEDRO LIMA');
    await page.locator('.acc-sec[data-sec="mot"] [data-so-disponiveis]').uncheck();
    await expect(visiveis).toHaveCount(4);
    await expect(page.locator('#motList label.zerada')).toHaveCount(3);
  });

  test('lista de placas: busca, desmarcar e fechar com Esc', async ({ page }) => {
    await page.locator('.acc-sec[data-sec="pla"] .acc-head').click();
    await page.locator('#plaSearch').fill('ghi');
    await expect(page.locator('#plaHint')).toHaveText('1 encontrado');
    await page.locator('.acc-sec[data-sec="pla"] [data-none]').click();
    await expect(kpi(page, 0)).toHaveText('22');
    await page.locator('#plaSearch').press('Escape');                                 // 1º Esc limpa a busca
    await expect(page.locator('#plaSearch')).toHaveValue('');
    await page.locator('#plaSearch').press('Escape');                                 // 2º Esc fecha o painel
    await expect(page.locator('.acc-sec[data-sec="pla"]')).not.toHaveClass(/open/);
    await expect(page.locator('#plaCount')).toHaveText('4/5');
  });

  test('exceções: "só estes" seleciona uma classe inteira', async ({ page }) => {
    await page.locator('.acc-sec[data-sec="exc"] .acc-head').click();
    await page.locator('#excList .grp', { hasText: 'Contexto suspeito' }).getByRole('button', { name: 'só estes' }).click();
    await expect(kpi(page, 0)).toHaveText('2');
  });

  test('reincidentes mês a mês de motoristas e placas', async ({ page }) => {
    await expect(page.locator('#reincResumo .reinc-mes')).toHaveCount(2);
    await expect(page.locator('#reincResumo')).toContainText('set/26: 2 de 4 motoristas também tiveram evento em ago/26');
    await expect(linhas(page, 'tblReinc')).toHaveCount(2);
    await expect(linhas(page, 'tblReinc').first()).toContainText('JOÃO DA SILVA');
    await expect(linhas(page, 'tblReinc').first().locator('td').nth(5)).toHaveText('3');   // meses seguidos
    await page.locator('#reincModo button', { hasText: 'Placas' }).click();
    await expect(linhas(page, 'tblReinc')).toHaveCount(2);
    await expect(linhas(page, 'tblReinc').first()).toContainText('GHI7J89');
    await linhas(page, 'tblReinc').first().click();                                   // filtra pela placa
    await expect(page.locator('#activeFilters')).toContainText('placa GHI7J89');
    await expect(kpi(page, 0)).toHaveText('5');
  });

  test('clientes mês a mês: participação e variação', async ({ page }) => {
    const alfa = linhas(page, 'tblCliMes').filter({ hasText: 'TRANSPORTES ALFA' });
    await expect(alfa).toContainText('100,0%');                                       // único cliente em julho
    await expect(alfa.locator('.variacao')).toHaveText('▲ +100,0%');
    await expect(linhas(page, 'tblCliMes').filter({ hasText: 'GAMA' }).locator('.variacao')).toHaveText('▲ novo');
  });

  test('mapa: clique no local mostra o resumo e o clique direto no mapa encontra o local', async ({ page }) => {
    await linhas(page, 'tblLoc').first().click();                                     // RECIFE - PE, 10 eventos
    const popup = page.locator('.popup-local');
    await expect(popup).toContainText('RECIFE - PE');
    await expect(popup.locator('.popup-cabecalho')).toContainText('10 eventos · 3 placas · 2 motoristas · 4 SMs');
    await expect(popup.locator('.popup-cabecalho')).toContainText('Último evento: 19/09/2026, 04:15');
    await expect(popup.locator('.popup-topo li').first()).toContainText('GHI7J89');

    // clique direto no mapa (sobre o calor) abre o local mais próximo; a ponta do popup marca o local
    await esperarRolagem(page);                                                        // o painel rola suave até o mapa
    const ponta = await popup.locator('.leaflet-popup-tip').boundingBox();
    await popup.locator('.leaflet-popup-close-button').click();
    await expect(popup).toBeHidden();
    await page.mouse.click(ponta.x + ponta.width / 2, ponta.y + ponta.height + 12);
    await expect(popup).toContainText('RECIFE - PE');

    await page.locator('#mapMode button', { hasText: 'Locais' }).click();
    await expect(page.locator('#map canvas.leaflet-heatmap-layer')).toHaveCount(0);
  });

  test('mapa: detalhes do local com placas, motoristas, eventos, busca e exportação', async ({ page }) => {
    await linhas(page, 'tblLoc').first().click();
    await page.locator('.popup-local [data-detalhe]').click();
    const janela = page.locator('#detalheLocal');
    await expect(janela).toBeVisible();
    await expect(page.locator('#detalheTitulo')).toHaveText('RECIFE - PE');
    await expect(page.locator('#detalheIndicadores b')).toHaveText(['10', '3', '2', '4', '2']);

    await expect(linhas(page, 'tblDetalhe')).toHaveCount(3);                          // aba Placas
    await expect(linhas(page, 'tblDetalhe').first()).toContainText('GHI7J89');
    await expect(linhas(page, 'tblDetalhe').first()).toContainText('PEDRO LIMA (5)');
    await page.locator('#detalheAbas button', { hasText: 'Motoristas' }).click();
    await expect(linhas(page, 'tblDetalhe')).toHaveCount(2);
    await expect(linhas(page, 'tblDetalhe').filter({ hasText: 'ANA COSTA' })).toContainText('JKL0M12 (4), XX123 (1)');
    await page.locator('#detalheAbas button', { hasText: 'Eventos' }).click();
    await expect(linhas(page, 'tblDetalhe')).toHaveCount(10);
    await expect(linhas(page, 'tblDetalhe').first()).toContainText('19/09/2026, 04:15');

    await page.locator('#detalheBusca').fill('7002');                                 // SM
    await expect(linhas(page, 'tblDetalhe')).toHaveCount(2);
    await expect(page.locator('#detalheNota')).toHaveText('2 de 10 na busca');
    await page.keyboard.press('KeyL');                                                // digitar "l" não limpa os filtros do painel
    await expect(page.locator('#detalheBusca')).toHaveValue('7002l');

    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#detalheExportar').click()]);
    expect(download.suggestedFilename()).toBe('excecoes_recife_pe.csv');
    const texto = (await readFile(await download.path(), 'utf8')).replace(/^\ufeff/, '');
    expect(texto.split('\r\n')).toHaveLength(11);

    await page.keyboard.press('Escape');
    await expect(janela).toBeHidden();
  });

  test('mapa: clicar numa placa nos detalhes filtra o painel por ela', async ({ page }) => {
    await linhas(page, 'tblLoc').first().click();
    await page.locator('.popup-local [data-detalhe]').click();
    await linhas(page, 'tblDetalhe').filter({ hasText: 'JKL0M12' }).click();
    await expect(page.locator('#detalheLocal')).toBeHidden();
    await expect(page.locator('#activeFilters')).toContainText('placa JKL0M12');
    await expect(kpi(page, 0)).toHaveText('5');
  });

  test('ordenação das tabelas', async ({ page }) => {
    const cabecalho = page.locator('#tblCli th[data-k="cliente"]');
    await cabecalho.click();
    await expect(cabecalho).toHaveClass(/desc/);
    await expect(linhas(page, 'tblCli').first()).toContainText('TRANSPORTES ALFA');
    await page.locator('#tblCli th[data-k="cliente"]').click();
    await expect(linhas(page, 'tblCli').first()).toContainText('BETA');
  });

  test('atalhos: Ctrl+Alt+L limpa filtros e Ctrl+B recolhe o menu', async ({ page }) => {
    await page.locator('#classChips .chip', { hasText: 'Veículo' }).click();
    await expect(kpi(page, 0)).toHaveText('19');
    await page.keyboard.press('Control+Alt+KeyL');
    await expect(kpi(page, 0)).toHaveText('27');
    await expect(page.locator('#filterBadge')).toBeHidden();

    await page.keyboard.press('Control+KeyB');
    await expect(page.locator('.app')).toHaveClass(/collapsed/);
    await page.reload();                                                               // preferência persiste
    await expect(page.locator('.app')).toHaveClass(/collapsed/);
  });

  test('exporta o CSV filtrado', async ({ page }) => {
    await page.locator('#monthPresets .chip', { hasText: 'set/26' }).click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#btnExport').click()]);
    expect(download.suggestedFilename()).toBe('excecoes_filtradas.csv');
    const texto = (await readFile(await download.path(), 'utf8')).replace(/^﻿/, '');
    const [cabecalho, ...dados] = texto.split('\r\n');
    expect(cabecalho).toContain('cliente;filial;seguradora');
    expect(dados).toHaveLength(17);
  });
});
