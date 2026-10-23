// Resumo: indicadores, divisão por classe, destaques e sumário (preenchido depois da paginação).
import { formatarNumero, escaparHtml, capitalizar, rotuloMes } from '../../../util/formatacao.js';
import { mesAnterior } from '../../../nucleo/agregacao.js';
import { ROTULO_CLASSE } from '../../../nucleo/catalogoExcecoes.js';
import { bloco, cartao, pct, variacaoHtml } from './comum.js';

export function resumo(paginador, { secao }) {
  const d = secao.dados;
  paginador.nova({ secao: 'resumo', titulo: 'Resumo', lead: 'Os números principais do período e o que mais chama atenção.' });
  paginador.adicionar(bloco([
    cartao(formatarNumero(d.viagens), 'viagens com exceções'),
    cartao(formatarNumero(d.eventos), 'exceções (alertas)'),
    cartao(d.porViagem == null ? '–' : d.porViagem.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), 'exceções por viagem'),
    cartao(formatarNumero(d.motoristas), 'motoristas com exceção'),
    cartao(formatarNumero(d.veiculos), 'veículos com exceção'),
    cartao(formatarNumero(d.locais), 'locais com alertas')
  ].join(''), 'cartoes-rel'));

  const classes = Object.entries(d.porClasse);
  paginador.adicionar(bloco(`<h2>Exceções por classe</h2>
    <div class="barra-classes">${classes.map(([c, n]) => n ? `<i class="${c.toLowerCase()}" style="flex:${n}"></i>` : '').join('')}</div>
    <div class="classes-rel">${classes.map(([c, n]) => `<div><i class="ponto ${c.toLowerCase()}"></i>${ROTULO_CLASSE[c]} <b>${formatarNumero(n)}</b> <small>${pct(d.eventos ? n / d.eventos : 0)}</small></div>`).join('')}</div>`));

  const { excecao, motorista, veiculo, local } = d.destaques;
  const destaques = [
    leituraDoMes(d.ultimoMes),
    excecao && `A exceção mais frequente foi <b>${escaparHtml(capitalizar(excecao.nome))}</b>: ${formatarNumero(excecao.n)} eventos (${pct(excecao.pct)} do total).`,
    motorista && `O motorista com mais exceções foi <b>${escaparHtml(motorista.nome)}</b> (${formatarNumero(motorista.n)}).`,
    veiculo && `O veículo com mais exceções foi a placa <b>${escaparHtml(veiculo.nome)}</b> (${formatarNumero(veiculo.n)}).`,
    local && `O local com mais alertas foi <b>${escaparHtml(local.local)}</b> (${formatarNumero(local.total)}).`
  ].filter(Boolean);
  paginador.adicionar(bloco(`<h2>Destaques</h2><ul class="destaques-rel">${destaques.map(t => `<li>${t}</li>`).join('')}</ul>`));
  paginador.adicionar(bloco('<h2>Neste relatório</h2><ol class="sumario-rel"></ol>', 'sumario-bloco'));
}

// Exceções, viagens e exceções por viagem do último mês numa frase só: mais exceções com mais viagens não é piora.
function leituraDoMes(m) {
  if (!m?.variacaoExcecoes) return '';
  const ant = rotuloMes(mesAnterior(m.mes)), dec = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const exc = `<b>${formatarNumero(m.excecoes)}</b> exceções (${variacaoHtml(m.variacaoExcecoes)})`;
  const via = m.variacao ? ` em <b>${formatarNumero(m.viagens)}</b> viagens (${variacaoHtml(m.variacao, { neutra: true })})` : '';
  const intensidade = m.variacaoPorViagem
    ? `: <b>${dec(m.porViagem)}</b> exceções por viagem, ${variacaoHtml(m.variacaoPorViagem)} contra ${ant} (${dec(m.variacaoPorViagem.anterior)}).`
    : ` contra ${ant}.`;
  return `Em <b>${rotuloMes(m.mes)}</b> foram ${exc}${via}${intensidade}`;
}

// Chamado depois da paginação, quando as páginas de cada seção são conhecidas.
export function preencherSumario(raiz, itens) {
  const lista = raiz.querySelector('.sumario-rel');
  if (lista) lista.innerHTML = itens.map(({ titulo, pagina }) => `<li><span>${titulo}</span><i></i><b>${pagina}</b></li>`).join('');
}
