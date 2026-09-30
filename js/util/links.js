// Links externos montados a partir dos dados do painel.

// Google Maps na coordenada (URL oficial "Maps URLs", abre no app ou no navegador).
export const linkGoogleMaps = (lat, lon) =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lon.toFixed(6)}`;

// Ícone discreto (alfinete) que abre o local no Google Maps; usado no popup do mapa e na janela de detalhes.
const ALFINETE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
export const iconeGoogleMaps = (lat, lon) =>
  `<a class="icone-mapa" href="${linkGoogleMaps(lat, lon)}" target="_blank" rel="noopener" title="Abrir no Google Maps" aria-label="Abrir no Google Maps">${ALFINETE}</a>`;
