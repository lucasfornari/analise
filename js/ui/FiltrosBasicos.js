// Filtros simples do menu lateral: período (datas e atalhos por mês), classe e placa.
import { $, $$ } from '../util/dom.js';
import { formatarDia, rotuloMes, ultimoDiaDoMes } from '../util/formatacao.js';
import { ROTULO_CLASSE } from '../nucleo/classificacao.js';

const ESPERA_DIGITACAO = 250;   // ms antes de filtrar pela placa

function criarChip(texto, aoClicar) {
  const chip = document.createElement('button');
  chip.className = 'chip';
  chip.textContent = texto;
  chip.onclick = aoClicar;
  return chip;
}

export class FiltrosBasicos {
  constructor(painel) {
    this.painel = painel;
    this.estado = painel.estado;
    this.de = $('#dtFrom');
    this.ate = $('#dtTo');
    this.placa = $('#plateSearch');

    // mantém o intervalo válido: mover uma ponta além da outra arrasta a outra junto
    this.de.onchange = () => {
      const s = this.estado.selecao;
      s.de = this.de.value;
      if (s.ate && s.de > s.ate) s.ate = s.de;
      painel.atualizar(true);
    };
    this.ate.onchange = () => {
      const s = this.estado.selecao;
      s.ate = this.ate.value;
      if (s.de && s.ate < s.de) s.de = s.ate;
      painel.atualizar(true);
    };

    let espera;
    this.placa.oninput = () => {
      clearTimeout(espera);
      espera = setTimeout(() => this.definirPlaca(this.placa.value), ESPERA_DIGITACAO);
    };
  }

  // Recria os controles que dependem dos dados carregados.
  montar() {
    const { inicio, fim, meses } = this.estado.meta;
    this.de.min = this.ate.min = inicio || '';
    this.de.max = this.ate.max = fim || '';
    $('#periodInfo').textContent = inicio ? `${formatarDia(inicio)} a ${formatarDia(fim)}` : '';
    this.#montarMeses(meses);
    this.#montarClasses();
  }

  #montarMeses(meses) {
    const caixa = $('#monthPresets');
    caixa.replaceChildren();
    const periodos = [{ rotulo: 'Tudo', de: '', ate: '' }, ...meses.map(m => {
      const [ano, mes] = m.split('-').map(Number);
      return { rotulo: rotuloMes(m), de: `${m}-01`, ate: `${m}-${ultimoDiaDoMes(ano, mes)}` };
    })];
    for (const p of periodos) {
      const chip = criarChip(p.rotulo, () => this.definirPeriodo(p.de, p.ate));
      Object.assign(chip.dataset, { de: p.de, ate: p.ate });
      caixa.appendChild(chip);
    }
  }

  #montarClasses() {
    const caixa = $('#classChips');
    caixa.replaceChildren();
    for (const [classe, rotulo] of Object.entries(ROTULO_CLASSE)) {
      const chip = criarChip(rotulo, () => {
        const classes = this.estado.selecao.classes;
        classes.has(classe) ? classes.delete(classe) : classes.add(classe);
        this.painel.atualizar(true);
      });
      chip.dataset.classe = classe;
      caixa.appendChild(chip);
    }
  }

  definirPeriodo(de, ate) {
    Object.assign(this.estado.selecao, { de, ate });
    this.painel.atualizar(true);
  }

  definirPlaca(placa) {
    this.estado.selecao.placa = placa;
    this.painel.atualizar(true);
  }

  // Reflete o estado nos controles (os filtros também mudam por cliques em tabelas e atalhos).
  renderizar() {
    const s = this.estado.selecao;
    this.de.value = s.de;
    this.ate.value = s.ate;
    if (this.placa.value !== s.placa) this.placa.value = s.placa;
    $$('#monthPresets .chip').forEach(c => c.classList.toggle('on', c.dataset.de === s.de && c.dataset.ate === s.ate));
    $$('#classChips .chip').forEach(c => c.classList.toggle('on', s.classes.has(c.dataset.classe)));
  }
}
