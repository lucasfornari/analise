// Exceções: divisão por classe, evolução mensal por classe e ranking pelo nome.
import { formatarNumero, rotuloMes, escaparHtml, capitalizar } from '../../../util/formatacao.js';
import { CLASSES, ROTULO_CLASSE } from '../../../nucleo/catalogoExcecoes.js';
import { CORES, COR_CLASSE } from '../../../config/tema.js';
import { graficoComoImagem, eixoX, eixoY } from '../graficos.js';
import { bloco, cartao, pct, variacaoHtml, legendaClasses } from './comum.js';

export function excecoes(paginador, { secao }) {
  const d = secao.dados;
  paginador.nova({ secao: 'excecoes', titulo: 'Exceções (alertas)', lead: 'Quantidade de exceções por classe, mês a mês, e as mais frequentes pelo nome.' });
  paginador.adicionar(bloco([
    cartao(formatarNumero(d.total), 'exceções no período', d.variacao ? `último mês ${variacaoHtml(d.variacao)}` : ''),
    ...CLASSES.map(c => cartao(formatarNumero(d.porClasse[c]), ROTULO_CLASSE[c].toLowerCase(), pct(d.total ? d.porClasse[c] / d.total : 0), c.toLowerCase()))
  ].join(''), 'cartoes-rel quatro'));

  const muitos = d.porMes.length > 8;
  paginador.adicionar(bloco(legendaClasses(), 'legenda-bloco'));
  paginador.adicionar(graficoComoImagem({
    type: 'bar',
    data: {
      labels: d.porMes.map(m => muitos ? rotuloMes(m.mes).split('/') : rotuloMes(m.mes)),
      datasets: CLASSES.map(c => ({ label: ROTULO_CLASSE[c], data: d.porMes.map(m => m[c]), backgroundColor: COR_CLASSE[c], borderColor: CORES.navy, borderWidth: c === 'CONTEXTO' ? 1 : 0, borderRadius: 2, maxBarThickness: 40 }))
    },
    options: { layout: { padding: { top: 18 } }, scales: { x: eixoX(), y: eixoY() } }
  }, { largura: 180, altura: 70 }));

  const maior = d.ranking.lista[0]?.n || 1;
  paginador.tabela({
    cabecalho: '<tr><th class="num">#</th><th>Exceção</th><th>Classe</th><th class="num">Eventos</th><th class="num">%</th><th class="barra-col"></th></tr>',
    linhas: d.ranking.lista.map((e, i) => `<tr><td class="num apagado">${i + 1}</td><td><b>${escaparHtml(capitalizar(e.nome))}</b></td>`
      + `<td><i class="ponto ${(e.classe || '').toLowerCase()}"></i> ${ROTULO_CLASSE[e.classe] || ''}</td><td class="num"><b>${formatarNumero(e.n)}</b></td>`
      + `<td class="num">${pct(e.pct)}</td><td class="barra-col"><div class="barra-rel ${(e.classe || '').toLowerCase()}" style="width:${(e.n / maior) * 100}%"></div></td></tr>`)
      .concat(d.ranking.outras.tipos ? [`<tr class="resto"><td></td><td colspan="2">Outras ${formatarNumero(d.ranking.outras.tipos)} exceções</td><td class="num">${formatarNumero(d.ranking.outras.eventos)}</td><td class="num">${pct(d.total ? d.ranking.outras.eventos / d.total : 0)}</td><td></td></tr>`] : [])
  });
}
