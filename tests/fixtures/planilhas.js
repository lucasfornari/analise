// Planilhas de teste geradas em memória, no formato do export do BI (sem arquivos binários no repositório).
//   linhasDeExemplo(): conjunto pequeno e determinístico, pensado para cada regra do painel
//   linhasEmMassa(n):  volume realista para testes de desempenho
//   xlsxDoExport / xlsxDoExcel / csvDoExport: as mesmas linhas nos formatos que o painel lê
import { zipSync, strToU8 } from 'fflate';
import XLSX from 'xlsx';

export const CABECALHO = ['Grupo', 'Corretora', 'Seguradora', 'Cliente', 'Cod Viagem', 'Data Fim Viagem', 'Filial', 'Vinculo',
  'Placa', 'Carreta', 'Motorista', 'Proprietario', 'Tecnologia', 'Perfil', 'Produto', 'Exceções', 'Data Excecao',
  'latitude', 'longitude', 'referencia', 'classe'];

// Rodapé que o BI coloca depois dos dados: sem cliente, deve ser descartado.
export const RODAPE = [['Filtros aplicados:\r\nMês é julho, agosto ou setembro\r\nAno é 2026'],
  ['Exported data exceeded the allowed volume. Some data may have been omitted.']];

// Data local -> serial do Excel (como o BI grava as datas).
export const serialExcel = (ano, mes, dia, hora = 0, minuto = 0) => Date.UTC(ano, mes - 1, dia, hora, minuto) / 864e5 + 25569;

const LOCAIS = {
  cascavel: { ref: '3,73 km de POSTO LETICIA - CASCAVEL/PR', lat: -24.89564, lon: -53.42362 },
  cascavel2: { ref: '9.88 km de POSTO LETICIA - CASCAVEL/PR', lat: -24.90254, lon: -53.43518 },
  cajamar: { ref: '0,31 km de CD CAJAMAR - CAJAMAR/SP', lat: -23.35, lon: -46.87 },
  recife: { ref: 'RECIFE - PE', lat: -8.05, lon: -34.9 },
  semCoord: { ref: '', lat: null, lon: null }
};
const ALFA = 'TRANSPORTES ALFA LTDA', BETA = 'BETA LOGÍSTICA S/A', GAMA = 'GAMA CARGAS';

// Um evento: [cliente, sm, placa, motorista, exceção, classe da planilha, [mês, dia, hora], local, perfil]
function linha([cliente, sm, placa, motorista, excecao, classe, [mes, dia, hora], local, perfil = 'REGRA OURO - SEGURADORA X']) {
  const l = LOCAIS[local];
  return ['1.4', '41 CORRETORA DE SEGUROS', 'YELUM SEGUROS S.A', cliente, sm, serialExcel(2026, mes, 28), cliente, 'Frota',
    placa, placa === 'ABC1D23' ? 'MJI-7358' : '', motorista, cliente, 'SASCAR', perfil, '02071419 - OUTROS', excecao,
    serialExcel(2026, mes, dia, hora, 15), l.lat, l.lon, l.ref, classe];
}

