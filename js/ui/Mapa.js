// Mapa (Leaflet, global L do CDN) com camada de calor e/ou marcadores, um ponto por coordenada (lat/long).
// Afastado, pontos próximos se agrupam; aproximando, cada coordenada aparece sozinha (js/nucleo/agrupamentoMapa.js).
// Clicar numa coordenada abre o resumo; "Ver detalhes" abre placas, motoristas e eventos (DetalheLocal).
import { $, $$ } from '../util/dom.js';
import { formatarNumero, escaparHtml, abreviarCliente, formatarDataHora, formatarCoordenada } from '../util/formatacao.js';
import { CLASSE_DO_GRUPO } from '../nucleo/catalogoExcecoes.js';
import { listaExcecoes } from './etiquetasExcecoes.js';
import { detalharLocal } from '../nucleo/detalheLocal.js';
import { chaveCoordenada, completarPonto } from '../nucleo/agregacao.js';
import { agruparPontos, tetoDoCalor } from '../nucleo/agrupamentoMapa.js';
import { iconeGoogleMaps } from '../util/links.js';
import { CORES, COR_CLASSE } from '../config/tema.js';
import { CAMADAS_MAPA, CENTRO_BRASIL, GRADIENTE_CALOR, AGRUPAMENTO } from '../config/mapa.js';

