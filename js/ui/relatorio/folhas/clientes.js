// Carteira: todos os clientes do recorte, com participação, classes, viagens e variação.
import { formatarNumero, escaparHtml, abreviarCliente, capitalizar } from '../../../util/formatacao.js';
import { pct, variacaoHtml } from './comum.js';

export function clientes(paginador, { secao }) {
  const d = secao.dados;
  paginador.nova({ secao: 'clientes', titulo: 'Clientes da carteira', lead: `${formatarNumero(d.itens.length)} clientes, do que tem mais exceções para o que tem menos.` });
  paginador.tabela({
    classe: 'numerica tabela-clientes',
    cabecalho: '<tr><th class="num">#</th><th>Cliente</th><th class="num">Exceções</th><th class="num">%</th><th class="num">Viagens</th>'
      + '<th class="num">Mot.</th><th class="num">Veíc.</th><th class="num">CS</th><th class="num">Var. mês</th><th>Principal exceção</th></tr>',
    linhas: d.itens.map(c => `<tr><td class="num apagado">${c.posicao}</td><td class="col-cliente"><b>${escaparHtml(abreviarCliente(c.nome))}</b></td>`
      + `<td class="num"><b>${formatarNumero(c.total)}</b></td><td class="num">${pct(c.pct)}</td><td class="num">${formatarNumero(c.viagens)}</td>`
      + `<td class="num">${formatarNumero(c.porClasse.MOTORISTA)}</td><td class="num">${formatarNumero(c.porClasse.VEICULO)}</td><td class="num">${formatarNumero(c.porClasse.CONTEXTO)}</td>`
      + `<td class="num">${variacaoHtml(c.variacao)}</td><td class="col-principal">${c.principal ? `<i class="ponto ${(c.principal.classe || '').toLowerCase()}"></i> ${escaparHtml(capitalizar(c.principal.nome))} <small class="apagado">${formatarNumero(c.principal.n)}</small>` : ''}</td></tr>`)
  });
}