// 26 eventos válidos (+1 duplicado) entre jul e set/2026.
export const EVENTOS_DE_EXEMPLO = [
  // João (Alfa, ABC1D23): velocidade em jul, ago e set -> reincidente 3 meses seguidos
  [ALFA, 5001, 'ABC1D23', 'JOÃO DA SILVA', 'VELOCIDADE EXCEDIDA FAIXA 1', 'Motorista', [7, 3, 8], 'cascavel'],
  [ALFA, 5001, 'ABC1D23', 'JOÃO DA SILVA', 'VELOCIDADE EXCEDIDA FAIXA 1', 'Motorista', [7, 3, 9], 'cascavel2'],
  [ALFA, 5002, 'ABC1D23', 'JOÃO DA SILVA', 'VELOCIDADE EXCEDIDA FAIXA 1', 'Motorista', [8, 5, 8], 'cascavel'],
  [ALFA, 5002, 'ABC1D23', 'JOÃO DA SILVA', 'PARADA NAO INFORMADA', 'Motorista', [8, 5, 10], 'cajamar'],
  [ALFA, 5002, 'ABC1D23', 'JOÃO DA SILVA', 'VELOCIDADE EXCEDIDA FAIXA 1', 'Motorista', [8, 6, 8], 'cascavel'],
  [ALFA, 5003, 'ABC1D23', 'JOÃO DA SILVA', 'VELOCIDADE EXCEDIDA FAIXA 1', 'Motorista', [9, 2, 8], 'cascavel'],
  [ALFA, 5003, 'ABC1D23', 'JOÃO DA SILVA', 'VELOCIDADE EXCEDIDA FAIXA 1', 'Motorista', [9, 2, 9], 'cascavel'],
  [ALFA, 5003, 'ABC1D23', 'JOÃO DA SILVA', 'FALTA O INICIO DE VIAGEM', 'Motorista', [9, 3, 7], 'cajamar'],
  [ALFA, 5003, 'ABC1D23', 'JOÃO DA SILVA', 'TEMPO DE PARADA EXCEDIDO', 'Sistema', [9, 4, 12], 'cajamar'],   // classe "Sistema"
  // ABC1D23 sem posição em jul e ago -> placa reincidente (exceções de veículo)
  [ALFA, 5001, 'ABC1D23', 'JOÃO DA SILVA', 'SEM POSICAO FORA DE AREA DE RISCO (COM SM)', 'Veiculo', [7, 4, 2], 'cascavel'],
  [ALFA, 5002, 'ABC1D23', 'JOÃO DA SILVA', 'SEM POSICAO FORA DE AREA DE RISCO (COM SM)', 'Veiculo', [8, 7, 2], 'cajamar'],
  // Maria (Alfa, grafia diferente do cliente, placa com hífen): jul e set, com buraco em ago -> não reincidente
  ['Transportes Alfa Ltda.', 5010, 'DEF-4567', 'MARIA SOUZA', 'PARADA NAO INFORMADA', 'Motorista', [7, 10, 14], 'cajamar'],
  [ALFA, 5011, 'DEF4567', 'MARIA SOUZA', 'VELOCIDADE EXCEDIDA FAIXA 2', 'Motorista', [9, 11, 14], 'cajamar'],
  [ALFA, 5011, 'DEF4567', 'MARIA SOUZA', 'VELOCIDADE EXCEDIDA FAIXA 2', 'Motorista', [9, 12, 14], 'cajamar'],
  [ALFA, 5011, 'DEF4567', 'MARIA SOUZA', 'EXCECAO NOVA DE TESTE', 'Veiculo', [9, 12, 15], 'cajamar'],   // fora do catálogo
  // Pedro (Beta, GHI7J89): ago e set -> reincidente 2 meses; pânico vem como "Veiculo" e o catálogo corrige
  [BETA, 6001, 'GHI7J89', 'PEDRO LIMA', 'BOTAO DE PANICO', 'Veiculo', [8, 20, 22], 'recife', 'REGRA PRATA - SEGURADORA Y'],
  [BETA, 6002, 'GHI7J89', 'PEDRO LIMA', 'FALTA O INICIO DE VIAGEM', 'Motorista', [9, 1, 6], 'recife', 'REGRA PRATA - SEGURADORA Y'],
  [BETA, 6001, 'GHI7J89', 'PEDRO LIMA', 'VIOLACAO PORTA BAU', 'Veiculo', [8, 21, 1], 'recife', 'REGRA PRATA - SEGURADORA Y'],
  [BETA, 6002, 'GHI7J89', 'PEDRO LIMA', 'VIOLACAO PORTA BAU', 'Veiculo', [9, 2, 1], 'recife', 'REGRA PRATA - SEGURADORA Y'],
  [BETA, 6002, 'GHI7J89', 'PEDRO LIMA', 'DESENGATE DA CARRETA 01', 'Veiculo', [9, 2, 3], 'recife', 'REGRA PRATA - SEGURADORA Y'],
  // Ana (Gama, JKL0M12): só em set; contexto suspeito; um evento sem coordenada; uma placa inválida
  [GAMA, 7001, 'JKL0M12', 'ANA COSTA', 'VELOCIDADE EXCEDIDA FAIXA 3', 'Motorista', [9, 15, 10], 'recife', '-'],
  [GAMA, 7001, 'JKL0M12', 'ANA COSTA', 'VELOCIDADE EXCEDIDA FAIXA 3', 'Motorista', [9, 16, 10], 'recife', '-'],
  [GAMA, 7001, 'JKL0M12', 'ANA COSTA', 'PERDAS DE SINAL EM ÁREA + VALOR DA CARGA', 'Contexto Suspeito', [9, 16, 23], 'recife', '-'],
  [GAMA, 7001, 'JKL0M12', 'ANA COSTA', 'ALERTAS DE PAINEL', 'Contexto Suspeito', [9, 17, 23], 'semCoord', '-'],
  [GAMA, 7002, 'XX123', 'ANA COSTA', 'SEM POSICAO EM AREA DE RISCO (COM SM)', 'Veiculo', [9, 18, 4], 'recife', '-'],
  [GAMA, 7002, 'JKL0M12', 'ANA COSTA', 'ISCA ESTÁ DISTANTE DO VEÍCULO', 'Motorista', [9, 19, 4], 'recife', '-'],   // catálogo: veículo
  // duplicado exato do evento de 02/09 09:15 do João
  [ALFA, 5003, 'ABC1D23', 'JOÃO DA SILVA', 'VELOCIDADE EXCEDIDA FAIXA 1', 'Motorista', [9, 2, 9], 'cascavel']
];

// Totais esperados do exemplo, conferidos à mão contra a lista acima.
export const ESPERADO = {
  eventos: 27, duplicados: 1, clientes: 3, motoristas: 4, placas: 5,
  classes: { MOTORISTA: 17, VEICULO: 8, CONTEXTO: 2 },
  porMes: { '2026-07': 4, '2026-08': 6, '2026-09': 17 },
  georreferenciados: 26, locais: 4, classeCorrigida: 3, naoCatalogadas: 1, placasForaDoPadrao: 1
};

