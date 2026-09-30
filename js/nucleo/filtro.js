// Aplicação dos filtros do painel sobre os registros.
import { chavePlaca } from './texto.js';

// Listas de multisseleção: chave da lista -> campo do registro.
export const CAMPO_DA_LISTA = Object.freeze({ exc: 'excecao', cli: 'cliente', mot: 'motorista', pla: 'placa', per: 'perfil' });
const LISTAS = Object.keys(CAMPO_DA_LISTA);

// filtro: { de, ate: 'AAAA-MM-DD', classes: Set | null, placa: texto (busca em placa e carreta),
//           semDuplicados: bool, listas: { exc, cli, mot, pla, per: Set | null } }  (null = sem filtro)

// Filtros que não são listas.
function criarFiltroBase(filtro) {
  const placa = chavePlaca(filtro.placa || '');
  const { de, ate, classes, semDuplicados } = filtro;
  return r =>
    (!semDuplicados || !r.dup) &&
    (!de || (r.dia !== null && r.dia >= de)) &&
    (!ate || (r.dia !== null && r.dia <= ate)) &&
    (!classes || classes.has(r.classe)) &&
    (!placa || r.placa.includes(placa) || r.carreta.includes(placa));
}

const listasAtivas = filtro => LISTAS.filter(l => filtro.listas?.[l]).map(l => ({ lista: l, campo: CAMPO_DA_LISTA[l], valores: filtro.listas[l] }));

export function filtrar(registros, filtro) {
  const passaBase = criarFiltroBase(filtro), ativas = listasAtivas(filtro);
  return registros.filter(r => passaBase(r) && ativas.every(a => a.valores.has(r[a.campo])));
}

// Filtra e calcula a contagem facetada numa única passada.
// facetas[lista]: quantos eventos cada opção teria com os DEMAIS filtros aplicados — o que permite
// combinar filtros de forma dinâmica (escolher um cliente mostra só os motoristas dele).
export function filtrarComFacetas(registros, filtro) {
  const passaBase = criarFiltroBase(filtro), ativas = listasAtivas(filtro);
  const facetas = Object.fromEntries(LISTAS.map(l => [l, new Map()]));
  const contar = (lista, valor) => { if (valor) facetas[lista].set(valor, (facetas[lista].get(valor) || 0) + 1); };
  const filtrados = [];

  for (const r of registros) {
    if (!passaBase(r)) continue;
    let reprovadas = 0, reprovada = null;
    for (const a of ativas) {
      if (!a.valores.has(r[a.campo])) { reprovada = a; if (++reprovadas > 1) break; }
    }
    if (reprovadas === 0) {
      filtrados.push(r);
      for (const l of LISTAS) contar(l, r[CAMPO_DA_LISTA[l]]);
    } else if (reprovadas === 1) {
      // reprovado só pela própria lista: conta como opção disponível nela
      contar(reprovada.lista, r[reprovada.campo]);
    }
  }
  return { filtrados, facetas };
}
