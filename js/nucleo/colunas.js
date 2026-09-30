// Localização do cabeçalho e das colunas no export do BI.
import { normalizarChave } from './texto.js';

// Nomes aceitos por coluna, em ordem de prioridade (comparados sem acento e em maiúsculas).
export const COLUNAS = {
  cliente: ['CLIENTE'],
  viagem: ['COD VIAGEM', 'CODIGO VIAGEM', 'COD. VIAGEM', 'VIAGEM'],
  filial: ['FILIAL'],
  placa: ['PLACA'],
  carreta: ['CARRETA'],
  motorista: ['MOTORISTA'],
  tecnologia: ['TECNOLOGIA'],
  perfil: ['PERFIL', 'PERFIL DE SEGURANCA'],
  excecao: ['EXCECOES', 'EXCECAO'],
  data: ['DATA EXCECAO', 'DATA DA EXCECAO'],
  lat: ['LATITUDE', 'LAT'],
  lon: ['LONGITUDE', 'LON', 'LNG'],
  referencia: ['REFERENCIA', 'LOCAL'],
  classe: ['CLASSE']
};

export const COLUNAS_OBRIGATORIAS = ['cliente', 'excecao', 'data'];

// O export traz linhas de título antes do cabeçalho; procura nas 30 primeiras.
export function localizarCabecalho(linhas) {
  for (let i = 0; i < Math.min(linhas.length, 30); i++) {
    const celulas = (linhas[i] || []).map(normalizarChave);
    if (celulas.includes('CLIENTE') && celulas.some(c => c.startsWith('EXCEC'))) return i;
  }
  return -1;
}

// Retorna { campo: índice da coluna ou -1 }. Tenta nome exato e depois prefixo
// ("data" só exato, para não confundir com outras colunas de data).
export function mapearColunas(cabecalho) {
  const celulas = cabecalho.map(normalizarChave);
  const indices = {};
  for (const [campo, nomes] of Object.entries(COLUNAS)) {
    let i = -1;
    for (const nome of nomes) { i = celulas.indexOf(normalizarChave(nome)); if (i >= 0) break; }
    if (i < 0 && campo !== 'data') {
      for (const nome of nomes) { i = celulas.findIndex(c => c.startsWith(normalizarChave(nome))); if (i >= 0) break; }
    }
    indices[campo] = i;
  }
  return indices;
}
