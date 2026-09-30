// Servidor estático que imita o GitHub Pages: publica a raiz do repositório em /analise/,
// o que pega caminhos absolutos (ex.: "/css/x.css") que quebrariam em produção.
// RAIZ_SITE: publica outra pasta (o pacote montado pelo deploy, para testá-lo antes de ir ao ar).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(process.env.RAIZ_SITE || resolve(fileURLToPath(import.meta.url), '../..'));
const BASE = '/analise/';
const PORTA = Number(process.env.PORTA || 4173);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.csv': 'text/csv', '.xlsx': 'application/octet-stream', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!caminho.startsWith(BASE)) { res.writeHead(404).end('fora do site'); return; }
  let relativo = caminho.slice(BASE.length);
  if (!relativo || relativo.endsWith('/')) relativo += 'index.html';
  relativo = normalize(relativo).replace(/^(\.\.[/\\])+/, '');   // impede sair da raiz
  try {
    const corpo = await readFile(join(RAIZ, relativo));
    res.writeHead(200, { 'Content-Type': TIPOS[extname(relativo)] || 'application/octet-stream' }).end(corpo);
  } catch {
    res.writeHead(404).end('não encontrado');
  }
}).listen(PORTA, () => console.log(`Servindo em http://localhost:${PORTA}${BASE}`));
