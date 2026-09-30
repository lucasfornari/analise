// Cartões de KPI no topo do painel.
import { $ } from '../util/dom.js';
import { formatarNumero, formatarPercentual } from '../util/formatacao.js';

export class Indicadores {
  constructor(painel) {
    this.estado = painel.estado;
  }

  renderizar() {
    const a = this.estado.agregado, total = this.estado.registros.length;
    const cartoes = [
      { destaque: true, valor: formatarNumero(a.n), rotulo: 'eventos no filtro' + (total !== a.n ? ` (de ${formatarNumero(total)})` : '') },
      { valor: formatarNumero(a.EQ), rotulo: 'equipamento' },
      { valor: formatarNumero(a.FV), rotulo: 'fim de viagem' },
      { valor: formatarNumero(a.CS), rotulo: 'contextos suspeitos' },
      { valor: formatarNumero(a.nClientes), rotulo: 'clientes com eventos' },
      { valor: a.n ? formatarPercentual(a.top3pct) : '–', rotulo: 'nos 3 maiores clientes' }
    ];
    $('#kpis').innerHTML = cartoes.map(c =>
      `<div class="kpi${c.destaque ? ' hero' : ''}"><div class="v">${c.valor}</div><div class="l">${c.rotulo}</div></div>`).join('');
  }
}
