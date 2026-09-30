// Ponto de entrada. As bibliotecas (XLSX, Chart, L) chegam como globais pelos <script> do CDN no index.html.
import { Painel } from './Painel.js';

new Painel(window.XLSX);
