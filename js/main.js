// Ponto de entrada. Chart e L (Leaflet) chegam como globais pelos <script> do CDN no index.html;
// o leitor da planilha carrega fflate e SheetJS sob demanda (js/config/cdn.js).
import { Painel } from './Painel.js';

new Painel();
