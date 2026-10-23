// Relatório em PDF: escolha do cliente, folhas A4 sem transbordar (uma página de PDF por folha) e limpeza.
import { test, expect, carregarPlanilha, enviarArquivo, linhas } from './apoio.js';
import { xlsxDoExport, linhasEmMassa } from '../fixtures/planilhas.js';
import { CATALOGO, ROTULO_CLASSE } from '../../js/nucleo/catalogoExcecoes.js';

// window.print abre a janela do sistema: nos testes, só conta as chamadas. data-manter segura as folhas
// para gerar o PDF de verdade (page.pdf dispara o "afterprint", que descartaria o relatório).
const prepararImpressao = page => page.evaluate(() => {
  document.querySelector('#relatorio').dataset.manter = '1';
  window.print = () => {
    window.__impressoes = (window.__impressoes || 0) + 1;
    // gráficos já carregados quando a janela de impressão abre (senão saem em branco)
    window.__graficosProntos = [...document.querySelectorAll('#relatorio img')].every(i => i.complete && i.naturalWidth > 0);
  };
});
const impressoes = page => page.evaluate(() => window.__impressoes || 0);

// Folhas cujo conteúdo passa da altura ou da largura da folha (deve ser sempre vazio).
const transbordam = page => page.evaluate(() => [...document.querySelectorAll('#relatorio .folha-conteudo')]
  .filter(c => c.scrollHeight > c.clientHeight + 1 || [...c.children].some(f => f.scrollWidth > c.clientWidth + 1))
  .map(c => c.closest('.folha').dataset.secao));

async function paginasDoPdf(page) {
  const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1');
  return { paginas: (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length, a4: /\/MediaBox\s*\[0 0 59[45]\.\d+ 841\.\d+\]/.test(pdf) };
}

test('relatório de um cliente: escolha, 8 folhas A4, uma página por folha, capa e sumário', async ({ page }) => {
  await page.goto('./');
  await carregarPlanilha(page);
  await prepararImpressao(page);
  await page.locator('#btnRelatorio').click();
  const janela = page.locator('#relatorioEscolha');
  await expect(janela).toBeVisible();
  await expect(page.locator('#relatorioGerar')).toBeDisabled();                      // precisa escolher
  await expect(page.locator('#relatorioClientes label')).toHaveCount(4);              // carteira + 3 clientes
  await page.locator('#relatorioBusca').fill('alfa');
  await expect(page.locator('#relatorioClientes label:visible')).toHaveCount(2);      // carteira sempre aparece
  await page.locator('#relatorioClientes label', { hasText: 'TRANSPORTES ALFA' }).click();
  await page.locator('#relatorioGerar').click();
  await expect(janela).toBeHidden();
  await expect.poll(() => impressoes(page)).toBe(1);

  const folhas = page.locator('#relatorio .folha');
  await expect(folhas).toHaveCount(8);
  expect(await folhas.evaluateAll(f => f.map(x => x.dataset.secao)))
    .toEqual(['capa', 'resumo', 'viagens', 'excecoes', 'motoristas', 'veiculos', 'locais', 'notas']);
  await expect(page.locator('.capa-titulo')).toHaveText('TRANSPORTES ALFA LTDA');
  await expect(page.locator('.capa-numeros')).toContainText('16exceções');
  await expect(page.locator('.capa-numeros')).toContainText('5viagens com exceções');
  await expect(page).toHaveTitle(/^Relatório de exceções - TRANSPORTES ALFA - 03-07-2026 a 12-09-2026$/);
  await expect(page.locator('.sumario-rel li').first()).toContainText('Viagens e exceções por viagem3');
  // último mês contra o anterior: tabela com as três medidas e a conclusão pelas exceções por viagem
  const resumo = folhas.nth(1);
  await expect(resumo.locator('.comparacao-rel tbody tr')).toHaveText([/^Viagens com exceção12/, /^Exceções48/, /^Exceções por viagem4,04,0/]);
  await expect(resumo.locator('.conclusao-rel')).toHaveText('Em set/26 houve mais viagens com exceção e mais exceções que em ago/26. Resultado: ficou estável. Cada viagem teve, em média, 4,0 exceções, como em ago/26 (4,0).');
  await expect(folhas.nth(2).locator('.conclusao-rel')).toHaveCount(1);   // a mesma conclusão na folha de viagens
  await expect(folhas.nth(4).locator('tbody tr').first()).toContainText('JOÃO DA SILVA');
  await expect(folhas.nth(4).locator('tbody tr').first()).toContainText('Velocidade excedida faixa 1770,0%');
  await expect(folhas.last().locator('.rodape-pagina')).toHaveText('Página 8 de 8');
  expect(await page.evaluate(() => window.__graficosProntos)).toBe(true);
  expect(await transbordam(page)).toEqual([]);
  expect(await paginasDoPdf(page)).toEqual({ paginas: 8, a4: true });
});

test('um único cliente no filtro: gera direto, sem perguntar; depois da impressão tudo é descartado', async ({ page }) => {
  await page.goto('./');
  await carregarPlanilha(page);
  await linhas(page, 'tblCli').filter({ hasText: 'GAMA' }).click();                  // isola o cliente
  await page.evaluate(() => { window.print = () => { window.__impressoes = (window.__impressoes || 0) + 1; }; });
  const titulo = await page.title();
  await page.locator('#btnRelatorio').click();
  await expect.poll(() => impressoes(page)).toBe(1);
  await expect(page.locator('#relatorioEscolha')).toBeHidden();
  await expect(page.locator('.capa-titulo')).toHaveText('GAMA CARGAS');
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  await expect(page.locator('#relatorio .folha')).toHaveCount(0);
  await expect(page).toHaveTitle(titulo);
});

test('carteira com 20 mil eventos e 34 clientes: 9 folhas, nada transborda, dentro do tempo', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('./');
  await enviarArquivo(page, 'carteira.xlsx', xlsxDoExport(linhasEmMassa(20_000, CATALOGO.map(d => [d.nome, ROTULO_CLASSE[d.classe]]))));
  await expect(page.locator('#fileInfo')).toContainText('20.000 eventos', { timeout: 30_000 });
  await prepararImpressao(page);
  await page.locator('#btnRelatorio').click();
  await page.locator('#relatorioClientes label', { hasText: 'Todos os clientes' }).click();
  const inicio = Date.now();
  await page.locator('#relatorioGerar').click();
  await expect.poll(() => impressoes(page)).toBe(1);
  const ms = Date.now() - inicio;
  console.log(`  relatório da carteira (20 mil eventos): ${ms} ms`);
  expect(ms).toBeLessThan(10_000);
  const folhas = await page.locator('#relatorio .folha').count();
  expect(folhas).toBeGreaterThanOrEqual(9);                                           // a lista de clientes pode continuar em outra folha
  await expect(page.locator('.capa-titulo')).toHaveText('Carteira de clientes');
  await expect(page.locator('#relatorio .folha[data-secao="clientes"] tbody tr')).toHaveCount(34);
  await expect(page.locator('#relatorio .folha[data-secao="motoristas"] tbody tr')).toHaveCount(10);
  expect(await transbordam(page)).toEqual([]);
  expect((await paginasDoPdf(page)).paginas).toBe(folhas);
});
