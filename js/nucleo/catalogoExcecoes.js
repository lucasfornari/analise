// @ts-check
// Catálogo fixo das exceções do BI: cada exceção tem uma única classe e um grupo.
// A classe do catálogo prevalece sobre a coluna "classe" da planilha, que é inconsistente
// (a mesma exceção aparece com classes diferentes e há a classe "Sistema").
import { normalizarChave } from './texto.js';

/** @typedef {'MOTORISTA' | 'VEICULO' | 'CONTEXTO'} ClasseExcecao */

/** @typedef {'VELOCIDADE' | 'PARADA' | 'ROTA' | 'VIAGEM' | 'HORARIO' | 'PANICO'
 *  | 'SEM_POSICAO' | 'ISCA_LOCALIZADOR' | 'VIOLACAO' | 'DESENGATE' | 'BLOQUEIO'
 *  | 'PERDA_SINAL' | 'VALOR_CARGA' | 'PARADA_VIOLACAO' | 'ALERTAS'
 *  | 'NAO_CATALOGADA'} GrupoExcecao */

/** @typedef {{ nome: string, classe: ClasseExcecao, grupo: GrupoExcecao }} DefinicaoExcecao */

/** @type {Readonly<{ MOTORISTA: 'MOTORISTA', VEICULO: 'VEICULO', CONTEXTO: 'CONTEXTO' }>} */
export const CLASSE = Object.freeze({ MOTORISTA: 'MOTORISTA', VEICULO: 'VEICULO', CONTEXTO: 'CONTEXTO' });

/** @type {ReadonlyArray<ClasseExcecao>} */
export const CLASSES = Object.freeze([CLASSE.MOTORISTA, CLASSE.VEICULO, CLASSE.CONTEXTO]);

/** @type {Readonly<Record<ClasseExcecao, string>>} */
export const ROTULO_CLASSE = Object.freeze({ MOTORISTA: 'Motorista', VEICULO: 'Veículo', CONTEXTO: 'Contexto suspeito' });

/** @type {Readonly<Record<GrupoExcecao, string>>} */
export const ROTULO_GRUPO = Object.freeze({
  VELOCIDADE: 'Velocidade',
  PARADA: 'Parada',
  ROTA: 'Rota',
  VIAGEM: 'Início/fim de viagem',
  HORARIO: 'Fora do horário',
  PANICO: 'Pânico / S.O.S',
  SEM_POSICAO: 'Sem posição',
  ISCA_LOCALIZADOR: 'Isca e localizador',
  VIOLACAO: 'Violação',
  DESENGATE: 'Desengate',
  BLOQUEIO: 'Bloqueio',
  PERDA_SINAL: 'Perda de sinal',
  VALOR_CARGA: 'Valor da carga',
  PARADA_VIOLACAO: 'Parada proibida + violação',
  ALERTAS: 'Alertas',
  NAO_CATALOGADA: 'Não catalogada'
});

/** @type {Readonly<Record<GrupoExcecao, ClasseExcecao | null>>} classe a que cada grupo pertence */
export const CLASSE_DO_GRUPO = Object.freeze({
  VELOCIDADE: 'MOTORISTA', PARADA: 'MOTORISTA', ROTA: 'MOTORISTA', VIAGEM: 'MOTORISTA', HORARIO: 'MOTORISTA', PANICO: 'MOTORISTA',
  SEM_POSICAO: 'VEICULO', ISCA_LOCALIZADOR: 'VEICULO', VIOLACAO: 'VEICULO', DESENGATE: 'VEICULO', BLOQUEIO: 'VEICULO',
  PERDA_SINAL: 'CONTEXTO', VALOR_CARGA: 'CONTEXTO', PARADA_VIOLACAO: 'CONTEXTO', ALERTAS: 'CONTEXTO',
  NAO_CATALOGADA: null
});

/** @param {GrupoExcecao} grupo @param {string[]} nomes @returns {DefinicaoExcecao[]} */
const doGrupo = (grupo, nomes) => {
  const classe = CLASSE_DO_GRUPO[grupo];
  if (!classe) throw new Error('Grupo sem classe: ' + grupo);
  return nomes.map(nome => ({ nome, classe, grupo }));
};

