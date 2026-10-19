// Muitos meses em telas de desktop: nenhuma tabela ou gráfico pode cortar colunas ou sobrepor rótulos.
import { test, expect, enviarArquivo } from './apoio.js';
import { xlsxDoExport, linhasEmMassa, espalharEmMeses } from '../fixtures/planilhas.js';
import { CATALOGO, ROTULO_CLASSE } from '../../js/nucleo/catalogoExcecoes.js';

const planilha = xlsxDoExport(espalharEmMeses(linhasEmMassa(5000, CATALOGO.map(d => [d.nome, ROTULO_CLASSE[d.classe]])), 12));

// tabelas visíveis com rolagem horizontal (coluna escondida) e gráficos com rótulos girados
const cortes = page => page.evaluate(() => [
  ...[...document.querySelectorAll('.tbl-wrap:not(.todos-os-meses)')].filter(w => w.offsetParent && w.scrollWidth > w.clientWidth + 1)
    .map(w => 'tabela ' + w.querySelector('table').id),
  ...[...document.querySelectorAll('canvas[id^=ch]')].filter(c => Chart.getChart(c)?.scales.x?.labelRotation > 0).map(c => 'gráfico ' + c.id)
]);

for (const largura of [1280, 1440, 1920]) {
  test(`12 meses em ${largura}px: nada cortado; "ver todos os meses" mostra os 12 com a 1ª coluna fixa`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await page.goto('./');
    await enviarArquivo(page, 'meses.xlsx', planilha);
    await expect(page.locator('#fileInfo')).toContainText('5.000 eventos');
    expect(await cortes(page)).toEqual([]);

    const botao = page.locator('[data-meses="reinc"]');
    await expect(botao).toHaveText('Ver os 12 meses');                              // só os recentes cabem sem rolar
    const colunasMes = () => page.locator('#tblReinc th').filter({ hasText: /^[a-z]{3}\/\d{2}$/ }).count();
    expect(await colunasMes()).toBeGreaterThanOrEqual(3);
    expect(await colunasMes()).toBeLessThanOrEqual(6);
    await expect(page.locator('#tblReinc th').filter({ hasText: 'ago/26' })).toHaveCount(1);   // o mais recente sempre aparece
    await botao.click();
    expect(await colunasMes()).toBe(12);
    await expect(page.locator('#tblReinc').locator('xpath=..')).toHaveClass(/todos-os-meses/);
    await expect(botao).toHaveText('Só os meses recentes');
  });
}
