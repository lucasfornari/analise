// Regras de negócio que classificam cada exceção.
import { normalizarChave, limparTexto } from './texto.js';

// EQ = equipamento (veículo), FV = fim de viagem (motorista), CS = contexto suspeito
export const CLASSES = ['EQ', 'FV', 'CS'];
export const ROTULO_CLASSE = { EQ: 'Equipamento', FV: 'Fim de viagem', CS: 'Contexto suspeito' };

export const TIPOS = ['Baú', 'Desengate', 'Antena', 'Painel', 'Equip. outros',
  'FV não informada', 'FV fora do raio', 'FV entrega pendente', 'FV outros', 'Contexto suspeito'];

export const classeDoTipo = tipo => tipo === 'Contexto suspeito' ? 'CS' : tipo.startsWith('FV') ? 'FV' : 'EQ';

// Usa a coluna Classe; se vier vazia, deduz pelo texto da exceção.
export function classificar(classeBruta, excecao) {
  const classe = normalizarChave(classeBruta);
  if (classe.startsWith('CONTEXTO')) return 'CS';
  if (classe.startsWith('MOTORISTA')) return 'FV';
  if (classe.startsWith('VEICULO')) return 'EQ';
  const exc = normalizarChave(excecao);
  if (exc.startsWith('ALERTA')) return 'CS';
  if (exc.includes('FINAL DE VIAGEM')) return 'FV';
  return 'EQ';
}

export function tipoDoEvento(classe, excecao) {
  const exc = normalizarChave(excecao);
  if (classe === 'CS') return 'Contexto suspeito';
  if (classe === 'FV') {
    if (exc.includes('FORA DO RAIO')) return 'FV fora do raio';
    if (exc.includes('ENTREGA PENDENTE')) return 'FV entrega pendente';
    if (exc.includes('FINAL DE VIAGEM')) return 'FV não informada';
    return 'FV outros';
  }
  if (/\bBAU\b/.test(exc)) return 'Baú';
  if (/\bDESENGATE\b/.test(exc)) return 'Desengate';
  if (/\bANTENA\b/.test(exc)) return 'Antena';
  if (/\bPAINEL\b/.test(exc)) return 'Painel';
  return 'Equip. outros';
}

// Quais alertas combinados geraram o contexto suspeito.
export function composicaoCS(excecao) {
  const exc = normalizarChave(excecao);
  if (exc.includes('VALOR DA SM')) return 'Desengate + valor SM';
  if (exc.includes('PERDA DE SINAL')) return 'Alerta + perda de sinal';
  if (exc.includes('PARADA PROIBIDA')) return 'Parada proibida + violação';
  if (exc.includes('PAINEL')) return 'Alertas de painel';
  return 'Outros';
}

// "2,5 km de Campinas - SP" -> "Campinas - SP": agrupa eventos pelo local, não pela distância.
export const localDaReferencia = referencia =>
  limparTexto(referencia).replace(/^[\d.,]+\s*km\s+de\s+/i, '').trim() || '(sem referência)';
