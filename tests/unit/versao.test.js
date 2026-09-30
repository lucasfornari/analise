import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proximaVersao } from '../../scripts/versao.js';

test('versão semântica pelo padrão Conventional Commits', () => {
  const casos = [
    [null, ['feat: catálogo de exceções'], 'v0.1.0', 'primeira versão com funcionalidade'],
    [null, ['ajuste inicial'], 'v0.0.1', 'primeira versão só com correção'],
    ['v0.1.2', ['fix: filtro de placa'], 'v0.1.3', 'correção'],
    ['v0.1.2', ['Atualiza textos'], 'v0.1.3', 'sem prefixo conta como correção'],
    ['v0.1.2', ['fix: a', 'feat(mapa): detalhes do local'], 'v0.2.0', 'funcionalidade com escopo'],
    ['v0.1.2', ['Merge pull request #7 from x/y\n\nfeat: janela de detalhes'], 'v0.2.0', 'título do PR no corpo do merge'],
    ['v0.2.0', ['feat!: novo formato de planilha'], 'v1.0.0', 'quebra com "!"'],
    ['v1.4.2', ['fix: leitura\n\nBREAKING CHANGE: remove suporte a .xls'], 'v2.0.0', 'quebra no rodapé'],
    ['v0.3.1', [], 'v0.3.1', 'sem commits novos: mesma versão'],
    ['v0.1.2', ['refactor: fixture de feat: no meio do texto'], 'v0.1.3', '"feat:" só vale no início da linha']
  ];
  for (const [ultima, mensagens, esperada, caso] of casos) assert.equal(proximaVersao(ultima, mensagens), esperada, caso);
});
