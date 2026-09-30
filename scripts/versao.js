// Próxima versão semântica (vMAIOR.MENOR.CORREÇÃO) a partir do último tag e das mensagens dos commits
// desde ele, no padrão Conventional Commits:
//   "feat!:" ou "BREAKING CHANGE" -> maior | "feat:" -> menor | qualquer outro -> correção
// Uso no deploy: node scripts/versao.js  (imprime a versão, ex.: v0.2.0)
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const QUEBRA = /^\w+(\([^)]*\))?!:|^BREAKING[ -]CHANGE/m;
const FUNCIONALIDADE = /^feat(\([^)]*\))?:/im;

// ultima: 'v0.1.2' ou null (sem tag ainda); mensagens: textos completos dos commits desde o tag.
export function proximaVersao(ultima, mensagens) {
  const [maior, menor, correcao] = (ultima || 'v0.0.0').replace(/^v/, '').split('.').map(Number);
  if (ultima && !mensagens.length) return ultima;   // nada novo: republica a mesma versão
  if (mensagens.some(m => QUEBRA.test(m))) return `v${maior + 1}.0.0`;
  if (mensagens.some(m => FUNCIONALIDADE.test(m))) return `v${maior}.${menor + 1}.0`;
  return `v${maior}.${menor}.${correcao + 1}`;
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let ultima = null;
  try { ultima = git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*.[0-9]*.[0-9]*'); } catch { /* sem tag ainda */ }
  const faixa = ultima ? `${ultima}..HEAD` : 'HEAD';
  const mensagens = git('log', '--format=%B%x00', faixa).split('\0').map(m => m.trim()).filter(Boolean);
  console.log(proximaVersao(ultima, mensagens));
}
