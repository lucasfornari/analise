// Links externos montados a partir dos dados do painel.

// Google Maps na coordenada (URL oficial "Maps URLs", abre no app ou no navegador).
export const linkGoogleMaps = (lat, lon) =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lon.toFixed(6)}`;
