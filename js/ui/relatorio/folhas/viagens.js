// Viagens com exceções mês a mês: gráfico e tabela com variação e exceções por viagem.
import { formatarNumero, rotuloMes } from '../../../util/formatacao.js';
import { CORES } from '../../../config/tema.js';
import { graficoComoImagem, eixoX, eixoY } from '../graficos.js';
import { bloco, cartao, variacaoHtml } from './comum.js';

const decimal = v => v == null ? '–' : v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function viagens(paginador, { secao }) {
  const d = secao.dados;
  paginador.nova({ secao: 'viagens', titulo: secao.titulo, lead: 'Viagens (SMs) que tiveram ao menos uma exceção, pelo mês da exceção.' });
  const media = d.meses.length ? d.meses.reduce((s, m) => s + m.viagens, 0) / d.meses.length : 0;
  paginador.adicionar(bloco([
    cartao(formatarNumero(d.total), 'viagens com exceções no período'),
    cartao(formatarNumero(Math.round(media)), 'média por mês'),
    cartao(d.meses.length ? formatarNumero(d.meses[d.meses.length - 1].viagens) : '–', 'no último mês', d.meses.length ? variacaoHtml(d.meses[d.meses.length - 1].variacao) : '')
  ].join(''), 'cartoes-rel tres'));

  const muitos = d.meses.length > 8;
  paginador.adicionar(graficoComoImagem({
    type: 'bar',
    data: {
      labels: d.meses.map(m => muitos ? rotuloMes(m.mes).split('/') : rotuloMes(m.mes)),
      datasets: [{ data: d.meses.map(m => m.viagens), backgroundColor: CORES.navy, borderRadius: 3, maxBarThickness: 56 }]
    },
    options: { layout: { padding: { top: 18 } }, scales: { x: eixoX(), y: eixoY() } }
  }, { largura: 180, altura: 75 }));

  paginador.tabela({
    classe: 'numerica',
    cabecalho: '<tr><th>Mês</th><th class="num">Viagens com exceções</th><th class="num">Variação</th><th class="num">Exceções</th><th class="num">Exceções por viagem</th></tr>',
    linhas: d.meses.map(m => `<tr><td>${rotuloMes(m.mes)}</td><td class="num"><b>${formatarNumero(m.viagens)}</b></td><td class="num">${variacaoHtml(m.variacao)}</td>`
      + `<td class="num">${formatarNumero(m.excecoes)}</td><td class="num">${decimal(m.porViagem)}</td></tr>`)
  });

  const notas = [];
  if (d.cruzaramMes) notas.push(`${formatarNumero(d.cruzaramMes)} ${d.cruzaramMes === 1 ? 'viagem teve' : 'viagens tiveram'} exceções em mais de um mês e ${d.cruzaramMes === 1 ? 'aparece' : 'aparecem'} em cada um deles; no total, cada viagem conta uma vez (por isso a soma dos meses, ${formatarNumero(d.somaMeses)}, passa do total).`);
  if (d.semViagem) notas.push(`${formatarNumero(d.semViagem)} ${d.semViagem === 1 ? 'exceção sem número de SM entra' : 'exceções sem número de SM entram'} nas exceções, mas não nas viagens.`);
  notas.push('O arquivo do BI traz só viagens com exceção; viagens sem nenhuma exceção não aparecem aqui.');
  paginador.adicionar(bloco(notas.map(t => `<p>${t}</p>`).join(''), 'nota-rel'));
}
