// Desenho de cada folha do relatório, pelo id usado em js/config/relatorio.js.
// Para criar uma folha nova: cálculo em js/nucleo/relatorio/secoes (se precisar de dados), desenho aqui e o id na configuração.
import { capa } from './capa.js';
import { resumo } from './resumo.js';
import { viagens } from './viagens.js';
import { excecoes } from './excecoes.js';
import { clientes } from './clientes.js';
import { motoristas, veiculos, locais } from './listas.js';
import { notas } from './notas.js';

export const DESENHO_DA_FOLHA = Object.freeze({ capa, resumo, viagens, excecoes, clientes, motoristas, veiculos, locais, notas });
export { preencherSumario } from './resumo.js';
