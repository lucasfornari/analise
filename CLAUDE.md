# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

"Painel de Exceções · Raster": painel analítico 100% client-side, publicado no **GitHub Pages** (site estático em `/analise/`, sem build). O usuário carrega o export do BI de exceções (`.xlsx`, `.xls` ou `.csv`) e o painel mostra KPIs, gráficos, mapa de calor, reincidência e tabelas com filtros combináveis. Código, identificadores e interface em português (pt-BR). Uso normal: até ~10 mil linhas; o export pode chegar a 150 mil (limite do BI).

Bibliotecas **só via CDN** (jsdelivr, versões fixas):
- no `index.html` (`<script defer>`, globais): `Chart` (Chart.js 4.4.1), `L` + `L.heatLayer` (Leaflet 1.9.4 + leaflet.heat 0.2.0);
- carregadas sob demanda pelo leitor (URLs em `js/config/cdn.js`): fflate 0.8.2 (descompactar .xlsx) e SheetJS 0.18.5 `xlsx.mjs` (só para .xls/.csv e reserva).

As mesmas versões estão em `devDependencies` apenas para os testes — ao trocar a versão de uma lib, atualizar os dois lugares.

## Comandos

```bash
npm ci
npm test                     # tipos + unitários + e2e
npm run tipos                # tsc: tipos JSDoc do catálogo de exceções
npm run test:unit            # node:test, sem navegador
npm run test:e2e             # Playwright em paralelo (sobe tests/servidor.js em http://localhost:4173/analise/)
npm run serve                # servidor local igual ao Pages, para abrir no navegador
node --test --test-name-pattern="converterData" "tests/unit/*.test.js"   # um teste unitário
npx playwright test -g "exporta o CSV"                                   # um teste e2e
```

- Sem acesso ao CDN (ex.: container com proxy): `CDN_LOCAL=1` faz o Playwright servir as libs a partir do `node_modules` (rotas no contexto, para valer também no Web Worker). Se o Chromium estiver instalado fora do padrão, use `PLAYWRIGHT_BROWSERS_PATH`.
- `PAINEL_URL=<url>` roda a suíte e2e contra um site já publicado (sem servidor local).
- Não há planilhas binárias no repositório: `tests/fixtures/planilhas.js` gera em memória o exemplo (27 eventos, valores esperados em `ESPERADO`) e a massa de volume, nos formatos export do BI, "salvo pelo Excel" e CSV.

## CI (`.github/workflows/`)

- `testes.yml`: todo push roda tipos, unitários e e2e com as libs do CDN real. `.github/actions/preparar-playwright` instala só o `chromium-headless-shell`, sem apt.
- `producao.yml`: smoke test (a mesma suíte e2e) contra o site publicado, após cada deploy do Pages, diariamente e manualmente.

## Arquitetura

```
index.html        só marcação; carrega CDN, css/* e js/main.js (type="module")
css/              base (variáveis, botões, utilitários) · layout · filtros · painel · mapa
js/nucleo/        regras puras, sem DOM: catalogoExcecoes, texto, conversores, colunas,
                  normalizacao, filtro, agregacao, detalheLocal, exportacao
js/servicos/      leitorXlsx (leitor rápido), lerPlanilha, leitor.worker.js, LeitorPlanilha (worker + reserva)
js/estado/        Estado: dados, seleção dos filtros, facetas, ordenação/paginação
js/ui/            um componente (classe) por área da tela
js/config/        cores para canvas (tema.js), camadas do mapa, URLs do CDN
js/Painel.js      orquestrador; js/main.js instancia
```

Fluxo: `Painel.abrirArquivo` → `LeitorPlanilha.ler` (Web Worker `leitor.worker.js`) → `lerPlanilha` (leitor rápido `leitorXlsx` para .xlsx; SheetJS para .xls/.csv ou formato não reconhecido) → `normalizarPlanilha` → `Estado.carregar` → `Painel.atualizar(ajustarMapa)` = `estado.recalcular()` (filtro + facetas + agregação) + `redesenhar()` (renderiza todos os componentes). Ordenar/paginar tabelas chama só `redesenhar()`.

Regras importantes:
- **Catálogo de exceções** (`js/nucleo/catalogoExcecoes.js`, `// @ts-check`): cada exceção tem uma classe fixa (`MOTORISTA`, `VEICULO`, `CONTEXTO`) e um grupo; enums congelados e tipos JSDoc checados pelo `tsc`. O catálogo prevalece sobre a coluna "classe" da planilha (que traz "Sistema" e classes trocadas); exceção nova cai em `NAO_CATALOGADA`, usa a classe da planilha e aparece em "Qualidade da leitura" — a correção é incluí-la no catálogo (o teste `catalogo.test.js` lista as do export real).
- **O estado é a fonte da verdade.** Componentes alteram `estado.selecao` (ou `ordenacao`/`limites`) e chamam `painel.atualizar()`; cada `renderizar()` reflete o estado nos controles. Não guardar estado de filtro no DOM.
- Filtros combináveis: período, classe, busca de placa/carreta e 5 listas (`LISTAS` em `Estado.js`: cli, mot, pla, exc, per). `filtrarComFacetas` faz filtro e contagem facetada numa única passada; listas com tudo marcado viram `null` (sem filtro). As listas do menu são montadas por `ListasSelecao` só ao abrir e, por padrão, ocultam opções sem eventos nos demais filtros.
- `js/nucleo` e `js/servicos` não podem tocar em DOM nem em globais do CDN (dependências injetadas: `unzipSync`, `carregarSheetJs`): é o que permite testá-los em Node e rodá-los no worker.
- Comparação de textos da planilha sempre via `normalizarChave`; o rótulo exibido é a primeira grafia vista. Datas em texto são **dd/mm/aaaa**, nunca mm/dd; serial do Excel via `dataDoSerialExcel` (horário local).
- Placas (tabela e reincidência) contam exceções de veículo e contexto; motoristas contam só exceções de motorista. Reincidente = eventos em meses de calendário seguidos; variação mensal = último mês contra o mês de calendário anterior.
- Mapa: calor com um ponto por local (peso = eventos, teto no percentil 95); marcadores só dos 2 mil maiores locais; clique em qualquer ponto abre o resumo do local mais próximo. "Ver detalhes" abre `DetalheLocal` (`<dialog>`): abas Placas/Motoristas/Eventos calculadas por `nucleo/detalheLocal.js`, busca, exportação do local e clique para filtrar o painel pela placa/motorista. Com a janela aberta, `Atalhos` fica desligado.
- Texto vindo da planilha que vai para `innerHTML` passa por `escaparHtml`.

## Convenções

- Classes JS, funções e comentários em português; comentários curtos, só explicando o quê/porquê.
- Caminhos de CSS/JS sempre **relativos** (o site vive em `/analise/`); o servidor de teste reproduz isso e os e2e quebram com caminho absoluto.
- Cores: variáveis em `css/base.css` (`:root`) espelhadas em `js/config/tema.js` para o canvas — manter em sincronia.
- Os e2e falham com qualquer erro de JS, erro de console ou recurso que não carregou; tiles do mapa são bloqueados nos testes. `tests/unit/desempenho.test.js` e `tests/e2e/volume.spec.js` têm limites de tempo.
- Ao alterar comportamento visível, atualizar a versão em `#appVersion` no `index.html`.
- Atalhos: `Ctrl+B` alterna o menu; `Ctrl+Alt+L` (ou `L` fora de campo de texto) limpa filtros; `Esc` limpa a busca e depois fecha a lista aberta.