export const linhasDeExemplo = () => [CABECALHO, ...EVENTOS_DE_EXEMPLO.map(linha), [], ...RODAPE];

// Gerador pseudoaleatório com semente fixa: mesma massa em toda execução.
function aleatorio(semente) {
  let s = semente >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

// n eventos com a cardinalidade do export real (34 clientes, ~2 mil motoristas e placas, 73 exceções, ~15 mil locais).
export function linhasEmMassa(n, excecoes) {
  const r = aleatorio(42), escolher = lista => lista[Math.floor(r() * lista.length)];
  const clientes = Array.from({ length: 34 }, (_, i) => `CLIENTE ${i} TRANSPORTES LTDA`);
  const motoristas = Array.from({ length: 2000 }, (_, i) => `MOTORISTA ${i}`);
  const letras = i => String.fromCharCode(65 + (i % 26), 65 + ((i / 26 | 0) % 26), 65 + ((i / 676 | 0) % 26));
  const placas = Array.from({ length: 2000 }, (_, i) => `${letras(i)}${i % 10}${String.fromCharCode(65 + i % 26)}${String(i % 100).padStart(2, '0')}`);
  const linhas = [CABECALHO];
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * 2000), [nome, classe] = escolher(excecoes), local = Math.floor(r() * 15000);
    const mes = 7 + Math.floor(r() * 3);
    linhas.push(['1.4', 'CORRETORA', 'SEGURADORA', clientes[k % 34], 9000000 + Math.floor(i / 20), serialExcel(2026, mes, 28),
      clientes[k % 34], 'Frota', placas[k], '', motoristas[k], clientes[k % 34], 'SASCAR', `PERFIL ${k % 101}`, 'PRODUTO',
      nome, serialExcel(2026, mes, 1 + Math.floor(r() * 28), Math.floor(r() * 24), Math.floor(r() * 60)),
      -30 + (local % 150) / 10, -55 + (local / 150 | 0) / 10, `${(r() * 5).toFixed(2).replace('.', ',')} km de LOCAL ${local} - CIDADE/UF`, classe]);
  }
  return [...linhas, [], ...RODAPE];
}

const escaparXml = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Mesmo formato do export do BI: prefixo "x:", strings inline, sem referência de célula, vazio = string vazia.
export function xlsxDoExport(linhas, nomeAba = 'Export') {
  const ns = 'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const celula = v => typeof v === 'number'
    ? `<x:c s="10"><x:v>${v}</x:v></x:c>`
    : `<x:c t="inlineStr"><x:is><x:t>${escaparXml(v ?? '')}</x:t></x:is></x:c>`;
  const xmlLinhas = linhas.map(l => l.length ? `<x:row>${l.map(celula).join('')}</x:row>` : '<x:row />').join('');
  return zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="/xl/workbook.xml" Id="R1"/></Relationships>'),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="utf-8"?><x:workbook ${ns}><x:sheets><x:sheet name="${escaparXml(nomeAba)}" sheetId="1" r:id="Rabc" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" /></x:sheets></x:workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet1.xml" Id="Rabc"/></Relationships>'),
    'xl/worksheets/sheet1.xml': strToU8(`<?xml version="1.0" encoding="utf-8"?><x:worksheet ${ns}><x:sheetData>${xmlLinhas}</x:sheetData></x:worksheet>`)
  });
}

// Como o Excel salva ao abrir e gravar o export: textos compartilhados e referência de célula (SheetJS).
// abasAntes: abas extras antes dos dados (o leitor deve pular as que não têm o cabeçalho).
export function xlsxDoExcel(linhas, abasAntes = []) {
  const livro = XLSX.utils.book_new();
  for (const [nome, conteudo] of abasAntes) XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(conteudo), nome);
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(linhas), 'Dados');
  return new Uint8Array(XLSX.write(livro, { type: 'array', bookType: 'xlsx', bookSST: true }));
}

// CSV como o Excel BR exporta: ";" , vírgula decimal, datas dd/mm/aaaa hh:mm.
export function csvDoExport(linhas) {
  const doisDigitos = n => String(n).padStart(2, '0');
  const dataBr = serial => {
    const d = new Date(Math.round((serial - 25569) * 864e5));
    return `${doisDigitos(d.getUTCDate())}/${doisDigitos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${doisDigitos(d.getUTCHours())}:${doisDigitos(d.getUTCMinutes())}`;
  };
  const colunaData = new Set([CABECALHO.indexOf('Data Excecao'), CABECALHO.indexOf('Data Fim Viagem')]);
  const valor = (v, i) => v == null ? '' : typeof v === 'number' ? (colunaData.has(i) ? dataBr(v) : String(v).replace('.', ',')) : String(v);
  const texto = linhas.map(l => l.map((v, i) => {
    const t = valor(v, i);
    return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  }).join(';')).join('\r\n');
  return new TextEncoder().encode('﻿' + texto);
}
