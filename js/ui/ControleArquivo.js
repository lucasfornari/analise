// Entrada e saída de arquivos: upload (botão ou arrastar), exportação do CSV e mensagens de status.
import { $ } from '../util/dom.js';
import { formatarNumero } from '../util/formatacao.js';
import { baixarArquivo } from '../util/download.js';
import { gerarCsv } from '../nucleo/exportacao.js';

export class ControleArquivo {
  constructor(painel) {
    this.painel = painel;
    this.entrada = $('#fileInput');
    this.areaVazia = $('#empty');

    $('#btnUpload').onclick = $('#btnUpload2').onclick = () => this.entrada.click();
    this.entrada.onchange = () => {
      const arquivo = this.entrada.files[0];
      if (arquivo) painel.abrirArquivo(arquivo);
      this.entrada.value = '';   // permite reenviar o mesmo arquivo
    };
    $('#btnExport').onclick = () => this.exportar();
    this.#habilitarArrastar();
  }

  // Aceita soltar o arquivo em qualquer lugar da página.
  #habilitarArrastar() {
    for (const evento of ['dragenter', 'dragover']) {
      document.addEventListener(evento, e => { e.preventDefault(); this.areaVazia.classList.add('drag'); });
    }
    for (const evento of ['dragleave', 'drop']) {
      document.addEventListener(evento, e => {
        e.preventDefault();
        if (evento === 'drop' || e.target === this.areaVazia) this.areaVazia.classList.remove('drag');
      });
    }
    document.addEventListener('drop', e => {
      const arquivo = e.dataTransfer?.files?.[0];
      if (arquivo) this.painel.abrirArquivo(arquivo);
    });
  }

  lendo(nome) {
    $('#errMsg').textContent = '';
    $('#fileInfo').textContent = `Lendo ${nome}…`;
    this.#mostrarProgresso(`Lendo ${nome}…`);
  }

  progresso(mensagem) {
    this.#mostrarProgresso(mensagem);
  }

  #mostrarProgresso(mensagem) {
    $('#progresso').classList.toggle('hidden', !mensagem);
    $('#progressoTexto').textContent = mensagem || '';
    $('#btnUpload').disabled = $('#btnUpload2').disabled = !!mensagem;
  }

  carregado(nome, total) {
    this.#mostrarProgresso('');
    $('#fileInfo').textContent = `${nome} · ${formatarNumero(total)} eventos`;
    this.areaVazia.classList.add('hidden');
    $('#dash').classList.remove('hidden');
    $('#btnExport').disabled = false;
  }

  falhou(nome, erro) {
    this.#mostrarProgresso('');
    $('#fileInfo').textContent = `Falha ao ler ${nome}`;
    $('#errMsg').textContent = erro.message;
    this.areaVazia.classList.remove('hidden');
    $('#dash').classList.add('hidden');
  }

  exportar() {
    baixarArquivo('excecoes_filtradas.csv', gerarCsv(this.painel.estado.filtrados), 'text/csv;charset=utf-8');
  }
}
