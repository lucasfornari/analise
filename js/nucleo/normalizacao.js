// Transforma as linhas cruas da planilha em registros de evento prontos para filtrar e agregar.
import { normalizarChave, limparTexto, chavePlaca, placaValida } from './texto.js';
import { converterData, converterNumero } from './conversores.js';
import { localizarCabecalho, mapearColunas, COLUNAS_OBRIGATORIAS } from './colunas.js';
import { classificarExcecao, classeInformada } from './catalogoExcecoes.js';

const doisDigitos = n => String(n).padStart(2, '0');
const linhaVazia = linha => !linha || linha.every(v => v == null || String(v).trim() === '');
const SEM_VALOR = /^[-\u2013\u2014\s]*$/;   // "-", "–" ou vazio

// "2,5 km de Campinas - SP" -> "Campinas - SP": agrupa eventos pelo local, não pela distância.
export const localDaReferencia = referencia =>
  limparTexto(referencia).replace(/^[\d.,]+\s*km\s+de\s+/i, '').trim() || '(sem referência)';

// Grafias diferentes do mesmo nome ("Alfa Ltda" / "ALFA LTDA.") viram um só rótulo: o primeiro visto.
// O cache pelo valor bruto evita normalizar de novo os valores repetidos (a maioria, em 150 mil linhas).
class Rotulos {
  #porBruto = new Map();
  #porChave = new Map();

  constructor(chaveDe = normalizarChave) {
    this.chaveDe = chaveDe;
  }

  rotulo(bruto) {
    let r = this.#porBruto.get(bruto);
    if (r !== undefined) return r;
    const chave = this.chaveDe(bruto);
    r = this.#porChave.get(chave);
    if (r === undefined) this.#porChave.set(chave, r = limparTexto(bruto));
    this.#porBruto.set(bruto, r);
    return r;
  }
}

// Memoriza uma função de um argumento (valores repetidos em milhares de linhas).
function memorizar(funcao) {
  const cache = new Map();
  return valor => {
    let r = cache.get(valor);
    if (r === undefined && !cache.has(valor)) cache.set(valor, r = funcao(valor));
    return r;
  };
}

function coordenadas(lat, lon) {
  const valida = lat != null && lon != null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
  return valida ? { lat, lon } : { lat: null, lon: null };
}

function novasEstatisticas() {
  return {
    lidas: 0, vazias: 0, descartadas: 0, semData: 0, semCoord: 0, duplicadas: 0,
    naoCatalogadas: 0, classeCorrigida: 0, placasForaDoPadrao: 0, excecoesNaoCatalogadas: []
  };
}

