// Leitor rápido de .xlsx: descompacta com fflate e percorre os bytes do XML da aba.
// O export do BI chega a 150 mil linhas (200 MB de XML); o SheetJS leva ~20 s nele, este leitor ~3 s.
// Retorna as linhas no mesmo formato do SheetJS (header: 1, raw: true, defval: null, sem linhas vazias).
// Não usa DOM: roda em Web Worker e nos testes em Node. unzipSync é injetado (fflate).

const MENOR = 60, MAIOR = 62, BARRA = 47, ASPAS = 34, DOIS_PONTOS = 58, E_COMERCIAL = 38, SUBLINHADO = 95;
const utf8 = new TextDecoder('utf-8');
const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

// &amp; &#10; e o escape do Excel _x000D_
function decodificarXml(texto) {
  if (texto.indexOf('&') >= 0) {
    texto = texto.replace(/&(amp|lt|gt|quot|apos|#x[0-9a-fA-F]+|#\d+);/g, (_, e) =>
      ENTIDADES[e] ?? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)));
  }
  if (texto.indexOf('_x') >= 0) texto = texto.replace(/_x([0-9A-Fa-f]{4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return texto;
}

// Texto curto e ASCII (a maioria das células) sem passar pelo TextDecoder, que é caro por chamada.
function texto(bytes, inicio, fim) {
  if (fim - inicio < 64) {
    let ascii = true, especial = false;
    for (let i = inicio; i < fim; i++) {
      const b = bytes[i];
      if (b > 127) { ascii = false; break; }
      if (b === E_COMERCIAL || b === SUBLINHADO) especial = true;
    }
    if (ascii) {
      const s = String.fromCharCode.apply(null, bytes.subarray(inicio, fim));
      return especial ? decodificarXml(s) : s;
    }
  }
  return decodificarXml(utf8.decode(bytes.subarray(inicio, fim)));
}

// Tags que interessam, identificadas pelo nome local (sem prefixo de namespace como "x:").
const TAG = { OUTRA: 0, ROW: 1, C: 2, V: 3, T: 4, SI: 5 };

// Compara bytes em vez de criar uma string por tag: o XML da aba tem milhões delas.
function tagDe(bytes, inicio, fim) {
  let ini = inicio, i = inicio;
  while (i < fim) {
    const b = bytes[i];
    if (b === 32 || b === MAIOR || b === BARRA || b === 9 || b === 10 || b === 13) break;
    if (b === DOIS_PONTOS) ini = i + 1;
    i++;
  }
  const tamanho = i - ini, a = bytes[ini];
  if (tamanho === 1) return a === 99 ? TAG.C : a === 118 ? TAG.V : a === 116 ? TAG.T : TAG.OUTRA;            // c v t
  if (tamanho === 2) return a === 115 && bytes[ini + 1] === 105 ? TAG.SI : TAG.OUTRA;                         // si
  if (tamanho === 3) return a === 114 && bytes[ini + 1] === 111 && bytes[ini + 2] === 119 ? TAG.ROW : TAG.OUTRA; // row
  return TAG.OUTRA;
}

// Valor de um atributo (t="s", r="B12") dentro da tag de abertura.
function atributo(bytes, inicio, fim, nome) {
  const alvo = ' ' + nome + '="';
  outer: for (let i = inicio; i < fim - alvo.length; i++) {
    for (let k = 0; k < alvo.length; k++) if (bytes[i + k] !== alvo.charCodeAt(k)) continue outer;
    const ini = i + alvo.length, fimValor = bytes.indexOf(ASPAS, ini);
    return String.fromCharCode.apply(null, bytes.subarray(ini, fimValor));
  }
  return null;
}

// "AB12" -> 27
function colunaDaReferencia(ref) {
  let n = 0;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c < 65 || c > 90) break;
    n = n * 26 + c - 64;
  }
  return n - 1;
}

// Percorre as tags do XML chamando visitar(tag, fechamento, autoFechada, inicioTag, fimTag, fimTexto).
// fimTexto: onde termina o texto que vem depois da tag (até o próximo "<").
function percorrer(bytes, visitar) {
  let i = bytes.indexOf(MENOR);
  while (i >= 0) {
    const fimTag = bytes.indexOf(MAIOR, i);
    if (fimTag < 0) break;
    const fechamento = bytes[i + 1] === BARRA;
    const tag = tagDe(bytes, fechamento ? i + 2 : i + 1, fimTag);
    const proxima = bytes.indexOf(MENOR, fimTag + 1);
    if (tag !== TAG.OUTRA) visitar(tag, fechamento, bytes[fimTag - 1] === BARRA, i, fimTag, proxima < 0 ? bytes.length : proxima);
    i = proxima;
  }
}

