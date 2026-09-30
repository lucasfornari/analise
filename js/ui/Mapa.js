// Mapa (Leaflet, global L do CDN) com camada de calor e/ou marcadores por local.
// Clicar no mapa abre o resumo do local mais próximo; "Ver detalhes" abre placas, motoristas e eventos (DetalheLocal).
import { $, $$ } from '../util/dom.js';
import { formatarNumero, escaparHtml, abreviarCliente, formatarDataHora } from '../util/formatacao.js';
import { CLASSE_DO_GRUPO, ROTULO_GRUPO } from '../nucleo/catalogoExcecoes.js';
import { detalharLocal } from '../nucleo/detalheLocal.js';
import { CORES, COR_CLASSE } from '../config/tema.js';
import { CAMADAS_MAPA, CENTRO_BRASIL, GRADIENTE_CALOR } from '../config/mapa.js';

const FALHAS_PARA_TROCAR = 4;   // tiles com erro, sem nenhum sucesso, antes de tentar o provedor reserva
const MAX_MARCADORES = 2000;    // no modo "Locais", só os maiores (o export tem dezenas de milhares de locais)
const TOP_NO_POPUP = 3;          // placas e motoristas mais frequentes no resumo do popup
const RAIO_CLIQUE = 30;         // px: distância máxima do clique até o local
const porFrequencia = mapa => [...mapa.entries()].sort((a, b) => b[1] - a[1]);

export class Mapa {
  modo = 'heat';   // 'heat' | 'points' | 'both'
  fundo = 'dark';
  mapa = null;