// linhas: matriz de células (header: 1 do SheetJS ou do leitor rápido).
// Retorna { registros, estatisticas, colunas } ou lança erro com mensagem para o usuário.
export function normalizarPlanilha(linhas) {
  const iCabecalho = localizarCabecalho(linhas);
  if (iCabecalho < 0) throw new Error('Não encontrei o cabeçalho com as colunas "Cliente" e "Exceções". Confira se é o export do BI de exceções.');
  const colunas = mapearColunas(linhas[iCabecalho]);
  const faltando = COLUNAS_OBRIGATORIAS.filter(c => colunas[c] < 0);
  if (faltando.length) throw new Error('Colunas obrigatórias ausentes: ' + faltando.join(', ') + '.');

  const celula = (linha, campo) => colunas[campo] >= 0 ? linha[colunas[campo]] : null;
  const rotulo = {
    cliente: new Rotulos(v => normalizarChave(v).replace(/[.\s]+$/, '')),   // ignora ponto final de "LTDA."
    motorista: new Rotulos(), perfil: new Rotulos(), local: new Rotulos(), filial: new Rotulos(),
    seguradora: new Rotulos(), corretora: new Rotulos(), proprietario: new Rotulos(), produto: new Rotulos()
  };
  const texto = (linha, campo) => rotulo[campo].rotulo(celula(linha, campo));
  const classificar = memorizar(nome => classificarExcecao(nome, null));
  const placaDe = memorizar(chavePlaca);
  const localDe = memorizar(ref => rotulo.local.rotulo(localDaReferencia(ref)));
  const maiusculas = memorizar(v => limparTexto(v).toUpperCase());
  // classe da coluna "classe" (null se não reconhecida, undefined se vazia)
  const classeDaPlanilha = memorizar(v => limparTexto(v) ? classeInformada(v) : undefined);
  const naoCatalogadas = new Map();

  const registros = [], chavesVistas = new Set();
  const estatisticas = novasEstatisticas();

  for (let i = iCabecalho + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (linhaVazia(linha)) { estatisticas.vazias++; continue; }
    estatisticas.lidas++;

    // sem cliente ou exceção: rodapé de filtros do BI ou linha quebrada
    const clienteBruto = celula(linha, 'cliente'), excecaoBruta = celula(linha, 'excecao');
    if (!limparTexto(clienteBruto) || !limparTexto(excecaoBruta)) { estatisticas.descartadas++; continue; }

    let excecao = classificar(excecaoBruta);
    if (!excecao.catalogada) {
      // fora do catálogo: a classe da planilha decide (varia por linha, sem cache)
      excecao = classificarExcecao(excecaoBruta, celula(linha, 'classe'));
      estatisticas.naoCatalogadas++;
      naoCatalogadas.set(limparTexto(excecaoBruta), (naoCatalogadas.get(limparTexto(excecaoBruta)) || 0) + 1);
    } else {
      const informada = classeDaPlanilha(celula(linha, 'classe'));
      if (informada !== undefined && informada !== excecao.classe) estatisticas.classeCorrigida++;
    }

    const data = converterData(celula(linha, 'data'));
    if (!data) estatisticas.semData++;
    const { lat, lon } = coordenadas(converterNumero(celula(linha, 'lat')), converterNumero(celula(linha, 'lon')));
    if (lat == null) estatisticas.semCoord++;
    const placa = placaDe(celula(linha, 'placa'));
    if (placa && !placaValida(placa)) estatisticas.placasForaDoPadrao++;

    const mes = data ? `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}` : null;
    const perfilBruto = celula(linha, 'perfil');
    const registro = {
      cliente: texto(linha, 'cliente'),
      excecao: excecao.catalogada ? excecao.nome : limparTexto(excecaoBruta),
      classe: excecao.classe,
      grupo: excecao.grupo,
      data, mes,
      dia: data ? `${mes}-${doisDigitos(data.getDate())}` : null,
      placa,
      carreta: placaDe(celula(linha, 'carreta')),
      motorista: texto(linha, 'motorista'),
      perfil: SEM_VALOR.test(limparTexto(perfilBruto)) ? '(sem perfil)' : rotulo.perfil.rotulo(perfilBruto),
      filial: texto(linha, 'filial'),
      viagem: limparTexto(celula(linha, 'viagem')).replace(/\.0+$/, ''),   // número da SM; "123.0" quando o Excel trata como número
      fimViagem: converterData(celula(linha, 'fimViagem')),
      tecnologia: maiusculas(celula(linha, 'tecnologia')),
      vinculo: limparTexto(celula(linha, 'vinculo')),
      proprietario: texto(linha, 'proprietario'),
      produto: texto(linha, 'produto'),
      seguradora: texto(linha, 'seguradora'),
      corretora: texto(linha, 'corretora'),
      lat, lon,
      referencia: limparTexto(celula(linha, 'referencia')),
      local: localDe(celula(linha, 'referencia'))
    };

    // duplicado exato: mesma SM, exceção, data e placa
    const chave = `${registro.viagem}|${registro.excecao}|${data ? data.getTime() : ''}|${placa}`;
    registro.dup = chavesVistas.has(chave);
    if (registro.dup) estatisticas.duplicadas++; else chavesVistas.add(chave);
    registros.push(registro);
  }
  estatisticas.validas = registros.length;
  estatisticas.excecoesNaoCatalogadas = [...naoCatalogadas.entries()].sort((a, b) => b[1] - a[1]).map(([nome, n]) => ({ nome, n }));
  return { registros, estatisticas, colunas };
}
