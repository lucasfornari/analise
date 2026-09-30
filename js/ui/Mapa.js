// Mapa (Leaflet, global L do CDN) com camada de calor e/ou marcadores por local.
import { $, $$ } from '../util/dom.js';
import { formatarNumero, escaparHtml, abreviarCliente } from '../util/formatacao.js';
import { classeDoTipo } from '../nucleo/classificacao.js';
import { CORES, COR_CLASSE } from '../config/tema.js';
import { CAMADAS_MAPA, CENTRO_BRASIL, GRADIENTE_CALOR } from '../config/mapa.js';

const FALHAS_PARA_TROCAR = 4;   // tiles com erro, sem nenhum sucesso, antes de tentar o provedor reserva
const porFrequencia = mapa => [...mapa.entries()].sort((a, b) => b[1] - a[1]);

export class Mapa {
  modo = 'heat';   // 'heat' | 'points' | 'both'
  fundo = 'dark';
  mapa = null;

  constructor(painel) {
    this.estado = painel.estado;
    this.raio = $('#heatRadius');
    this.#ligarBotoes('#mapBase', v => this.definirFundo(v));
    this.#ligarBotoes('#mapMode', v => { this.modo = v; this.renderizar(false); });
    this.raio.oninput = () => this.renderizar(false);
  }

  #ligarBotoes(seletor, aoEscolher) {
    const botoes = $$(`${seletor} button`);
    botoes.forEach(b => b.onclick = () => { botoes.forEach(x => x.classList.toggle('on', x === b)); aoEscolher(b.dataset.v); });
  }

  // Criado só no primeiro carregamento: o contêiner fica oculto até lá e o Leaflet precisa do tamanho real.
  #iniciar() {
    this.mapa = L.map('map', { preferCanvas: true }).setView(CENTRO_BRASIL, 4);
    this.marcadores = L.layerGroup();
    this.#trocarFundo(this.fundo, 0);
  }

  definirFundo(fundo, tentativa = 0) {
    this.fundo = fundo;
    if (!this.mapa) return;
    this.#trocarFundo(fundo, tentativa);
    this.renderizar(false);   // a cor dos marcadores depende do fundo
  }

  // tentativa: índice do provedor na lista de reservas de CAMADAS_MAPA
  #trocarFundo(fundo, tentativa) {
    [this.camadaFundo, this.camadaRotulos].forEach(c => c && this.mapa.removeLayer(c));
    this.camadaRotulos = null;
    const opcoes = CAMADAS_MAPA[fundo], camada = opcoes[Math.min(tentativa, opcoes.length - 1)];
    this.tentativa = tentativa;

    let sucessos = 0, falhas = 0;
    const aindaAtual = () => this.fundo === fundo && this.tentativa === tentativa;
    this.camadaFundo = L.tileLayer(camada.url, { attribution: camada.attr, maxZoom: 19, maxNativeZoom: camada.max, subdomains: camada.sub || 'abc' })
      .on('tileload', () => sucessos++)
      .on('tileerror', () => {
        falhas++;
        if (!sucessos && falhas >= FALHAS_PARA_TROCAR && tentativa + 1 < opcoes.length && aindaAtual()) this.definirFundo(fundo, tentativa + 1);
      })
      .addTo(this.mapa);
    this.camadaFundo.bringToBack();
    if (camada.ref) {
      this.camadaRotulos = L.tileLayer(camada.ref, { maxZoom: 19, maxNativeZoom: camada.max, pane: 'overlayPane', opacity: 0.9 }).addTo(this.mapa);
    }
  }

  // ajustar: enquadra o mapa nos eventos (após mudar filtros)
  renderizar(ajustar) {
    if (!this.mapa) this.#iniciar();
    const georreferenciados = this.estado.filtrados.filter(r => r.lat != null);
    const locais = this.estado.agregado.locais.filter(l => l.lat != null);

    this.#limparCamadas();
    if (this.modo !== 'points' && georreferenciados.length) this.#desenharCalor(georreferenciados);
    if (this.modo !== 'heat') this.#desenharMarcadores(locais);

    const semCoordenada = this.estado.filtrados.length - georreferenciados.length;
    $('#mapSub').textContent = `${formatarNumero(georreferenciados.length)} eventos georreferenciados em ${formatarNumero(locais.length)} locais`;
    $('#mapNote').textContent = semCoordenada ? `${formatarNumero(semCoordenada)} eventos sem coordenada ficaram fora do mapa` : '';
    if (ajustar && georreferenciados.length) {
      this.mapa.fitBounds(L.latLngBounds(georreferenciados.map(r => [r.lat, r.lon])).pad(0.08), { maxZoom: 12 });
    }
    setTimeout(() => this.mapa.invalidateSize(), 50);
  }

  #limparCamadas() {
    if (this.calor) { this.mapa.removeLayer(this.calor); this.calor = null; }
    this.marcadores.clearLayers();
    if (this.mapa.hasLayer(this.marcadores)) this.mapa.removeLayer(this.marcadores);
  }

  #desenharCalor(registros) {
    const raio = +this.raio.value;
    this.calor = L.heatLayer(registros.map(r => [r.lat, r.lon, 1]), {
      radius: raio, blur: Math.round(raio * 0.8), maxZoom: 11, minOpacity: 0.35, gradient: GRADIENTE_CALOR
    }).addTo(this.mapa);
  }

  // Círculo proporcional ao nº de eventos, colorido pela classe predominante no local.
  #desenharMarcadores(locais) {
    const maximo = Math.max(1, ...locais.map(l => l.nc));
    const fundoEscuro = this.fundo === 'dark' || this.fundo === 'sat';
    // menores por último, para ficarem por cima dos maiores
    for (const local of [...locais].sort((a, b) => a.nc - b.nc)) {
      const classe = classeDoTipo(porFrequencia(local.tipos)[0][0]);
      L.circleMarker([local.lat, local.lon], {
        radius: 4 + Math.sqrt(local.nc / maximo) * 18,
        color: fundoEscuro ? CORES.neon : CORES.navy, weight: 1,
        fillColor: classe === 'EQ' && fundoEscuro ? CORES.indigo : COR_CLASSE[classe],   // navy some no fundo escuro
        fillOpacity: 0.75
      }).bindPopup(this.#popup(local)).addTo(this.marcadores);
    }
    this.marcadores.addTo(this.mapa);
  }

  #popup(local) {
    const tipos = porFrequencia(local.tipos).map(([t, n]) => `${escaparHtml(t)}: ${n}`).join('<br>');
    const clientes = porFrequencia(local.cli).slice(0, 3).map(([c, n]) => `${escaparHtml(abreviarCliente(c))} (${n})`).join(', ');
    return `<b>${escaparHtml(local.local)}</b><br>${formatarNumero(local.total)} eventos<br>${tipos}<br><span class="popup-clientes">${clientes}</span>`;
  }

  focar(local) {
    if (local.lat == null || !this.mapa) return;
    this.mapa.flyTo([local.lat, local.lon], 15, { duration: 0.8 });
    $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  redimensionar() {
    this.mapa?.invalidateSize();
  }
}
