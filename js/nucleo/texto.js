// Normalização de texto para comparar e agrupar valores vindos da planilha.

const ACENTOS = /[̀-ͯ]/g;
const ESPACOS = /[\s ]+/g;   // inclui NBSP, comum em exports

// Chave canônica: sem acento, espaços colapsados e maiúsculas.
export const normalizarChave = valor => String(valor ?? '')
  .normalize('NFD').replace(ACENTOS, '')
  .replace(ESPACOS, ' ').trim().toUpperCase();

export const limparTexto = valor => String(valor ?? '').replace(ESPACOS, ' ').trim();

// Só letras e números: "BRY-2E52" e "bry2e52" são a mesma placa.
export const chavePlaca = placa => normalizarChave(placa).replace(/[^A-Z0-9]/g, '');

// Placa no padrão antigo (ABC1234) ou Mercosul (ABC1D23).
export const placaValida = placa => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa);