// Nomes exatamente como vêm do BI.
/** @type {ReadonlyArray<Readonly<DefinicaoExcecao>>} */
export const CATALOGO = Object.freeze([
  // Motorista
  ...doGrupo('VELOCIDADE', ['EVENTOS DE VELOCIDADE EXCEDIDA', 'VELOCIDADE EXCEDIDA FAIXA 1', 'VELOCIDADE EXCEDIDA FAIXA 2', 'VELOCIDADE EXCEDIDA FAIXA 3']),
  ...doGrupo('PARADA', ['PARADA LOCAL DE COLETA/ENTREGA', 'PARADA LOCAL PERMITIDO NAO INFORMADA', 'PARADA NAO INFORMADA',
    'PARADA PROIBIDA INFORMADA', 'PARADA PROIBIDA INFORMADA EM AREA DE RISCO', 'PARADA PROIBIDA NAO INFORMADA',
    'PARADA PROIBIDA NAO INFORMADA EM AREA DE RISCO', 'PARADA PROIBIDA RAIO DE DESTINO', 'PARADA PROIBIDA RAIO DE ORIGEM',
    'TEMPO DE PARADA EXCEDIDO', 'TEMPO DE PARADA EM MACRO EXCEDIDO', 'TEMPO DE DESCARGA INSUFICIENTE',
    'TEMPO DE NÃO ABERTURA DA PORTA DO MOTORISTA']),
  ...doGrupo('ROTA', ['VEICULO FORA DE ROTA', 'VEICULO CONTINUA FORA DE ROTA', 'VEICULO VOLTANDO NA ROTA',
    'VEICULO CONTINUA VOLTANDO NA ROTA', 'VIAGEM COM ROTA INCORRETA', 'VIAGEM CONTINUA COM ROTA INCORRETA']),
  ...doGrupo('VIAGEM', ['FALTA O INICIO DE VIAGEM', 'REINICIO DE VIAGEM NAO INFORMADO',
    'FINAL DE VIAGEM INFORMADA FORA DO RAIO DE DESTINO', 'FINAL DE VIAGEM NAO INFORMADA',
    'FINAL DE VIAGEM NAO INFORMADA COM ENTREGA PENDENTE', 'PERMANECE COM FINAL DE VIAGEM INFORMADA FORA DO RAIO DE DESTINO',
    'PERMANECE FALTANDO MACRO DE FINAL DE VIAGEM E COM ENTREGA PENDENTE', 'PERMANECE FINAL DE VIAGEM NAO INFORMADA',
    'ENTREGAS PENDENTES (FIM INFORMADO FALTANDO PASSAR EM ALGUM CLIENTE)', 'PERMANECE COM ENTREGAS PENDENTES']),
  ...doGrupo('HORARIO', ['RODANDO FORA DO HORARIO PERMITIDO', 'CONTINUA RODANDO FORA DO HORARIO PERMITIDO']),
  ...doGrupo('PANICO', ['BOTAO DE PANICO', 'S.O.S']),

  // Veículo
  ...doGrupo('SEM_POSICAO', ['SEM POSICAO EM AREA DE RISCO (COM SM)', 'SEM POSICAO EM AREA DE RISCO (SEM SM)',
    'SEM POSICAO FORA DE AREA DE RISCO (COM SM)', 'SEM POSICAO FORA DE AREA DE RISCO (SEM SM)',
    'VEÍCULO ONIXSAT SEM INTELIGÊNCIA EMBARCADA']),
  ...doGrupo('ISCA_LOCALIZADOR', ['ISCA SEM POSIÇÃO', 'ISCA ESTÁ DISTANTE DO VEÍCULO', 'LOCALIZADOR LONGE DE VEICULO - BLOQUEADO',
    'LOCALIZADOR SEM POSICAO']),
  ...doGrupo('VIOLACAO', ['VIOLACAO DE ANTENA', 'VIOLACAO DE BATERIA', 'VIOLACAO DE PAINEL', 'VIOLACAO PORTA BAU',
    'INTERFERENCIA DE JAMMER', 'ALARMANDO DIRETO']),
  ...doGrupo('DESENGATE', ['DESENGATE DA CARRETA 01']),
  ...doGrupo('BLOQUEIO', ['BLOQUEADO MOVIMENTANDO']),

  // Contexto suspeito
  ...doGrupo('PERDA_SINAL', ['ALERTAS DE ANTENA + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)',
    'ALERTAS DE DESENGATE + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)',
    'ALERTAS DE JAMMER + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)',
    'ALERTAS DE PAINEL + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)',
    'ALERTAS DE PANICO + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)',
    'ALERTAS DE PARADA PROIBIDA + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)',
    'BATERIA VIOLADA + PERDA DE SINAL (10 MIN)', 'VEÍCULO SASCAR COM PERDA DE SINAL + PRIMEIRAS VIAGENS']),
  ...doGrupo('VALOR_CARGA', ['ALERTAS DE DESENGATE + VALOR DA SM SUPERIOR AO CONFIGURADO NO PERFIL',
    'PERDAS DE SINAL EM ÁREA + VALOR DA CARGA']),
  ...doGrupo('PARADA_VIOLACAO', ['ALERTAS DE PARADA PROIBIDA + VIOLACOES (ANTENA)', 'ALERTAS DE PARADA PROIBIDA + VIOLACOES (DESENGATE)',
    'ALERTAS DE PARADA PROIBIDA + VIOLACOES (JAMMER)', 'ALERTAS DE PARADA PROIBIDA + VIOLACOES (PAINEL)',
    'ALERTAS DE PARADA PROIBIDA + VIOLACOES (PANICO)', 'PARADA PROIBIDA + BAÚ', 'PARADA PROIBIDA EM ÁREA DE RISCO + BAÚ']),
  ...doGrupo('ALERTAS', ['ALERTAS DE PAINEL', 'ALERTAS DE PANICO'])
].map(d => Object.freeze(d)));

