// Geração do CSV exportado, no formato que o Excel brasileiro abre direto.
import { ROTULO_CLASSE, ROTULO_GRUPO } from './catalogoExcecoes.js';

export const COLUNAS_EXPORTADAS = ['cliente', 'filial', 'seguradora', 'corretora', 'perfil', 'viagem', 'placa', 'carreta',
  'motorista', 'vinculo', 'proprietario', 'tecnologia', 'produto', 'excecao', 'classe', 'grupo', 'data', 'fimViagem',
  'local', 'referencia', 'lat', 'lon'];

function valorDaCelula(registro, coluna) {
  const valor = registro[coluna];
  if (coluna === 'classe') return ROTULO_CLASSE[valor];
  if (coluna === 'grupo') return ROTULO_GRUPO[valor];
  if (coluna === 'lat' || coluna === 'lon') return valor == null ? '' : String(valor).replace('.', ',');
  if (valor instanceof Date) return valor.toLocaleString('pt-BR');
  return valor ?? '';
}

const escaparCsv = valor => {
  const texto = String(valor);
  return /[;"\r\n]/.test(texto) ? '"' + texto.replace(/"/g, '""') + '"' : texto;
};

// Separador ";", vírgula decimal e BOM UTF-8: padrão do Excel em pt-BR. Cabeçalho "viagem" = número da SM.
export function gerarCsv(registros) {
  const linhas = [COLUNAS_EXPORTADAS.join(';'),
    ...registros.map(r => COLUNAS_EXPORTADAS.map(c => escaparCsv(valorDaCelula(r, c))).join(';'))];
  return '﻿' + linhas.join('\r\n');
}
