// Fixture compartilhada: falha o teste se houver erro de JS, erro no console ou recurso que não carregou.
import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

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

    await page.route(TILES, r => r.abort());
    // CDN_LOCAL=1: ambiente sem acesso ao CDN; serve as mesmas versões a partir do node_modules
    if (process.env.CDN_LOCAL) {
      await page.route(/cdn\.jsdelivr\.net\/npm\//, async r => {
        const [, pacote, arquivo] = new URL(r.request().url()).pathname.match(/^\/npm\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.+)$/);
        const tipo = arquivo.endsWith('.css') ? 'text/css' : 'text/javascript';
        await r.fulfill({ contentType: tipo, body: await readFile(`${RAIZ}node_modules/${pacote}/${arquivo}`) });
      });
      await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ contentType: 'text/css', body: '' }));
    }

    await use(page);
    expect(erros.filter(e => !errosPermitidos.some(p => p.test(e))), 'erros durante o teste').toEqual([]);
  }
});

export { expect };

export const FIXTURES = fileURLToPath(new URL('../fixtures/', import.meta.url));

export async function carregarPlanilha(page, arquivo = 'excecoes.csv') {
  await page.locator('#fileInput').setInputFiles(FIXTURES + arquivo);
  await expect(page.locator('#dash')).toBeVisible();
}

export const kpi = (page, i) => page.locator('#kpis .kpi .v').nth(i);
