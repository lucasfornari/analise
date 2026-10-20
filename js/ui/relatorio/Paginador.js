// Folhas A4 do relatório e paginação por medição.
// O relatório é montado fora da área visível, já no tamanho A4 (mm); cada bloco é medido ao entrar:
// se não couber, a folha tenta o modo compacto e, se ainda assim não couber, o conteúdo continua numa
// nova folha com o mesmo título ("continuação"). Assim nenhuma folha transborda nem quebra no meio.

const FOLGA_PX = 1;   // arredondamento de subpixel

export class Paginador {
  folhas = [];   // { elemento, conteudo, secao, titulo }

  // raiz: contêiner do relatório; topo(): HTML do cabeçalho das folhas internas
  constructor(raiz, topo) {
    this.raiz = raiz;
    this.topo = topo;
  }

  // Nova folha. capa: sem cabeçalho/rodapé padrão. Retorna o contêiner do conteúdo.
  nova({ secao, titulo = '', lead = '', classe = '', capa = false }) {
    const folha = document.createElement('section');
    folha.className = `folha ${classe}`;
    folha.dataset.secao = secao;
    folha.innerHTML = capa
      ? '<div class="folha-conteudo"></div>'
      : `<header class="folha-topo">${this.topo()}</header>
         ${titulo ? `<h1>${titulo}</h1>` : ''}${lead ? `<p class="lead">${lead}</p>` : ''}
         <div class="folha-conteudo"></div>
         <footer class="folha-rodape"><span class="rodape-esquerda"></span><span class="rodape-pagina"></span></footer>`;
    this.raiz.append(folha);
    const conteudo = folha.querySelector('.folha-conteudo');
    this.folhas.push({ elemento: folha, conteudo, secao, titulo, lead, classe, continuacao: false });
    return conteudo;
  }

  get atual() { return this.folhas[this.folhas.length - 1]; }

  #cabe(folha = this.atual) {
    return folha.conteudo.scrollHeight <= folha.conteudo.clientHeight + FOLGA_PX;
  }

  // Folha de continuação da seção atual (mesmo título e classe).
  #continuar() {
    const { secao, titulo, classe } = this.atual;
    this.nova({ secao, titulo: titulo ? `${titulo} <small>(continuação)</small>` : '', classe });
    this.atual.continuacao = true;
  }

  // Coloca um bloco inteiro (gráfico, cartões, texto): se não couber, vai para a próxima folha.
  adicionar(bloco) {
    this.atual.conteudo.append(bloco);
    if (this.#cabe() || this.#compactar()) return bloco;
    if (this.atual.conteudo.childElementCount > 1) {
      bloco.remove();
      this.#continuar();
      this.atual.conteudo.append(bloco);
    }
    return bloco;   // bloco maior que uma folha inteira: fica (cortado); os testes garantem que isso não acontece
  }

  // Tabela linha a linha; ao virar a folha, repete o cabeçalho. linhas: HTML de cada <tr>.
  tabela({ cabecalho, linhas, classe = '' }) {
    const nova = () => {
      const tabela = document.createElement('table');
      tabela.className = `tabela-rel ${classe}`;
      tabela.innerHTML = `<thead>${cabecalho}</thead><tbody></tbody>`;
      this.atual.conteudo.append(tabela);
      return tabela.tBodies[0];
    };
    let corpo = nova();
    const molde = document.createElement('tbody');
    for (const html of linhas) {
      molde.innerHTML = html;
      const linha = molde.firstElementChild;
      corpo.append(linha);
      if (this.#cabe() || this.#compactar()) continue;
      linha.remove();
      if (!corpo.rows.length) corpo.closest('table').remove();   // nem o cabeçalho com uma linha coube aqui
      this.#continuar();
      corpo = nova();
      corpo.append(linha);
    }
  }

  // Modo compacto (fonte e espaçamento menores) antes de quebrar a folha; true se passou a caber.
  #compactar() {
    const folha = this.atual.elemento;
    if (folha.classList.contains('compacta')) return false;
    folha.classList.add('compacta');
    if (this.#cabe()) return true;
    folha.classList.remove('compacta');
    return false;
  }

  // Numeração "página x de n" e texto do rodapé; devolve a primeira página de cada seção (sumário).
  finalizar(textoRodape) {
    const total = this.folhas.length, inicioDaSecao = {};
    this.folhas.forEach(({ elemento, secao }, i) => {
      inicioDaSecao[secao] ??= i + 1;
      const pagina = elemento.querySelector('.rodape-pagina');
      if (pagina) pagina.textContent = `Página ${i + 1} de ${total}`;
      const esquerda = elemento.querySelector('.rodape-esquerda');
      if (esquerda) esquerda.textContent = textoRodape;
    });
    return inicioDaSecao;
  }
}
