// Geração do CSV exportado, no formato que o Excel brasileiro abre direto.
import { ROTULO_CLASSE } from './classificacao.js';

export const COLUNAS_EXPORTADAS = ['cliente', 'perfil', 'filial', 'placa', 'carreta', 'motorista', 'excecao', 'classe',
  'tipo', 'data', 'local', 'referencia', 'lat', 'lon', 'viagem', 'tecnologia'];

function valorDaCelula(registro, coluna) {
  const valor = registro[coluna];
  if (coluna === 'classe') return ROTULO_CLASSE[valor];
  if (coluna === 'lat' || coluna === 'lon') return valor == null ? '' : String(valor).replace('.', ',');
  if (valor instanceof Date) return valor.toLocaleString('pt-BR');
  return valor ?? '';
}

const escaparCsv = valor => {
  const texto = String(valor);
  return /[;"\n]/.test(texto) ? '"' + texto.replace(/"/g, '""') + '"' : texto;
};

// Separador ";", vírgula decimal e BOM UTF-8: padrão do Excel em pt-BR.
export function gerarCsv(registros) {
  const linhas = [COLUNAS_EXPORTADAS.join(';'),
    ...registros.map(r => COLUNAS_EXPORTADAS.map(c => escaparCsv(valorDaCelula(r, c))).join(';'))];
  return '﻿' + linhas.join('\r\n');
}
