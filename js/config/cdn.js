// Bibliotecas carregadas sob demanda (Web Worker e leitura de reserva), com versão fixa.
// Manter as versões iguais às do package.json (usadas nos testes).
export const CDN = Object.freeze({
  fflate: 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js',
  sheetjs: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs'
});