// Busca por chave normalizada: acento, caixa e espaços não importam.
/** @type {Map<string, Readonly<DefinicaoExcecao>>} */
const PORCHAVE = new Map(CATALOGO.map(d => [normalizarChave(d.nome), d]));

/** @param {unknown} nome @returns {Readonly<DefinicaoExcecao> | null} */
export const buscarExcecao = nome => PORCHAVE.get(normalizarChave(nome)) ?? null;

/**
 * Classe informada na coluna "classe" da planilha, usada só para exceções fora do catálogo.
 * @param {unknown} valor @returns {ClasseExcecao | null}
 */
export function classeInformada(valor) {
  const c = normalizarChave(valor);
  if (c.startsWith('MOTORISTA')) return CLASSE.MOTORISTA;
  if (c.startsWith('VEICULO')) return CLASSE.VEICULO;
  if (c.startsWith('CONTEXTO')) return CLASSE.CONTEXTO;
  return null;
}

/**
 * Exceção fora do catálogo: usa a classe da planilha; sem ela, deduz pelo texto.
 * @param {unknown} nome @param {unknown} classeDaPlanilha @returns {ClasseExcecao}
 */
function deduzirClasse(nome, classeDaPlanilha) {
  const informada = classeInformada(classeDaPlanilha);
  if (informada) return informada;
  const n = normalizarChave(nome);
  if (n.includes('+') || n.startsWith('ALERTA')) return CLASSE.CONTEXTO;
  if (/VIOLACAO|ISCA|LOCALIZADOR|SEM POSICAO|JAMMER|DESENGATE/.test(n)) return CLASSE.VEICULO;
  return CLASSE.MOTORISTA;
}

/**
 * @param {unknown} nome exceção como veio da planilha
 * @param {unknown} classeDaPlanilha coluna "classe"
 * @returns {{ nome: string, classe: ClasseExcecao, grupo: GrupoExcecao, catalogada: boolean }}
 */
export function classificarExcecao(nome, classeDaPlanilha) {
  const definicao = buscarExcecao(nome);
  if (definicao) return { ...definicao, catalogada: true };
  return { nome: String(nome ?? ''), classe: deduzirClasse(nome, classeDaPlanilha), grupo: 'NAO_CATALOGADA', catalogada: false };
}
