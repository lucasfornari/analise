// Detalhamento de um local do mapa: eventos agrupados por placa e por motorista, e resumo do local.
import { normalizarChave } from './texto.js';
import { EM_BRANCO } from './filtro.js';

const incrementar = (mapa, chave) => mapa.set(chave, (mapa.get(chave) || 0) + 1);
const maisRecentePrimeiro = (a, b) => (b.data?.getTime() ?? -Infinity) - (a.data?.getTime() ?? -Infinity);
const porTotal = campo => (a, b) => b.total - a.total || a[campo].localeCompare(b[campo]);
const principal = mapa => { let melhor = '', n = -1; for (const [k, v] of mapa) if (v > n) { melhor = k; n = v; } return melhor; };

// Acumula um evento no grupo (placa ou motorista) e guarda a data mais recente.
function acumular(grupos, chave, novo, r) {
  let g = grupos.get(chave);
  if (!g) grupos.set(chave, g = novo());
  g.total++;
  incrementar(g.grupos, r.grupo);
  incrementar(g.clientes, r.cliente);
  if (r.viagem) g.viagens.add(r.viagem);
  if (r.data && (!g.ultimo || r.data > g.ultimo)) g.ultimo = r.data;
  return g;
}

// eventos: registros do local já filtrados pelo painel.
export function detalharLocal(eventos) {
  const placas = new Map(), motoristas = new Map();
  const viagens = new Set(), clientes = new Set();
  let primeiro = null, ultimo = null;

  for (const r of eventos) {
    const placa = r.placa || EM_BRANCO, motorista = r.motorista || EM_BRANCO;
    const p = acumular(placas, placa, () => ({ placa, total: 0, grupos: new Map(), clientes: new Map(), viagens: new Set(), carretas: new Set(), motoristas: new Map(), ultimo: null }), r);
    if (r.carreta) p.carretas.add(r.carreta);
    incrementar(p.motoristas, motorista);
    const m = acumular(motoristas, motorista, () => ({ motorista, total: 0, grupos: new Map(), clientes: new Map(), viagens: new Set(), placas: new Map(), ultimo: null }), r);
    incrementar(m.placas, placa);

    if (r.viagem) viagens.add(r.viagem);
    clientes.add(r.cliente);
    if (r.data) {
      if (!primeiro || r.data < primeiro) primeiro = r.data;
      if (!ultimo || r.data > ultimo) ultimo = r.data;
    }
  }

  // busca: texto normalizado com tudo que identifica a linha
  const listaPlacas = [...placas.values()].map(p => Object.assign(p, {
    cliente: principal(p.clientes), nViagens: p.viagens.size,
    busca: normalizarChave([p.placa, ...p.carretas, ...p.motoristas.keys(), ...p.clientes.keys()].join(' '))
  })).sort(porTotal('placa'));
  const listaMotoristas = [...motoristas.values()].map(m => Object.assign(m, {
    cliente: principal(m.clientes), nViagens: m.viagens.size,
    busca: normalizarChave([m.motorista, ...m.placas.keys(), ...m.clientes.keys()].join(' '))
  })).sort(porTotal('motorista'));
  const listaEventos = [...eventos].sort(maisRecentePrimeiro).map(r => ({
    registro: r, busca: normalizarChave([r.placa, r.carreta, r.motorista, r.viagem, r.excecao, r.cliente].join(' '))
  }));

  return {
    resumo: { eventos: eventos.length, placas: placas.size, motoristas: motoristas.size, viagens: viagens.size, clientes: clientes.size, primeiro, ultimo },
    placas: listaPlacas, motoristas: listaMotoristas, eventos: listaEventos
  };
}

// Filtra linhas do detalhamento pela busca (palavras em qualquer ordem, sem acento e caixa).
export function buscarNoDetalhe(linhas, consulta) {
  const palavras = normalizarChave(consulta).split(' ').filter(Boolean);
  return palavras.length ? linhas.filter(l => palavras.every(p => l.busca.includes(p))) : linhas;
}
