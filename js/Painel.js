// Orquestrador: conecta leitura do arquivo, estado e componentes de interface.
// Fluxo: arquivo -> LeitorPlanilha -> Estado.carregar -> atualizar() -> cada componente renderiza.
import { $ } from './util/dom.js';
import { Estado } from './estado/Estado.js';
import { LeitorPlanilha } from './servicos/LeitorPlanilha.js';
import { ControleArquivo } from './ui/ControleArquivo.js';
import { PainelLateral } from './ui/PainelLateral.js';
import { Atalhos } from './ui/Atalhos.js';
import { FiltrosBasicos } from './ui/FiltrosBasicos.js';
import { ListasSelecao } from './ui/ListasSelecao.js';
import { ResumoFiltros } from './ui/ResumoFiltros.js';
import { Indicadores } from './ui/Indicadores.js';
import { Tabelas } from './ui/Tabelas.js';
import { Graficos } from './ui/Graficos.js';
import { Mapa } from './ui/Mapa.js';
import { QualidadeLeitura } from './ui/QualidadeLeitura.js';

export class Painel {
  constructor(xlsx) {
    this.estado = new Estado();
    this.leitor = new LeitorPlanilha(xlsx);

    this.arquivo = new ControleArquivo(this);
    this.lateral = new PainelLateral(this);
    this.filtros = new FiltrosBasicos(this);
    this.listas = new ListasSelecao(this);
    this.resumo = new ResumoFiltros(this);
    this.indicadores = new Indicadores(this);
    this.tabelas = new Tabelas(this);
    this.graficos = new Graficos(this);
    this.mapa = new Mapa(this);
    this.qualidade = new QualidadeLeitura(this);
    new Atalhos(this);

    this.botaoLimpar = $('#btnReset');
    this.botaoLimpar.onclick = () => this.limparFiltros();
  }

  async abrirArquivo(arquivo) {
    this.arquivo.lendo(arquivo.name);
    try {
      const resultado = await this.leitor.ler(arquivo);
      this.estado.carregar(resultado, arquivo.name);
      this.arquivo.carregado(arquivo.name, this.estado.registros.length);
      this.filtros.montar();
      this.listas.montar();
      this.atualizar(true);
    } catch (erro) {
      console.error(erro);
      this.arquivo.falhou(arquivo.name, erro);
    }
  }

  // Recalcula os dados filtrados e redesenha tudo. ajustarMapa: reenquadra o mapa nos eventos.
  atualizar(ajustarMapa = false) {
    this.estado.recalcular();
    this.filtros.renderizar();
    this.listas.renderizar();
    this.resumo.renderizar();
    this.indicadores.renderizar();
    this.tabelas.renderizar();
    this.graficos.renderizar();
    this.mapa.renderizar(ajustarMapa);
    this.qualidade.renderizar();
  }

  limparFiltros() {
    if (!this.estado.carregado) return;
    this.estado.reiniciar();
    this.listas.montar();
    this.atualizar(true);
    // retorno visual, já que o atalho pode ser usado com o menu recolhido
    this.botaoLimpar.classList.add('flash');
    setTimeout(() => this.botaoLimpar.classList.remove('flash'), 600);
  }

  redimensionar() {
    this.mapa.redimensionar();
    this.graficos.redimensionar();
  }
}
