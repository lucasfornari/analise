// Capa: identidade, quem é o relatório (cliente ou carteira), período, filtros e geração.
import { formatarNumero, escaparHtml } from '../../../util/formatacao.js';
import { bloco } from './comum.js';

export function capa(paginador, { contexto }) {
  paginador.nova({ secao: 'capa', classe: 'capa', capa: true });
  const { logo, sujeito, detalheSujeito, periodo, filtros, geradoEm, versao, arquivo, resumo } = contexto;
  paginador.adicionar(bloco(`
    <div class="capa-logo">${logo}</div>
    <div class="capa-miolo">
      <span class="capa-tipo">Relatório de exceções</span>
      <h1 class="capa-titulo">${escaparHtml(sujeito)}</h1>
      ${detalheSujeito ? `<p class="capa-detalhe">${detalheSujeito}</p>` : ''}
      <p class="capa-periodo">${periodo}</p>
      <div class="capa-numeros">
        <div><b>${formatarNumero(resumo.eventos)}</b><span>exceções</span></div>
        <div><b>${formatarNumero(resumo.viagens)}</b><span>viagens com exceções</span></div>
        <div><b>${formatarNumero(resumo.motoristas)}</b><span>motoristas</span></div>
        <div><b>${formatarNumero(resumo.veiculos)}</b><span>veículos</span></div>
      </div>
    </div>
    <div class="capa-rodape">
      <div><span>Filtros aplicados</span><p>${filtros.length ? filtros.map(([, html]) => html).join(' · ') : 'nenhum (base inteira do arquivo)'}</p></div>
      <div><span>Gerado em</span><p>${geradoEm} · ${escaparHtml(versao)}</p></div>
      <div><span>Arquivo de origem</span><p>${escaparHtml(arquivo)}</p></div>
    </div>`, 'capa-conteudo'));
}
