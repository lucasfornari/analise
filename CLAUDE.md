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
npx playwright test -g "detalhes do local"                               # um teste e2e
```

- Sem acesso ao CDN (ex.: container com proxy): `CDN_LOCAL=1` faz o Playwright servir as libs a partir do `node_modules` (rotas no contexto, para valer também no Web Worker). Se o Chromium estiver instalado fora do padrão, use `PLAYWRIGHT_BROWSERS_PATH`.
- `PAINEL_URL=<url>` roda a suíte e2e contra um site já publicado (sem servidor local).
- Não há planilhas binárias no repositório: `tests/fixtures/planilhas.js` gera em memória o exemplo (27 eventos, valores esperados em `ESPERADO`) e a massa de volume, nos formatos export do BI, "salvo pelo Excel" e CSV.

## CI (`.github/workflows/`)

- `testes.yml`: todo push fora do `main` roda tipos, unitários e e2e com as libs do CDN real. `.github/actions/preparar-playwright` instala só o `chromium-headless-shell`, sem apt.
- `publicar.yml` (merge no `main`), dois jobs em sequência: **1. testar** calcula a versão, monta o pacote em `_site/` (só `index.html`, `css/`, `js/`) com `js/config/versao.js` gravado e roda os testes **contra o pacote** (`RAIZ_SITE=_site`); **2. publicar** só roda se o 1 passar (é o único com o ambiente `github-pages`, então nenhum deployment é aberto antes dos testes), publica o pacote testado e cria o tag `vX.Y.Z` + Release. Requer Settings > Pages > Source = "GitHub Actions".
- `producao.yml`: smoke test (a mesma suíte e2e) contra o site publicado quando o `Publicar` termina com sucesso (`workflow_run`) e manualmente (o agendamento diário está comentado no arquivo, desligado de propósito). Sempre confere a versão da Release mais recente (`VERSAO_ESPERADA`); após um deploy, também o commit publicado (`COMMIT_ESPERADO`).
- Runners fixos em `ubuntu-24.04` (não `ubuntu-latest`): o CI instala só o `chromium-headless-shell`, sem as bibliotecas do sistema (apt), e depende das que vêm na imagem. Migrar de versão é decisão explícita: troque nos 3 workflows e confira os testes no PR.
- O teste do rodapé tem três cenários (local, pacote via `RAIZ_SITE`, site no ar via `PAINEL_URL`): ao mudar a versão ou o deploy, valide os três (ver comandos acima).

## Versionamento

Semântico e automático (`scripts/versao.js`, padrão Conventional Commits), calculado desde o último tag a partir das mensagens dos commits e do título do PR (que entra no merge):
- `feat!:` ou `BREAKING CHANGE` → maior (v0.4.2 → v1.0.0)
- `feat:` → menor (v0.4.2 → v0.5.0)
- qualquer outro (`fix:`, `refactor:`, `test:`, sem prefixo…) → correção (v0.4.2 → v0.4.3)

Quando usar cada um (combinado com o dono do projeto):
- `feat:` só para funcionalidade nova de verdade: nova tela, aba, filtro, gráfico, tipo de análise ou de arquivo aceito.
- `fix:` para todo o resto que o usuário percebe: correções, ajustes de UX/layout, textos e melhorias pequenas em algo que já existe (ex.: tooltip a mais, coluna reordenada, rótulo que não corta), mesmo que acrescentem algo.
- `refactor:`, `test:`, `ci:`, `docs:` para mudanças sem efeito visível; também viram correção.
- Um PR que mistura tipos usa o mais forte no título; na dúvida entre `feat:` e `fix:`, use `fix:`. Não divida um mesmo trabalho em vários PRs só por causa da versão.

Use esses prefixos nos títulos de PR e commits. Não edite a versão à mão: no repositório `js/config/versao.js` fica vazio e o rodapé mostra "versão local (desenvolvimento)".

## Arquitetura

```
index.html        só marcação; carrega CDN, css/* e js/main.js (type="module")
css/              base (variáveis, botões, utilitários) · layout · filtros · painel · mapa
js/nucleo/        regras puras, sem DOM: catalogoExcecoes, texto, conversores, colunas, coordenadas,
                  normalizacao, filtro, agregacao, agrupamentoMapa, detalheLocal, exportacao
js/nucleo/relatorio/  cálculo do relatório em PDF: montarRelatorio + uma seção por arquivo (secoes/)
js/servicos/      leitorXlsx (leitor rápido), lerPlanilha, leitor.worker.js, LeitorPlanilha (worker + reserva)
js/estado/        Estado: dados, seleção dos filtros, facetas, ordenação/paginação
js/ui/            um componente (classe) por área da tela; js/ui/relatorio: folhas A4 do PDF
js/config/        cores para canvas (tema.js), camadas do mapa, URLs do CDN, folhas do relatório (relatorio.js)
js/Painel.js      orquestrador; js/main.js instancia
```

Fluxo: `Painel.abrirArquivo` → `LeitorPlanilha.ler` (Web Worker `leitor.worker.js`) → `lerPlanilha` (leitor rápido `leitorXlsx` para .xlsx; SheetJS para .xls/.csv ou formato não reconhecido) → `normalizarPlanilha` → `Estado.carregar` → `Painel.atualizar(ajustarMapa)` = `estado.recalcular()` (filtro + facetas + agregação) + `redesenhar()` (renderiza todos os componentes). Ordenar/paginar tabelas chama só `redesenhar()`.

Regras importantes:
- **Catálogo de exceções** (`js/nucleo/catalogoExcecoes.js`, `// @ts-check`): cada exceção tem uma classe fixa (`MOTORISTA`, `VEICULO`, `CONTEXTO`) e um grupo; enums congelados e tipos JSDoc checados pelo `tsc`. O catálogo prevalece sobre a coluna "classe" da planilha (que traz "Sistema" e classes trocadas); exceção nova cai em `NAO_CATALOGADA`, usa a classe da planilha e aparece em "Qualidade da leitura" — a correção é incluí-la no catálogo (o teste `catalogo.test.js` lista as do export real).
- **O estado é a fonte da verdade.** Componentes alteram `estado.selecao` (ou `ordenacao`/`limites`) e chamam `painel.atualizar()`; cada `renderizar()` reflete o estado nos controles. Não guardar estado de filtro no DOM.
- Filtros combináveis: período, classe, busca de placa/carreta e 5 listas (`LISTAS` em `Estado.js`: cli, mot, pla, exc, per). `filtrarComFacetas` faz filtro e contagem facetada numa única passada; listas com tudo marcado viram `null` (sem filtro). As listas do menu são montadas por `ListasSelecao` só ao abrir e, por padrão, ocultam opções sem eventos nos demais filtros.
- `js/nucleo` e `js/servicos` não podem tocar em DOM nem em globais do CDN (dependências injetadas: `unzipSync`, `carregarSheetJs`): é o que permite testá-los em Node e rodá-los no worker.
- **Coordenadas** (`nucleo/coordenadas.js`): o BI às vezes exporta a longitude DOBRADA (latitude certa; ex.: Ponte Serrada/SC em -103.779 em vez de -51.8895, no Pacífico). `corrigirLongitude` divide por 2 (exato, sem perda de precisão) só quando o ponto está fora da UF da referência e a metade cai dentro dela, ou, sem UF, quando está no Pacífico (sul, a oeste de -82). Pontos legítimos fora do Brasil não mudam ("LIMA/PE" é Peru). Contagem em "Qualidade da leitura".
- Comparação de textos da planilha sempre via `normalizarChave`; o rótulo exibido é a primeira grafia vista. Datas em texto são **dd/mm/aaaa**, nunca mm/dd; serial do Excel via `dataDoSerialExcel` (horário local).
- Placas (tabela e reincidência) contam exceções de veículo e contexto; motoristas contam só exceções de motorista. Reincidente = eventos em meses de calendário seguidos; variação mensal = último mês contra o mês de calendário anterior.
- Mapa: **um ponto por coordenada** (`agregado.pontos`, lat/long arredondadas em 5 casas ≈ 1 m), nunca pela referência em texto — `agregado.locais` (agrupado pela referência, sem a distância "x km de") é só para a tabela "Locais ofensores". Pontos são leves (o export real tem ~120 mil coordenadas): grupos, clientes e referências só via `completarPonto` ao desenhar/abrir. Calor com peso = eventos do ponto e teto no percentil 95 das células do leaflet.heat (`tetoDoCalor`). Marcadores: com o mapa afastado, pontos a menos de 40 px viram um grupo (`nucleo/agrupamentoMapa.js`, configurado em `AGRUPAMENTO` de `config/mapa.js`); a partir do zoom 14 cada coordenada aparece sozinha. Só a área visível é desenhada (no máximo 2 mil). Clique num grupo aproxima o mapa; numa coordenada (ou no calor perto dela) abre o resumo. Clicar num local da tabela vai às suas coordenadas. "Ver detalhes" abre `DetalheLocal` (`<dialog>`) da coordenada: abas Placas/Motoristas/Exceções/Eventos calculadas por `nucleo/detalheLocal.js`, busca, exportação do local e clique para filtrar o painel pela placa/motorista/exceção. Com a janela aberta, `Atalhos` fica desligado.
- **Exceções pelo nome, nunca só pela classe/grupo**: cada entidade (cliente, motorista, placa, local, perfil, coordenada e, nos detalhes, placa/motorista/exceção do local) tem `porExcecao` (Map nome → quantidade), com a mesma regra do seu total — a soma bate com a coluna de eventos (teste `excecoes-por-entidade.test.js`). Na tela: `etiquetasExcecoes` (principais com quantidade + "+N") e tooltip com a lista completa via `dicaExcecoes`. A classe de cada nome vem de `agregado.classeDaExcecao`.
- Tooltip global `Dica` (`#dica`): célula com `data-dica` mostra o HTML de `_dica(elemento)` do contêiner mais próximo; na `Tabela`, basta a coluna ter `dica: linha => html` (calculado só no hover). Dentro do `<dialog>` o balão é movido para o próprio dialog (camada superior). Rolar a página esconde o balão e ele volta no fim da rolagem se o mouse ainda estiver no alvo.
- Tabelas mês a mês (clientes mês a mês, reincidentes): mostram os meses mais recentes que cabem sem rolagem (de 6 a 3, `#ajustarMeses` em `Tabelas.js`, refeito ao redimensionar); "Ver os N meses" mostra todos com a 1ª coluna fixa. Só muda a exibição: variação, sequência e totais usam todos os meses. Gráfico mensal: com mais de 8 meses, rótulo em duas linhas; valores nas barras só se todos couberem. `tests/e2e/meses.spec.js` mede cortes com 12 meses em 1280/1440/1920 px.
- Tooltip do mapa: ao passar o mouse, o ponto ou grupo mais próximo (mesmo critério do clique, no agrupamento do zoom atual) mostra as exceções com %; grupo soma as exceções dos seus pontos (`excecoesDoGrupo`, guardado no grupo).
- Layout desktop (mobile fora do escopo): tabelas com muitas colunas (`.g-tabelas`: locais, placas, motoristas, perfis) só ficam lado a lado acima de 1800 px; abaixo, uma por linha, para nenhuma coluna ficar cortada.
- **Relatório em PDF** ("Gerar relatório PDF", impressão do navegador → "Salvar como PDF"): um cliente (perguntado na hora, ou direto se o filtro já tem um só) ou a carteira inteira, sempre com os filtros do painel. Folhas A4 na ordem de `FOLHAS_DO_RELATORIO` (`js/config/relatorio.js`, com `modos` cliente/carteira) e parâmetros em `OPCOES_DO_RELATORIO` (top N, exceções por item). **Para incluir uma folha**: cálculo em `js/nucleo/relatorio/secoes/<id>.js` (`{ id, titulo, regra, calcular(contexto) }`, registrado em `SECOES`), desenho em `js/ui/relatorio/folhas` (registrado em `DESENHO_DA_FOLHA`) e o id na configuração; a `regra` aparece na folha de notas. Regras: viagens = SMs distintas com exceção, por mês da exceção (conta em cada mês em que teve exceção; no total, uma vez); a folha de viagens e o destaque do resumo mostram sempre juntos viagens, exceções e **exceções por viagem** (com variação de cada um), porque mais exceções com mais viagens não é piora; alertas = exceções; motoristas/veículos com a mesma regra de classe do painel; locais pelo nome da referência, sem "(sem referência)", com centro e raio de 90% dos eventos.
- Paginação do relatório (`Paginador`): as folhas são montadas fora da tela já em mm e cada bloco/linha é medido ao entrar; não coube → tenta `.compacta` → continua numa nova folha com o mesmo título (tabelas repetem o cabeçalho). Os blocos não podem encolher (`flex-shrink:0`), senão a medição engana. Gráficos viram imagem em 3x (`graficoComoImagem`). `@page` A4 sem margem vale para toda impressão da página. `tests/e2e/relatorio.spec.js` gera o PDF de verdade e exige página de PDF = folha e nenhum conteúdo transbordando (`data-manter` no `#relatorio` segura as folhas, porque `page.pdf` dispara o `afterprint` que as descarta).
- Texto vindo da planilha que vai para `innerHTML` passa por `escaparHtml`.

## Convenções

- Classes JS, funções e comentários em português; comentários curtos, só explicando o quê/porquê.
- Caminhos de CSS/JS sempre **relativos** (o site vive em `/analise/`); o servidor de teste reproduz isso e os e2e quebram com caminho absoluto.
- Cores: variáveis em `css/base.css` (`:root`) espelhadas em `js/config/tema.js` para o canvas — manter em sincronia.
- Os e2e falham com qualquer erro de JS, erro de console ou recurso que não carregou; tiles do mapa são bloqueados nos testes. `tests/unit/desempenho.test.js` e `tests/e2e/volume.spec.js` têm limites de tempo.
- Atalhos: `Ctrl+B` alterna o menu; `Ctrl+Alt+L` (ou `L` fora de campo de texto) limpa filtros; `Esc` limpa a busca e depois fecha a lista aberta.
