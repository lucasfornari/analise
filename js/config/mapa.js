// Camadas de fundo do mapa. Todas dispensam chave de API; a primeira de cada lista é a preferida
// e as seguintes são reserva caso ela falhe.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
const esri = (servico, referencia) => ({
  url: ESRI + servico + '/MapServer/tile/{z}/{y}/{x}',
  ref: referencia && ESRI + referencia + '/MapServer/tile/{z}/{y}/{x}',
  attr: 'Tiles &copy; Esri', max: 16
});
const osmHot = { url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap', max: 19, sub: 'abc' };

export const CAMADAS_MAPA = {
  dark: [esri('Canvas/World_Dark_Gray_Base', 'Canvas/World_Dark_Gray_Reference'),
    { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '&copy; OpenStreetMap &copy; CARTO', max: 19, sub: 'abcd' }],
  light: [esri('Canvas/World_Light_Gray_Base', 'Canvas/World_Light_Gray_Reference'), osmHot],
  ruas: [esri('World_Street_Map'), osmHot],
  sat: [esri('World_Imagery', 'Reference/World_Boundaries_and_Places'), esri('World_Imagery')]
};

export const CENTRO_BRASIL = [-15.8, -50];

// gradiente do mapa de calor (também desenhado na legenda em css/mapa.css)
export const GRADIENTE_CALOR = { 0.15: '#2C28A8', 0.4: '#6C69D9', 0.7: '#9CFF9C', 1: '#00FF00' };