  constructor(painel) {
    this.painel = painel;
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
    this.popup = L.popup({ maxWidth: 380, minWidth: 320, autoPanPadding: [24, 24], className: 'popup-local' });
    this.mapa.on('click', e => this.#abrirMaisProximo(e.containerPoint));
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
    this.mapa.closePopup();
    this.locaisVisiveis = locais;
    if (this.modo !== 'points' && locais.length) this.#desenharCalor(locais);
    const desenhados = this.modo !== 'heat' ? this.#desenharMarcadores(locais) : 0;

    const semCoordenada = this.estado.filtrados.length - georreferenciados.length;
    const notas = [];
    if (semCoordenada) notas.push(`${formatarNumero(semCoordenada)} eventos sem coordenada ficaram fora do mapa`);
    if (desenhados && desenhados < locais.length) notas.push(`marcadores dos ${formatarNumero(desenhados)} locais com mais eventos`);
    $('#mapSub').textContent = `${formatarNumero(georreferenciados.length)} eventos georreferenciados em ${formatarNumero(locais.length)} locais`;
    $('#mapNote').textContent = notas.join(' · ');
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

  // Um ponto por local, com peso = nº de eventos. Com um ponto por evento (150 mil) o calor satura e
  // vira uma mancha única; o teto no percentil 95 mantém o gradiente entre locais comuns e críticos.
  #desenharCalor(locais) {
    const raio = +this.raio.value;
    const pesos = locais.map(l => l.nc).sort((a, b) => a - b);
    const teto = Math.max(1, pesos[Math.floor(pesos.length * 0.95)] || 1);
    this.calor = L.heatLayer(locais.map(l => [l.lat, l.lon, l.nc]), {
      radius: raio, blur: Math.round(raio * 0.8), maxZoom: 11, minOpacity: 0.35, max: teto, gradient: GRADIENTE_CALOR
    }).addTo(this.mapa);
  }

  // Círculo proporcional ao nº de eventos, colorido pela classe do grupo predominante no local.
  #desenharMarcadores(locais) {
    const visiveis = locais.slice(0, MAX_MARCADORES);   // já vêm ordenados por total
    const maximo = Math.max(1, ...visiveis.map(l => l.nc));
    const fundoEscuro = this.fundo === 'dark' || this.fundo === 'sat';
    // menores por último, para ficarem por cima dos maiores
    for (const local of [...visiveis].sort((a, b) => a.nc - b.nc)) {
      const classe = CLASSE_DO_GRUPO[porFrequencia(local.grupos)[0][0]] || 'MOTORISTA';
      L.circleMarker([local.lat, local.lon], {
        radius: 4 + Math.sqrt(local.nc / maximo) * 18,
        color: fundoEscuro ? CORES.neon : CORES.navy, weight: 1,
        fillColor: classe === 'VEICULO' && fundoEscuro ? CORES.indigo : COR_CLASSE[classe],   // navy some no fundo escuro
        fillOpacity: 0.75
      }).on('click', e => { L.DomEvent.stopPropagation(e); this.#abrirPopup(local); }).addTo(this.marcadores);
    }
    this.marcadores.addTo(this.mapa);
    return visiveis.length;
  }

  // Clique em qualquer ponto (inclusive no mapa de calor): abre o local mais próximo dentro do raio.
  #abrirMaisProximo(ponto) {
    let maisProximo = null, menorDistancia = RAIO_CLIQUE;
    for (const local of this.locaisVisiveis || []) {
      const d = ponto.distanceTo(this.mapa.latLngToContainerPoint([local.lat, local.lon]));
      if (d < menorDistancia) { menorDistancia = d; maisProximo = local; }
    }
    if (maisProximo) this.#abrirPopup(maisProximo);
  }

  #abrirPopup(local) {
    this.popup.setLatLng([local.lat, local.lon]).setContent(this.#conteudoPopup(local)).openOn(this.mapa);
    // o Leaflet impede a propagação de cliques no popup: o botão recebe o evento direto
    this.popup.getElement().querySelector('[data-detalhe]').onclick = () => this.painel.detalhe.abrir(local);
  }

  // Resumo do local: totais, grupos, principais placas e motoristas. O detalhamento completo fica na janela.
  #conteudoPopup(local) {
    const { resumo, placas, motoristas } = detalharLocal(local.eventos);
    const grupos = porFrequencia(local.grupos).slice(0, 4).map(([g, n]) =>
      `<span class="tag ${(CLASSE_DO_GRUPO[g] || '').toLowerCase()}">${ROTULO_GRUPO[g]} ${formatarNumero(n)}</span>`).join('');
    const clientes = porFrequencia(local.cli).slice(0, 3).map(([c, n]) => `${escaparHtml(abreviarCliente(c))} (${formatarNumero(n)})`).join(', ');
    const topo = (itens, campo) => itens.slice(0, TOP_NO_POPUP).map(x =>
      `<li><b>${escaparHtml(x[campo])}</b><span>${formatarNumero(x.total)}</span></li>`).join('');
    return `<div class="popup-cabecalho"><b>${escaparHtml(local.local)}</b>
        <span>${formatarNumero(resumo.eventos)} eventos · ${formatarNumero(resumo.placas)} placas · ${formatarNumero(resumo.motoristas)} motoristas · ${formatarNumero(resumo.viagens)} SMs</span>
        ${resumo.ultimo ? `<span>Último evento: ${formatarDataHora(resumo.ultimo)}</span>` : ''}</div>
      <div class="popup-grupos">${grupos}</div>
      <div class="popup-clientes">${clientes}</div>
      <div class="popup-topo"><div><h5>Placas</h5><ul>${topo(placas, 'placa')}</ul></div><div><h5>Motoristas</h5><ul>${topo(motoristas, 'motorista')}</ul></div></div>
      <button class="btn primary small popup-detalhe" data-detalhe>Ver detalhes: placas, motoristas e eventos</button>`;
  }

  focar(local) {
    if (local.lat == null || !this.mapa) return;
    $('#map').scrollIntoView({ behavior: 'smooth', block: 'start' });   // scroll-margin-top desconta o cabeçalho fixo
    this.mapa.once('moveend', () => this.#abrirPopup(local));
    this.mapa.flyTo([local.lat, local.lon], 15, { duration: 0.8 });
  }

  redimensionar() {
    this.mapa?.invalidateSize();
  }
}