const FALHAS_PARA_TROCAR = 4;   // tiles com erro, sem nenhum sucesso, antes de tentar o provedor reserva
const MAX_MARCADORES = 2000;    // marcadores na área visível; acima disso, só os maiores
const TOP_NO_POPUP = 3;          // placas e motoristas mais frequentes no resumo do popup
const TOP_EXCECOES_NO_POPUP = 5; // exceções no resumo; a lista completa fica na aba Exceções dos detalhes
const RAIO_CLIQUE = 30;         // px: distância máxima do clique até o ponto ou grupo
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
    this.mapa.on('moveend', () => this.#desenharMarcadores());
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
    const pontos = this.estado.agregado.pontos;
    this.pontos = pontos;
    this.pontoPorChave = new Map(pontos.map(p => [p.chave, p]));
    this.gruposPorZoom = new Map();   // agrupamento muda com os filtros: recalcula sob demanda

    this.#limparCamadas();
    this.mapa.closePopup();
    if (this.modo !== 'points' && pontos.length) this.#desenharCalor(pontos);

    const semCoordenada = this.estado.filtrados.length - this.estado.agregado.geo;
    this.notaFixa = !semCoordenada ? '' : semCoordenada === 1 ? '1 evento sem coordenada ficou fora do mapa'
      : `${formatarNumero(semCoordenada)} eventos sem coordenada ficaram fora do mapa`;
    $('#mapSub').textContent = `${formatarNumero(this.estado.agregado.geo)} eventos georreferenciados em ${formatarNumero(pontos.length)} pontos`;
    if (ajustar && pontos.length) {
      this.mapa.fitBounds(L.latLngBounds(pontos.map(p => [p.lat, p.lon])).pad(0.08), { maxZoom: 12 });
    }
    this.#desenharMarcadores();
    setTimeout(() => this.mapa.invalidateSize(), 50);
  }

  #limparCamadas() {
    if (this.calor) { this.mapa.removeLayer(this.calor); this.calor = null; }
    this.marcadores.clearLayers();
  }

  // Grupos do zoom atual (guardados por zoom até os filtros mudarem).
  #grupos() {
    const zoom = this.mapa.getZoom();
    if (!this.gruposPorZoom.has(zoom)) this.gruposPorZoom.set(zoom, agruparPontos(this.pontos || [], zoom, AGRUPAMENTO));
    return this.gruposPorZoom.get(zoom);
  }

  // Um ponto por coordenada, com peso = nº de eventos; o teto no percentil 95 das células mantém o
  // gradiente entre áreas comuns e críticas em vez de uma mancha saturada.
  #desenharCalor(pontos) {
    const raio = +this.raio.value, desfoque = Math.round(raio * 0.8), zoomMaximo = 11;
    this.calor = L.heatLayer(pontos.map(p => [p.lat, p.lon, p.total]), {
      radius: raio, blur: desfoque, maxZoom: zoomMaximo, minOpacity: 0.35, gradient: GRADIENTE_CALOR,
      max: tetoDoCalor(pontos, zoomMaximo, (raio + desfoque) / 2)   // célula do leaflet.heat: metade de raio + desfoque
    }).addTo(this.mapa);
  }

  // Redesenha a cada movimento do mapa: só os grupos da área visível, no agrupamento do zoom atual.
  // Coordenada sozinha: círculo proporcional aos eventos, na cor da classe predominante.
  // Grupo: bolha com o total de eventos; o clique aproxima o mapa até separar as coordenadas.
  #desenharMarcadores() {
    if (!this.pontos) return;
    const grupos = this.#grupos();
    const agrupado = grupos.some(g => g.pontos.length > 1);
    const notas = [this.notaFixa];
    if (agrupado) notas.push('pontos próximos agrupados: clique no grupo ou aproxime para ver cada coordenada');

    this.marcadores.clearLayers();
    if (this.modo === 'heat') {
      this.mapa.removeLayer(this.marcadores);
    } else {
      const area = this.mapa.getBounds().pad(0.25);
      const naArea = grupos.filter(g => area.contains([g.lat, g.lon]));
      const visiveis = naArea.length > MAX_MARCADORES ? [...naArea].sort((a, b) => b.total - a.total).slice(0, MAX_MARCADORES) : naArea;
      if (visiveis.length < naArea.length) notas.push(`marcadores dos ${formatarNumero(visiveis.length)} pontos com mais eventos nesta área`);
      let maximo = 1;
      for (const g of visiveis) if (g.total > maximo) maximo = g.total;
      // menores por último, para ficarem por cima dos maiores
      for (const grupo of [...visiveis].sort((a, b) => a.total - b.total)) {
        const marcador = grupo.pontos.length > 1 ? this.#marcadorDeGrupo(grupo, maximo) : this.#marcadorDePonto(grupo.pontos[0], maximo);
        marcador.on('click', e => { L.DomEvent.stopPropagation(e); this.#abrirGrupo(grupo); }).addTo(this.marcadores);
      }
      this.marcadores.addTo(this.mapa);
    }
    $('#mapNote').textContent = notas.filter(Boolean).join(' · ');
  }

  #marcadorDePonto(ponto, maximo) {
    completarPonto(ponto);
    const fundoEscuro = this.fundo === 'dark' || this.fundo === 'sat';
    const classe = CLASSE_DO_GRUPO[porFrequencia(ponto.grupos)[0][0]] || 'MOTORISTA';
    return L.circleMarker([ponto.lat, ponto.lon], {
      radius: 4 + Math.sqrt(ponto.total / maximo) * 18,
      color: fundoEscuro ? CORES.neon : CORES.navy, weight: 1,
      fillColor: classe === 'VEICULO' && fundoEscuro ? CORES.indigo : COR_CLASSE[classe],   // navy some no fundo escuro
      fillOpacity: 0.75
    });
  }

  #marcadorDeGrupo(grupo, maximo) {
    const tamanho = Math.round(26 + Math.sqrt(grupo.total / maximo) * 22);
    return L.marker([grupo.lat, grupo.lon], {
      icon: L.divIcon({ className: 'grupo-mapa', html: `<span>${formatarNumero(grupo.total)}</span>`, iconSize: [tamanho, tamanho] }),
      title: `${formatarNumero(grupo.pontos.length)} pontos · ${formatarNumero(grupo.total)} eventos`, keyboard: false
    });
  }

  // Clique em qualquer lugar (inclusive no mapa de calor): age sobre o grupo ou ponto mais próximo dentro do raio.
  #abrirMaisProximo(clique) {
    let maisProximo = null, menorDistancia = RAIO_CLIQUE;
    for (const grupo of this.#grupos()) {
      const d = clique.distanceTo(this.mapa.latLngToContainerPoint([grupo.lat, grupo.lon]));
      if (d < menorDistancia) { menorDistancia = d; maisProximo = grupo; }
    }
    if (maisProximo) this.#abrirGrupo(maisProximo);
  }

  // Coordenada sozinha abre o resumo; grupo aproxima o mapa até as suas coordenadas.
  #abrirGrupo(grupo) {
    if (grupo.pontos.length === 1) return this.#abrirPopup(grupo.pontos[0]);
    const limites = L.latLngBounds(grupo.pontos.map(p => [p.lat, p.lon]));
    const zoom = Math.min(Math.max(this.mapa.getBoundsZoom(limites.pad(0.2)), this.mapa.getZoom() + 1), AGRUPAMENTO.zoomIndividual);
    this.mapa.flyTo(limites.getCenter(), zoom, { duration: 0.6 });
  }

  #abrirPopup(ponto) {
    completarPonto(ponto);
    this.popup.setLatLng([ponto.lat, ponto.lon]).setContent(this.#conteudoPopup(ponto)).openOn(this.mapa);
    // o Leaflet impede a propagação de cliques no popup: o botão recebe o evento direto
    this.popup.getElement().querySelector('[data-detalhe]').onclick = () => this.painel.detalhe.abrir(ponto);
  }

  // Resumo da coordenada: totais, principais exceções (nome e quantidade), principais placas e motoristas. O detalhamento completo fica na janela.
  #conteudoPopup(local) {
    const { resumo, placas, motoristas } = detalharLocal(local.eventos);
    const clientes = porFrequencia(local.cli).slice(0, 3).map(([c, n]) => `${escaparHtml(abreviarCliente(c))} (${formatarNumero(n)})`).join(', ');
    const topo = (itens, campo) => itens.slice(0, TOP_NO_POPUP).map(x =>
      `<li><b>${escaparHtml(x[campo])}</b><span>${formatarNumero(x.total)}</span></li>`).join('');
    return `<div class="popup-cabecalho"><div class="popup-titulo"><b>${escaparHtml(local.local)}</b>${iconeGoogleMaps(local.lat, local.lon)}</div>
        <span class="popup-coordenada">${formatarCoordenada(local)}${local.referencias.size > 1 ? ` · ${formatarNumero(local.referencias.size)} referências nesta coordenada` : ''}</span>
        <span>${formatarNumero(resumo.eventos)} eventos · ${formatarNumero(resumo.placas)} placas · ${formatarNumero(resumo.motoristas)} motoristas · ${formatarNumero(resumo.viagens)} SMs</span>
        ${resumo.ultimo ? `<span>Último evento: ${formatarDataHora(resumo.ultimo)}</span>` : ''}</div>
      <div class="popup-excecoes">${listaExcecoes(local.porExcecao, this.estado.agregado.classeDaExcecao, TOP_EXCECOES_NO_POPUP)}</div>
      <div class="popup-clientes">${clientes}</div>
      <div class="popup-topo"><div><h5>Placas</h5><ul>${topo(placas, 'placa')}</ul></div><div><h5>Motoristas</h5><ul>${topo(motoristas, 'motorista')}</ul></div></div>
      <button class="btn primary small popup-detalhe" data-detalhe>Ver detalhes: placas, motoristas e eventos</button>`;
  }

  // local da tabela (agrupado pela referência): vai às coordenadas dos seus eventos; se for uma só, abre o resumo.
  focar(local) {
    if (!this.mapa) return;
    const chaves = new Set(local.eventos.filter(r => r.lat != null).map(r => chaveCoordenada(r.lat, r.lon)));
    const pontos = [...chaves].map(c => this.pontoPorChave.get(c)).filter(Boolean);
    if (!pontos.length) return;
    $('#map').scrollIntoView({ behavior: 'smooth', block: 'start' });   // scroll-margin-top desconta o cabeçalho fixo
    if (pontos.length > 1) {
      this.mapa.flyToBounds(L.latLngBounds(pontos.map(p => [p.lat, p.lon])).pad(0.2), { maxZoom: 16, duration: 0.8 });
      return;
    }
    this.mapa.once('moveend', () => this.#abrirPopup(pontos[0]));
    this.mapa.flyTo([pontos[0].lat, pontos[0].lon], Math.max(15, AGRUPAMENTO.zoomIndividual), { duration: 0.8 });
  }

  redimensionar() {
    this.mapa?.invalidateSize();
  }
}
