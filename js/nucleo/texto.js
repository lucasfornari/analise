// Normalização de texto para comparar e agrupar valores vindos da planilha.

// Chave canônica: sem acento, espaços colapsados (inclui NBSP) e maiúsculas.
export const normalizarChave = valor => String(valor ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[\s ]+/g, ' ').trim().toUpperCase();

export const limparTexto = valor => String(valor ?? '').replace(/[\s ]+/g, ' ').trim();

// Só letras e números: "BRY-2E52" e "bry2e52" são a mesma placa.
export const chavePlaca = placa => normalizarChave(placa).replace(/[^A-Z0-9]/g, '');