function lerTextosCompartilhados(bytes) {
  const textos = [];
  let atual = null;
  percorrer(bytes, (tag, fechamento, autoFechada, inicio, fimTag, fimTexto) => {
    if (tag === TAG.SI) { if (fechamento) textos.push(atual); else atual = ''; }
    else if (tag === TAG.T && !fechamento && !autoFechada && atual !== null) atual += texto(bytes, fimTag + 1, fimTexto);
  });
  return textos;
}

function lerLinhas(bytes, compartilhados) {
  const linhas = [];
  let linha = null, coluna = 0, tipo = null, valor = null, inline = '';

  percorrer(bytes, (tag, fechamento, autoFechada, inicio, fimTag, fimTexto) => {
    switch (tag) {
      case TAG.ROW:
        if (fechamento) { linhas.push(linha); linha = null; }
        else if (autoFechada) linhas.push([]);
        else { linha = []; coluna = 0; }
        break;
      case TAG.C: {
        if (fechamento) { guardar(); break; }
        const ref = atributo(bytes, inicio, fimTag, 'r');
        if (ref) coluna = colunaDaReferencia(ref);
        tipo = atributo(bytes, inicio, fimTag, 't');
        valor = null; inline = '';
        if (autoFechada) coluna++;
        break;
      }
      case TAG.V:
        if (!fechamento && !autoFechada) valor = texto(bytes, fimTag + 1, fimTexto);
        break;
      case TAG.T:
        if (!fechamento && !autoFechada) inline += texto(bytes, fimTag + 1, fimTexto);
        break;
    }
  });

  function guardar() {
    let v = null;
    if (tipo === 'inlineStr') v = inline;
    else if (valor !== null) {
      if (tipo === 's') v = compartilhados[+valor];
      else if (tipo === 'str' || tipo === 'e') v = valor;
      else if (tipo === 'b') v = valor === '1';
      else v = Number(valor);
    }
    if (v !== null) linha[coluna] = v;
    coluna++;
  }

  // mesmo formato do SheetJS: linhas vazias omitidas e todas com a largura da planilha (buracos = null)
  const preenchidas = linhas.filter(l => l.length && l.some(v => v !== undefined));
  const largura = preenchidas.reduce((max, l) => Math.max(max, l.length), 0);
  for (const l of preenchidas) {
    for (let i = 0; i < largura; i++) if (l[i] === undefined) l[i] = null;
  }
  return preenchidas;
}

// Abas na ordem do workbook: [{ nome, caminho }]
function listarAbas(arquivos) {
  const ler = caminho => arquivos[caminho] ? utf8.decode(arquivos[caminho]) : '';
  const rels = new Map();
  for (const m of ler('xl/_rels/workbook.xml.rels').matchAll(/<(?:\w+:)?Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[0])?.[1], alvo = /\bTarget="([^"]+)"/.exec(m[0])?.[1];
    if (id && alvo) rels.set(id, alvo.startsWith('/') ? alvo.slice(1) : 'xl/' + alvo.replace(/^\.\//, ''));
  }
  const abas = [];
  for (const m of ler('xl/workbook.xml').matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)) {
    const nome = decodificarXml(/\bname="([^"]*)"/.exec(m[0])?.[1] ?? '');
    const id = /\br:id="([^"]+)"|\b\w+:id="([^"]+)"/.exec(m[0]);
    const caminho = rels.get(id?.[1] ?? id?.[2]);
    if (caminho && arquivos[caminho]) abas.push({ nome, caminho });
  }
  return abas;
}

// Retorna [{ nome, linhas() }] com a leitura de cada aba sob demanda, ou null se não reconhecer o arquivo.
export function abrirXlsx(bytes, unzipSync) {
  let arquivos;
  try {
    arquivos = unzipSync(bytes, { filter: f => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(f.name) });
  } catch {
    return null;   // não é zip (ex.: .xls antigo)
  }
  const abas = listarAbas(arquivos);
  if (!abas.length) return null;
  let compartilhados;
  const textosCompartilhados = () => compartilhados ??= arquivos['xl/sharedStrings.xml'] ? lerTextosCompartilhados(arquivos['xl/sharedStrings.xml']) : [];
  return abas.map(({ nome, caminho }) => ({ nome, linhas: () => lerLinhas(arquivos[caminho], textosCompartilhados()) }));
}
