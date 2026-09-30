// Leitura do arquivo enviado (xlsx, xls ou csv) até os registros normalizados. Sem DOM:
// roda no Web Worker, na leitura de reserva da página e nos testes em Node.
import { abrirXlsx } from './leitorXlsx.js';
import { normalizarPlanilha } from '../nucleo/normalizacao.js';

// dependencias: { unzipSync (fflate), carregarSheetJs: async () => módulo SheetJS, aoProgredir?(mensagem) }
export async function lerPlanilha(nomeArquivo, bytes, dependencias) {
  const { unzipSync, carregarSheetJs, aoProgredir = () => {} } = dependencias;

  // .xlsx: leitor rápido; qualquer coisa que ele não reconheça segue para o SheetJS
  if (!/\.(csv|xls)$/i.test(nomeArquivo)) {
    aoProgredir('Descompactando a planilha…');
    const abas = abrirXlsx(bytes, unzipSync);
    if (abas) return primeiraAbaValida(abas, 'rápido', aoProgredir);
  }

  aoProgredir('Lendo a planilha…');
  const xlsx = await carregarSheetJs();
  const livro = /\.csv$/i.test(nomeArquivo) ? lerCsv(xlsx, bytes) : xlsx.read(bytes, { type: 'array', dense: true, cellText: false, cellHTML: false });
  const abas = livro.SheetNames.map(nome => ({
    nome, linhas: () => xlsx.utils.sheet_to_json(livro.Sheets[nome], { header: 1, raw: true, defval: null, blankrows: false })
  }));
  return primeiraAbaValida(abas, 'SheetJS', aoProgredir);
}

// Tenta UTF-8 e cai para Windows-1252 (padrão do Excel BR). raw: true evita ler 05/06 como data americana.
function lerCsv(xlsx, bytes) {
  let texto;
  try { texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { texto = new TextDecoder('windows-1252').decode(bytes); }
  return xlsx.read(texto.replace(/^﻿/, ''), { type: 'string', raw: true, dense: true });
}

// O export pode ter abas auxiliares: usa a primeira que tiver o cabeçalho esperado.
function primeiraAbaValida(abas, leitor, aoProgredir) {
  let ultimoErro;
  for (const aba of abas) {
    aoProgredir(`Lendo a aba "${aba.nome}"…`);
    const linhas = aba.linhas();
    try {
      aoProgredir(`Normalizando ${linhas.length.toLocaleString('pt-BR')} linhas…`);
      const resultado = normalizarPlanilha(linhas);
      if (!resultado.registros.length) throw new Error('Nenhuma linha válida encontrada.');
      return { ...resultado, aba: aba.nome, leitor };
    } catch (erro) {
      ultimoErro = erro;
    }
  }
  throw ultimoErro || new Error('Planilha vazia.');
}
