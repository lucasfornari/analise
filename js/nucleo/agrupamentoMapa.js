// Agrupamento dos pontos do mapa conforme o zoom, só pela coordenada (nunca pela referência em texto).
// Com o mapa afastado, pontos a menos de `raio` pixels viram um grupo; a partir de `zoomIndividual`
// cada coordenada aparece sozinha.

const TAMANHO_TILE = 256;

// Coordenada -> pixel no zoom (Web Mercator, a mesma projeção do Leaflet).
export function projetar(lat, lon, zoom) {
  const escala = TAMANHO_TILE * 2 ** zoom, seno = Math.sin(lat * Math.PI / 180);
  return [(lon + 180) / 360 * escala, (0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)) * escala];
}

// pontos: { lat, lon, total }, já ordenados do maior para o menor total.
// Retorna grupos { lat, lon, total, pontos }; grupo com um só ponto é a própria coordenada.
// Cada grupo nasce no maior ponto ainda livre e junta os livres dentro do raio (índice em grade = vizinhos em 3x3 células).
export function agruparPontos(pontos, zoom, { raio, zoomIndividual }) {
  if (zoom >= zoomIndividual || raio <= 0) return pontos.map(p => ({ lat: p.lat, lon: p.lon, total: p.total, pontos: [p] }));

  const xy = pontos.map(p => projetar(p.lat, p.lon, zoom));
  const celula = ([x, y]) => [Math.floor(x / raio), Math.floor(y / raio)];
  const chaveDaCelula = (cx, cy) => cx * 2 ** 24 + cy;   // numérica: bem mais rápida que texto com ~120 mil pontos
  const grade = new Map();
  xy.forEach((p, i) => {
    const chave = chaveDaCelula(...celula(p));
    (grade.get(chave) || grade.set(chave, []).get(chave)).push(i);
  });

  const livre = new Array(pontos.length).fill(true), grupos = [];
  for (let i = 0; i < pontos.length; i++) {
    if (!livre[i]) continue;
    const [cx, cy] = celula(xy[i]), membros = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const j of grade.get(chaveDaCelula(cx + dx, cy + dy)) || []) {
        if (livre[j] && Math.hypot(xy[j][0] - xy[i][0], xy[j][1] - xy[i][1]) <= raio) { livre[j] = false; membros.push(pontos[j]); }
      }
    }
    // posição do grupo: média das coordenadas ponderada pelos eventos
    let total = 0, lat = 0, lon = 0;
    for (const p of membros) { total += p.total; lat += p.lat * p.total; lon += p.lon * p.total; }
    grupos.push({ lat: lat / total, lon: lon / total, total, pontos: membros });
  }
  return grupos;
}

// Teto de intensidade do calor: percentil 95 das somas de eventos por célula, do jeito que o leaflet.heat
// agrega (células de `celula` px no zoom de intensidade máxima). Com o teto pelo peso de cada ponto, o export
// real (quase uma coordenada por evento) daria teto 1-2 e o calor viraria uma mancha saturada.
export function tetoDoCalor(pontos, zoom, celula) {
  const somas = new Map();
  for (const p of pontos) {
    const [x, y] = projetar(p.lat, p.lon, zoom), chave = Math.floor(x / celula) * 2 ** 24 + Math.floor(y / celula);
    somas.set(chave, (somas.get(chave) || 0) + p.total);
  }
  const valores = [...somas.values()].sort((a, b) => a - b);
  return Math.max(1, valores[Math.floor(valores.length * 0.95)] || 1);
}
