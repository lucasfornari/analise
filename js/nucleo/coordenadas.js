// Validação e correção das coordenadas do export do BI.
// Defeito conhecido: em algumas linhas (principalmente ONIXSAT) a longitude vem DOBRADA, com a latitude certa
// (ex.: Ponte Serrada/SC em -26.9175, -103.779; o certo é -51.8895). Dividir por 2 é exato em ponto flutuante,
// então a correção não perde precisão.

// Caixa aproximada de cada UF (IBGE): [lat mín, lat máx, lon mín, lon máx]
const CAIXA_DA_UF = Object.freeze({
  AC: [-11.15, -7.11, -73.99, -66.62], AL: [-10.50, -8.81, -38.24, -35.15], AP: [-1.24, 4.44, -54.88, -49.87],
  AM: [-9.82, 2.25, -73.80, -56.10], BA: [-18.35, -8.53, -46.62, -37.34], CE: [-7.86, -2.78, -41.42, -37.25],
  DF: [-16.05, -15.50, -48.29, -47.31], ES: [-21.30, -17.89, -41.88, -39.66], GO: [-19.50, -12.39, -53.25, -45.91],
  MA: [-10.26, -1.04, -48.76, -41.80], MT: [-18.04, -7.35, -61.63, -50.22], MS: [-24.07, -17.17, -58.17, -50.92],
  MG: [-22.92, -14.23, -51.05, -39.86], PA: [-9.84, 2.59, -58.90, -46.06], PB: [-8.30, -6.03, -38.77, -34.79],
  PR: [-26.72, -22.52, -54.62, -48.02], PE: [-9.48, -3.83, -41.36, -32.39], PI: [-10.93, -2.74, -45.99, -40.37],
  RJ: [-23.37, -20.76, -44.89, -40.96], RN: [-6.98, -4.83, -38.58, -34.97], RS: [-33.75, -27.08, -57.64, -49.69],
  RO: [-13.69, -7.97, -66.81, -59.77], RR: [-1.58, 5.27, -64.83, -58.89], SC: [-29.35, -25.96, -53.84, -48.36],
  SP: [-25.31, -19.78, -53.11, -44.16], SE: [-11.57, -9.51, -38.24, -36.39], TO: [-13.47, -5.17, -50.74, -45.70]
});
const MARGEM = 0.5;               // graus: a referência pode ser um ponto na UF vizinha
const COSTA_DO_PACIFICO = -82;    // a oeste disso, no hemisfério sul, só há oceano (a América do Sul vai até ~-81.3)

const dentroDaUf = (uf, lat, lon) => {
  const caixa = CAIXA_DA_UF[uf];
  return !!caixa && lat >= caixa[0] - MARGEM && lat <= caixa[1] + MARGEM && lon >= caixa[2] - MARGEM && lon <= caixa[3] + MARGEM;
};

// "0.01 km de POSTO X - PONTE SERRADA/SC" -> "SC" (só UFs do Brasil; "/PE" de Lima, no Peru, também casa e é tratado abaixo)
export const ufDaReferencia = referencia => {
  const uf = /\/\s*([A-Z]{2})\s*$/i.exec(String(referencia ?? '').trim())?.[1]?.toUpperCase();
  return uf && CAIXA_DA_UF[uf] ? uf : null;
};

// Corrige a longitude dobrada. Só divide por 2 quando o ponto original é impossível e o corrigido faz sentido:
//  1. a referência tem UF do Brasil, o ponto está fora dela e, com a longitude pela metade, cai dentro dela;
//  2. sem UF que confirme: ponto no Pacífico (hemisfério sul, a oeste da costa) que volta ao continente.
// Pontos legítimos fora do Brasil (ex.: Lima/PE, no Peru) não mudam: pela metade não cairiam em UF nenhuma.
export function corrigirLongitude(lat, lon, uf) {
  const metade = lon / 2;
  if (uf) {
    if (!dentroDaUf(uf, lat, lon) && dentroDaUf(uf, lat, metade)) return { lon: metade, corrigida: true };
    if (dentroDaUf(uf, lat, lon)) return { lon, corrigida: false };
  }
  if (lat < 0 && lon < COSTA_DO_PACIFICO && metade >= COSTA_DO_PACIFICO) return { lon: metade, corrigida: true };
  return { lon, corrigida: false };
}
