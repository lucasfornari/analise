// Cartões de KPI no topo do painel.
import { $ } from '../util/dom.js';
import { formatarNumero, formatarVariacao, rotuloMes } from '../util/formatacao.js';
import { mesAnterior } from '../nucleo/agregacao.js';

export class Indicadores {
  constructor(painel) {
    this.estado = painel.estado;
  }

  renderizar() {
    const a = this.estado.agregado, total = this.estado.registros.length;
    const v = a.variacao, ultimo = a.meses[a.meses.length - 1];
    const cartoes = [
      { destaque: true, valor: formatarNumero(a.n), rotulo: 'eventos no filtro' + (total !== a.n ? ` (de ${formatarNumero(total)})` : '') },
      { valor: formatarNumero(a.MOTORISTA), rotulo: 'motorista' },
      { valor: formatarNumero(a.VEICULO), rotulo: 'veículo' },
      { valor: formatarNumero(a.CONTEXTO), rotulo: 'contexto suspeito' },
      { valor: formatarNumero(a.nClientes), rotulo: 'clientes com eventos' },
      v?.pct != null
        ? { valor: formatarVariacao(v.pct), classe: v.pct > 0 ? 'alta' : 'baixa', rotulo: `${rotuloMes(ultimo)} contra ${rotuloMes(mesAnterior(ultimo))}` }
        : { valor: '–', rotulo: 'variação mensal (precisa de 2 meses)' }
    ];
    $('#kpis').innerHTML = cartoes.map(c =>
      `<div class="kpi${c.destaque ? ' hero' : ''}"><div class="v ${c.classe || ''}">${c.valor}</div><div class="l">${c.rotulo}</div></div>`).join('');
  }
}
