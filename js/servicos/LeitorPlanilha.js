// Lê o arquivo enviado num Web Worker, para a tela não travar com planilhas grandes.
// Sem suporte a module worker (navegadores antigos), lê na própria página.
import { CDN } from '../config/cdn.js';
import { lerPlanilha } from './lerPlanilha.js';

export class LeitorPlanilha {
  #worker = null;

  // aoProgredir(mensagem): etapas da leitura, para mostrar ao usuário
  async ler(arquivo, aoProgredir = () => {}) {
    try {
      return await this.#lerNoWorker(arquivo, aoProgredir);
    } catch (erro) {
      if (!erro.semWorker) throw erro;
      return this.#lerNaPagina(arquivo, aoProgredir);
    }
  }

  // Um worker por leitura: libera a memória do XML (centenas de MB) assim que termina.
  #lerNoWorker(arquivo, aoProgredir) {
    return new Promise((resolver, rejeitar) => {
      let worker;
      try {
        worker = new Worker(new URL('./leitor.worker.js', import.meta.url), { type: 'module' });
      } catch {
        rejeitar(Object.assign(new Error('Worker indisponível'), { semWorker: true }));
        return;
      }
      this.#worker?.terminate();
      this.#worker = worker;
      let iniciou = false;
      const encerrar = () => { worker.terminate(); if (this.#worker === worker) this.#worker = null; };
      worker.onmessage = ({ data }) => {
        if (data.pronto) { iniciou = true; worker.postMessage({ arquivo }); }
        else if (data.progresso) aoProgredir(data.progresso);
        else if (data.resultado) { encerrar(); resolver(data.resultado); }
        else if (data.erro) { encerrar(); rejeitar(new Error(data.erro)); }
      };
      // erro antes de o worker iniciar (sem suporte a módulos ou CDN fora): tenta na página
      worker.onerror = evento => {
        evento.preventDefault();
        encerrar();
        rejeitar(iniciou ? new Error(evento.message || 'Falha ao ler a planilha.') : Object.assign(new Error('Worker indisponível'), { semWorker: true }));
      };
    });
  }

  async #lerNaPagina(arquivo, aoProgredir) {
    const { unzipSync } = await import(CDN.fflate);
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    return lerPlanilha(arquivo.name, bytes, { unzipSync, carregarSheetJs: () => import(CDN.sheetjs), aoProgredir });
  }
}
