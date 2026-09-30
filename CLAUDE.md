# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

"Painel de Exceções · Raster": painel analítico 100% client-side, publicado no **GitHub Pages** (site estático em `/analise/`, sem build). O usuário carrega o export do BI de exceções (`.xlsx`, `.xls` ou `.csv`) e o painel mostra KPIs, gráficos, mapa de calor e tabelas com filtros. Código, identificadores e interface em português (pt-BR).

Bibliotecas **só via CDN** (jsdelivr, versões fixas) em `<script defer>` no `index.html`, expostas como globais: `XLSX` (SheetJS 0.18.5), `Chart` (Chart.js 4.4.1), `L` + `L.heatLayer` (Leaflet 1.9.4 + leaflet.heat 0.2.0). As mesmas versões estão em `devDependencies` apenas para os testes — ao trocar a versão de uma lib, atualizar os dois lugares.

## Comandos

```bash
npm ci
npm test                     # unitários + e2e
npm run test:unit            # node:test, sem navegador
npm run test:e2e             # Playwright (sobe tests/servidor.js em http://localhost:4173/analise/)
npm run serve                # servidor local igual ao Pages, para abrir no navegador
node --test --test-name-pattern="converterData" "tests/unit/*.test.js"   # um teste unitário
npx playwright test -g "exporta o CSV"                                   # um teste e2e
node tests/fixtures/gerar-fixtures.js   # regenera as planilhas de teste
```

- Sem acesso ao CDN (ex.: container com proxy): `CDN_LOCAL=1` faz o Playwright servir as libs a partir do `node_modules`. Se o Chromium já estiver instalado fora do padrão, use `PLAYWRIGHT_BROWSERS_PATH`.
- `PAINEL_URL=<url>` roda a suíte e2e contra um site já publicado (sem servidor local).

## CI (`.github/workflows/`)

- `testes.yml`: todo push/PR roda unitários e e2e com as libs do CDN real.
- `producao.yml`: smoke test (a mesma suíte e2e) contra o site publicado, após cada deploy do Pages (`deployment_status`), diariamente e manualmente.

## Arquitetura

```
index.html        só marcação; carrega CDN, css/* e js/main.js (type="module")
css/              base (variáveis, botões, utilitários) · layout · filtros · painel · mapa
js/nucleo/        regras puras, sem DOM: texto, conversores, colunas, classificacao,
                  normalizacao, filtro, agregacao, exportacao
js/servicos/      LeitorPlanilha (SheetJS injetado no construtor)
js/estado/        Estado: dados carregados, seleção dos filtros, ordenação/paginação
js/ui/            um componente (classe) por área da tela
js/config/        cores para canvas (tema.js) e camadas do mapa
js/Painel.js      orquestrador; js/main.js instancia com window.XLSX
```

Fluxo: `Painel.abrirArquivo` → `LeitorPlanilha.ler` (tenta cada aba; CSV em UTF-8 com fallback Windows-1252) → `normalizarPlanilha` → `Estado.carregar` → `Painel.atualizar(ajustarMapa)`, que chama `estado.recalcular()` e depois `renderizar()` de todos os componentes.

Regras importantes:
- **O estado é a fonte da verdade.** Componentes alteram `estado.selecao` (ou `ordenacao`/`limites`) e chamam `painel.atualizar()`; cada `renderizar()` reflete o estado nos controles (checkboxes, datas, chips, campo de placa). Não guardar estado de filtro no DOM.
- Componentes recebem o `painel` no construtor e se comunicam por ele (`painel.mapa.focar`, `painel.filtros.definirPlaca`, `painel.listas.fechar`).
- `js/nucleo` e `js/servicos` não podem tocar em DOM nem em globais do CDN: é o que permite testá-los em Node. Datas seriais do Excel usam o `XLSX.SSF` passado como parâmetro.
- Comparação de textos da planilha sempre via `normalizarChave` (sem acento, maiúsculas, espaços colapsados); o rótulo exibido é a primeira grafia vista. Datas em texto são **dd/mm/aaaa**, nunca mm/dd.
- `filtrar(registros, filtro, ignorar)`: listas com tudo marcado viram `null` (sem filtro) em `Estado.filtroAtual()`; `ignorar` ('exc'|'cli'|'per') calcula a contagem facetada de cada lista.
- Classes: `EQ` equipamento, `FV` fim de viagem, `CS` contexto suspeito (deduzida pela exceção quando a coluna Classe vem vazia). Placas ignoram FV; motoristas só contam FV.
- Nova lista de multisseleção: `LISTAS` e `reiniciar()` em `Estado.js`, `universo`, a `<section class="acc-sec">` no HTML e `filtrar()`.
- Texto vindo da planilha que vai para `innerHTML` passa por `escaparHtml`.

## Convenções

- Classes JS, funções e comentários em português; comentários curtos, só explicando o quê/porquê.
- Caminhos de CSS/JS sempre **relativos** (o site vive em `/analise/`); o servidor de teste reproduz isso e os e2e quebram com caminho absoluto.
- Cores: variáveis em `css/base.css` (`:root`) espelhadas em `js/config/tema.js` para o canvas — manter em sincronia.
- Os e2e falham com qualquer erro de JS, erro de console ou recurso que não carregou; tiles do mapa são bloqueados nos testes.
- Ao alterar comportamento visível, atualizar a versão em `#appVersion` no `index.html`.
- Atalhos: `Ctrl+B` alterna o menu; `Ctrl+Alt+L` (ou `L` fora de campo de texto) limpa filtros; `Esc` limpa a busca e depois fecha a lista aberta.
