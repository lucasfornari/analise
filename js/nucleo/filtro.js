// Aplicação dos filtros do painel sobre os registros.
import { chavePlaca } from './texto.js';

// filtro: { de, ate: 'AAAA-MM-DD', classes, excecoes, clientes, perfis: Set | null (null = todos),
//           placa: texto, semDuplicados: bool }
// ignorar: 'exc' | 'cli' | 'per' desconsidera aquela lista, para contar as opções dela com os demais filtros.
export function filtrar(registros, filtro, ignorar) {
  const placa = chavePlaca(filtro.placa || '');
  return registros.filter(r =>
    (!filtro.semDuplicados || !r.dup) &&
    (!filtro.de || (r.dia && r.dia >= filtro.de)) &&
    (!filtro.ate || (r.dia && r.dia <= filtro.ate)) &&
    (!filtro.classes || filtro.classes.has(r.classe)) &&
    (ignorar === 'exc' || !filtro.excecoes || filtro.excecoes.has(r.excecao)) &&
    (ignorar === 'cli' || !filtro.clientes || filtro.clientes.has(r.cliente)) &&
    (ignorar === 'per' || !filtro.perfis || filtro.perfis.has(r.perfil)) &&
    (!placa || r.placa.includes(placa) || r.carreta.includes(placa)));
}
