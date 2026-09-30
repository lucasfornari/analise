# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

"Painel de Exceções · Raster": painel analítico 100% client-side em **um único arquivo, `index.html`** (HTML + CSS + JS inline, sem build, sem package.json, sem testes versionados). O usuário carrega o export do BI de exceções (`.xlsx`, `.xls` ou `.csv`) e o painel mostra KPIs, gráficos, mapa de calor e tabelas com filtros. Toda a interface e os identificadores estão em português (pt-BR).

Dependências via CDN (jsdelivr), declaradas no `<head>`: SheetJS (`XLSX`), Chart.js 4, Leaflet 1.9 + leaflet.heat, fontes Barlow/Barlow Condensed (Google Fonts).

## Rodar e testar

- Abrir `index.html` direto no navegador (ou `python3 -m http.server` na raiz) e carregar uma planilha. Precisa de internet para os CDNs e tiles do mapa.
- O bloco `<script id="core">` é puro (sem DOM) e exporta `Core` via `module.exports`, para ser testado em Node extraindo o script:

```bash
node -e "
const h=require('fs').readFileSync('index.html','utf8');
const module={exports:{}}; eval(h.match(/<script id=\"core\">([\s\S]*?)<\/script>/)[1]);
const Core=module.exports;
console.log(Core.parseDate('05/03/2026 10:20'), Core.tipoOf('EQ','Violação de baú'));"
```

Mantenha esse bloco livre de DOM/`XLSX` global (o `SSF` do SheetJS é passado como parâmetro) para preservar essa testabilidade.

## Arquitetura

Dois `<script>` no fim do arquivo:

1. **`Core` (`<script id="core">`)** — leitura, normalização e agregação:
   - `findHeader` procura, nas 30 primeiras linhas, a linha com `CLIENTE` e uma coluna iniciando por `EXCEC`. `mapColumns` resolve colunas pelos nomes em `COLS` (match exato por prioridade, depois por prefixo; `data` só aceita exato). Obrigatórias: `cliente`, `excecao`, `data`.
   - Comparações usam `strip` (sem acento, maiúsculas, espaços/NBSP colapsados); rótulos exibidos são o primeiro valor bruto visto para cada chave (`label`/`disp`).
   - `normalize` gera registros com `classe` (`EQ` equipamento, `FV` fim de viagem, `CS` contexto suspeito — deduzida pela exceção se a coluna Classe faltar), `tipo`, `csTipo`, `mes`/`dia` (strings `AAAA-MM`/`AAAA-MM-DD`), `local` (referência sem o prefixo "N km de"), placas normalizadas por `plateKey`, e marca duplicados exatos (`dupKey` = viagem|exceção|data|placa). Também devolve `stats` usados no bloco de qualidade dos dados.
   - Datas: serial do Excel via `SSF.parse_date_code`, `dd/mm/aaaa` (padrão BR, nunca mm/dd) ou ISO. Números aceitam formato BR (`1.234,56`).
   - `filter(records, f, skip)` aplica todos os filtros; `skip` ('exc'|'cli'|'per') ignora a própria faceta para calcular contagens das listas. Um filtro `null` significa "todos".
   - `aggregate(F)` calcula todas as agregações do painel (clientes com Pareto, mês×classe, locais, placas — excluindo FV —, motoristas — só FV —, perfis).

2. **Interface (IIFE)** — estado único em `st` (período, classes, conjuntos `exc`/`cli`/`per`, placa, `semDup`, ordenação, paginação "ver mais"). Fluxo: `loadFile` (CSV decodificado UTF-8 com fallback Windows-1252 e `raw: true`; tenta cada aba até `Core.normalize` funcionar) → `init` (reconstrói filtros e universos `UNIV`) → `render(fit)`, que recalcula `FILT`/`AGG` e chama todos os `render*` (KPIs, gráficos Chart.js via `mkChart`, tabelas via `table()`, mapa Leaflet, qualidade). Toda mudança de filtro chama `render`. `currentFilter()` converte `st` no objeto de filtro do `Core` (conjunto completo ⇒ `null`).
   - `LISTS` descreve as três listas multisseleção (exceções, clientes, perfis) — acrescentar uma nova faceta passa por `LISTS`, `UNIV`, `st`, o HTML da `.acc-sec` e `Core.filter`.
   - Exportação CSV usa `;` como separador, BOM UTF-8 e vírgula decimal (compatível com Excel BR).
   - `localStorage` só guarda se o painel lateral está recolhido (`painelFiltros`).

## Convenções

- Paleta/identidade Raster em variáveis CSS no `:root` (`--navy`, `--neon`, `--indigo`…) e espelhada no objeto `C` do JS para os gráficos; cores de classe em `CLASS_COLOR`.
- Ao alterar comportamento visível, atualizar a string de versão em `#appVersion` (ex.: `versão 28/09/2026 · r9`).
- Atalhos de teclado: `Ctrl+B` alterna o painel de filtros; `Ctrl+Alt+L` (ou `L` fora de campo de texto) limpa filtros; `Esc` fecha flyouts/limpa busca.
