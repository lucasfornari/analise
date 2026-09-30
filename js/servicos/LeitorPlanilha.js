// Leitura do arquivo enviado (xlsx, xls ou csv) usando o SheetJS.
import { normalizarPlanilha } from '../nucleo/normalizacao.js';

export class LeitorPlanilha {
  // xlsx: biblioteca SheetJS (global XLSX no navegador, pacote npm nos testes)
  constructor(xlsx) {
    this.xlsx = xlsx;
  }

  async ler(arquivo) {
    return this.lerBytes(arquivo.name, new Uint8Array(await arquivo.arrayBuffer()));
  }

  lerBytes(nomeArquivo, bytes) {
    const livro = /\.csv$/i.test(nomeArquivo) ? this.#lerCsv(bytes) : this.xlsx.read(bytes, { type: 'array', cellDates: false });
    const resultado = this.#primeiraAbaValida(livro);
    if (!resultado.registros.length) throw new Error('Nenhuma linha válida encontrada.');
    return resultado;
  }

  // Tenta UTF-8 e cai para Windows-1252 (padrão do Excel BR). raw: true evita ler 05/06 como data americana.
  #lerCsv(bytes) {
    let texto;
    try { texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { texto = new TextDecoder('windows-1252').decode(bytes); }
    return this.xlsx.read(texto.replace(/^﻿/, ''), { type: 'string', raw: true });
  }

  // O export pode ter abas auxiliares: usa a primeira que tiver o cabeçalho esperado.
  #primeiraAbaValida(livro) {
    let ultimoErro;
    for (const aba of livro.SheetNames) {
      const linhas = this.xlsx.utils.sheet_to_json(livro.Sheets[aba], { header: 1, raw: true, defval: null, blankrows: false });
      try {
        return { ...normalizarPlanilha(linhas, this.xlsx.SSF), aba };
      } catch (erro) {
        ultimoErro = erro;
      }
    }
    throw ultimoErro || new Error('Planilha vazia.');
  }
}
