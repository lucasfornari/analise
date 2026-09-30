// Fixture compartilhada: falha o teste se houver erro de JS, erro no console ou recurso que não carregou.
import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { linhasDeExemplo, xlsxDoExport, xlsxDoExcel, csvDoExport } from '../fixtures/planilhas.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
// tiles do mapa vêm de serviços externos fora do nosso controle: bloqueados para o teste ser determinístico
const TILES = /arcgisonline\.com|cartocdn\.com|openstreetmap\.fr/;

export const test = base.extend({
  // mensagens de erro que o próprio teste provoca de propósito
  errosPermitidos: [[], { option: true }],
  page: async ({ page, errosPermitidos }, use) => {
    const erros = [];
    page.on('pageerror', e => erros.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) erros.push('console: ' + m.text()); });
    page.on('requestfailed', r => { if (!TILES.test(r.url()) && !(process.env.CDN_LOCAL && /fonts\./.test(r.url()))) erros.push('request: ' + r.url()); });
    page.on('response', r => { if (r.status() >= 400 && !TILES.test(r.url())) erros.push(`HTTP ${r.status()}: ${r.url()}`); });

    // rotas no contexto (e não na página) para valer também para o Web Worker de leitura
    const contexto = page.context();
    await contexto.route(TILES, r => r.abort());
    // CDN_LOCAL=1: ambiente sem acesso ao CDN; serve as mesmas versões a partir do node_modules
    if (process.env.CDN_LOCAL) {
      await contexto.route(/cdn\.jsdelivr\.net\/npm\//, async r => {
        const [, pacote, arquivo] = new URL(r.request().url()).pathname.match(/^\/npm\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.+)$/);
        const tipo = arquivo.endsWith('.css') ? 'text/css' : 'text/javascript';
        await r.fulfill({ contentType: tipo, headers: { 'access-control-allow-origin': '*' }, body: await readFile(`${RAIZ}node_modules/${pacote}/${arquivo}`) });
      });
      await contexto.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ contentType: 'text/css', body: '' }));
    }

    await use(page);
    expect(erros.filter(e => !errosPermitidos.some(p => p.test(e))), 'erros durante o teste').toEqual([]);
  }
});

export { expect };

// Planilhas de exemplo nos formatos aceitos, geradas em memória.
export const PLANILHAS = {
  'export.xlsx': () => xlsxDoExport(linhasDeExemplo()),
  'salvo-no-excel.xlsx': () => xlsxDoExcel(linhasDeExemplo(), [['Capa', [['sem cabeçalho']]]]),
  'export.csv': () => csvDoExport(linhasDeExemplo())
};

export async function enviarArquivo(page, name, bytes) {
  await page.locator('#fileInput').setInputFiles({ name, mimeType: 'application/octet-stream', buffer: Buffer.from(bytes) });
}

export async function carregarPlanilha(page, nome = 'export.xlsx') {
  await enviarArquivo(page, nome, PLANILHAS[nome]());
  await expect(page.locator('#dash')).toBeVisible();
}

export const kpi = (page, i) => page.locator('#kpis .kpi .v').nth(i);
export const linhas = (page, tabela) => page.locator(`#${tabela} tbody tr`);
