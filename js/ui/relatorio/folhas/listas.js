// Top N motoristas, veículos e locais: uma tabela por folha, com as principais exceções de cada item.
import { formatarNumero, escaparHtml, abreviarCliente, formatarCoordenada } from '../../../util/formatacao.js';
import { linkGoogleMaps } from '../../../util/links.js';
import { pct, excecoesHtml, nomeComApoio } from './comum.js';

const lead = (d, quantos, deQue, total, rotuloTotal) =>
  `Os ${formatarNumero(d.itens.length)} ${quantos} com mais ${deQue}: juntos, somam <b>${pct(d.cobertura)}</b> ${rotuloTotal} (${formatarNumero(total)} ${quantos} no período).`;

export function motoristas(paginador, { secao }) {
  const d = secao.dados;
  paginador.nova({ secao: 'motoristas', titulo: `Top ${d.itens.length} motoristas`, lead: lead(d, 'motoristas', 'exceções', d.totalDeMotoristas, 'das exceções de motorista') });
  paginador.tabela({
    classe: 'lista-rel',
    cabecalho: '<tr><th class="num">#</th><th>Motorista</th><th class="num">Exceções</th><th class="num">Placas</th><th>Principais exceções</th></tr>',
    linhas: d.itens.map(m => `<tr><td class="num posicao">${m.posicao}</td><td class="col-nome">${nomeComApoio(m.nome, escaparHtml(abreviarCliente(m.cliente)))}</td>`
      + `<td class="num"><b>${formatarNumero(m.total)}</b><small class="apoio-rel">${pct(m.pct)}</small></td><td class="num">${formatarNumero(m.placas)}</td><td>${excecoesHtml(m.excecoes)}</td></tr>`)
  });
}

export function veiculos(paginador, { secao }) {
  const d = secao.dados;
  paginador.nova({ secao: 'veiculos', titulo: `Top ${d.itens.length} veículos`, lead: lead(d, 'veículos', 'exceções de veículo e contexto suspeito', d.totalDeVeiculos, 'dessas exceções') });
  paginador.tabela({
    classe: 'lista-rel',
    cabecalho: '<tr><th class="num">#</th><th>Placa</th><th class="num">Exceções</th><th class="num">Viagens</th><th>Principais exceções</th></tr>',
    linhas: d.itens.map(v => `<tr><td class="num posicao">${v.posicao}</td><td class="col-nome">${nomeComApoio(v.nome, `${escaparHtml(abreviarCliente(v.cliente))}${v.tecnologia ? ` · ${escaparHtml(v.tecnologia)}` : ''}`)}</td>`
      + `<td class="num"><b>${formatarNumero(v.total)}</b><small class="apoio-rel">${pct(v.pct)}</small></td><td class="num">${formatarNumero(v.viagens)}</td><td>${excecoesHtml(v.excecoes)}</td></tr>`)
  });
}

export function locais(paginador, { secao }) {
  const d = secao.dados;
  paginador.nova({ secao: 'locais', titulo: `Top ${d.itens.length} locais com mais alertas`,
    lead: `${lead(d, 'locais', 'alertas', d.totalDeLocais, 'de todas as exceções')} Centro e raio servem de base para criar alvos (cercas) ou estudar a redução.` });
  paginador.tabela({
    classe: 'lista-rel',
    cabecalho: '<tr><th class="num">#</th><th>Local</th><th class="num">Alertas</th><th class="num">Placas</th><th>Principais exceções</th></tr>',
    linhas: d.itens.map(l => {
      const alvo = l.centro
        ? `centro <a href="${linkGoogleMaps(l.centro.lat, l.centro.lon)}">${formatarCoordenada(l.centro)}</a> · raio ${formatarNumero(l.raio)} m`
        : 'sem coordenadas';
      return `<tr><td class="num posicao">${l.posicao}</td><td class="col-nome">${nomeComApoio(l.nome, alvo)}</td>`
        + `<td class="num"><b>${formatarNumero(l.total)}</b><small class="apoio-rel">${pct(l.pct)}</small></td><td class="num">${formatarNumero(l.placas)}</td><td>${excecoesHtml(l.excecoes)}</td></tr>`;
    })
  });
}
