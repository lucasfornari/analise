// Web Worker de leitura: descompacta, lê e normaliza a planilha fora da thread da tela.
// Mensagens enviadas: { progresso } durante a leitura e, no fim, { resultado } ou { erro }.
import { CDN } from '../config/cdn.js';
import { lerPlanilha } from './lerPlanilha.js';

const { unzipSync } = await import(CDN.fflate);
const carregarSheetJs = () => import(CDN.sheetjs);

self.onmessage = async ({ data: { arquivo } }) => {
  try {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const resultado = await lerPlanilha(arquivo.name, bytes, {
      unzipSync, carregarSheetJs, aoProgredir: progresso => self.postMessage({ progresso })
    });
    self.postMessage({ progresso: 'Preparando o painel…' });
    self.postMessage({ resultado });
  } catch (erro) {
    self.postMessage({ erro: erro.message || String(erro) });
  }
};

self.postMessage({ pronto: true });
