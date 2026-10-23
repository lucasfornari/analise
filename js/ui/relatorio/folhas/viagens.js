// Viagens e exceções por viagem: mostra lado a lado viagens, exceções e a intensidade (exceções por viagem),
// para não ler "mais exceções" como piora quando o mês simplesmente teve mais viagens.
import { formatarNumero, rotuloMes } from '../../../util/formatacao.js';
import { CORES } from '../../../config/tema.js';
import { graficoComoImagem, eixoX, eixoY } from '../graficos.js';
import { bloco, cartao, variacaoHtml, conclusaoDoMes } from './comum.js';

const decimal = v => v == null ? '–' : v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const COR_INTENSIDADE = CORES.alta;

export function viagens(paginador, { secao }) {
  const d = secao.dados;
  paginador.nova({ secao: 'viagens', titulo: secao.titulo,
    lead: 'Mais viagens no mês trazem mais exceções. O que mostra se o mês foi melhor ou pior é a quantidade de <b>exceções por viagem</b>.' });
  const ultimo = d.meses[d.meses.length - 1];
  paginador.adicionar(bloco([
    cartao(formatarNumero(d.total), 'viagens com exceções no período'),
    cartao(ultimo ? formatarNumero(ultimo.viagens) : '–', 'viagens no último mês', ultimo ? variacaoHtml(ultimo.variacao, { neutra: true }) : ''),
    cartao(ultimo ? formatarNumero(ultimo.excecoes) : '–', 'exceções no último mês', ultimo ? variacaoHtml(ultimo.variacaoExcecoes) : ''),
    cartao(ultimo ? decimal(ultimo.porViagem) : '–', 'exceções por viagem no último mês', ultimo ? variacaoHtml(ultimo.variacaoPorViagem) : '', 'destaque')
  ].join(''), 'cartoes-rel quatro'));
  const conclusao = conclusaoDoMes(ultimo);
  if (conclusao) paginador.adicionar(bloco(conclusao));

  // colunas: viagens e exceções (eixo da esquerda); linha: exceções por viagem (eixo da direita)
  const muitos = d.meses.length > 8;
  paginador.adicionar(bloco(`<span><i class="quadro viagens"></i>Viagens com exceções</span><span><i class="quadro excecoes"></i>Exceções</span>
    <span><i class="linha-legenda"></i>Exceções por viagem (eixo da direita)</span>`, 'legenda-rel legenda-bloco'));
  paginador.adicionar(graficoComoImagem({
    type: 'bar',
    data: {
      labels: d.meses.map(m => muitos ? rotuloMes(m.mes).split('/') : rotuloMes(m.mes)),
      datasets: [
        { label: 'Viagens com exceções', data: d.meses.map(m => m.viagens), backgroundColor: CORES.navy, borderRadius: 3, maxBarThickness: 44, order: 2 },
        { label: 'Exceções', data: d.meses.map(m => m.excecoes), backgroundColor: CORES.indigo, borderRadius: 3, maxBarThickness: 44, order: 2 },
        { type: 'line', label: 'Exceções por viagem', data: d.meses.map(m => m.porViagem == null ? null : Math.round(m.porViagem * 10) / 10),
          yAxisID: 'porViagem', borderColor: COR_INTENSIDADE, backgroundColor: COR_INTENSIDADE, borderWidth: 2.5, pointRadius: 4, tension: 0, order: 1, rotulo: decimal }
      ]
    },
    options: {
      layout: { padding: { top: 20 } },
      scales: {
        x: eixoX(), y: eixoY(),
        porViagem: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { color: COR_INTENSIDADE, callback: v => decimal(v) } }
      }
    }
  }, { largura: 180, altura: 80 }));

  paginador.tabela({
    classe: 'numerica',
    cabecalho: '<tr><th>Mês</th><th class="num">Viagens</th><th class="num">Var.</th><th class="num">Exceções</th><th class="num">Var.</th><th class="num">Exceções por viagem</th><th class="num">Var.</th></tr>',
    linhas: d.meses.map(m => `<tr><td>${rotuloMes(m.mes)}</td><td class="num">${formatarNumero(m.viagens)}</td><td class="num">${variacaoHtml(m.variacao, { neutra: true })}</td>`
      + `<td class="num">${formatarNumero(m.excecoes)}</td><td class="num">${variacaoHtml(m.variacaoExcecoes)}</td>`
      + `<td class="num"><b>${decimal(m.porViagem)}</b></td><td class="num">${variacaoHtml(m.variacaoPorViagem)}</td></tr>`)
  });

  const notas = [];
  if (d.cruzaramMes) notas.push(`${formatarNumero(d.cruzaramMes)} ${d.cruzaramMes === 1 ? 'viagem teve' : 'viagens tiveram'} exceções em mais de um mês e ${d.cruzaramMes === 1 ? 'aparece' : 'aparecem'} em cada um deles; no total, cada viagem conta uma vez (por isso a soma dos meses, ${formatarNumero(d.somaMeses)}, passa do total).`);
  if (d.semViagem) notas.push(`${formatarNumero(d.semViagem)} ${d.semViagem === 1 ? 'exceção sem número de SM entra' : 'exceções sem número de SM entram'} nas exceções, mas não nas viagens.`);
  notas.push('O arquivo do BI traz só viagens com exceção; viagens sem nenhuma exceção não aparecem aqui.');
  paginador.adicionar(bloco(notas.map(t => `<p>${t}</p>`).join(''), 'nota-rel'));
}
