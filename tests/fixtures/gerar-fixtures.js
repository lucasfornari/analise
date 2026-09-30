// Gera as planilhas de teste (CSV e XLSX) com dados sintéticos no formato do export do BI.
// Uso: node tests/fixtures/gerar-fixtures.js
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const pasta = dirname(fileURLToPath(import.meta.url));

const CABECALHO = ['Cliente', 'Cód. Viagem', 'Filial', 'Placa', 'Carreta', 'Motorista', 'Tecnologia', 'Perfil',
  'Exceções', 'Data Exceção', 'Latitude', 'Longitude', 'Referência', 'Classe'];

const CLIENTES = ['Transportes Alfa Ltda', 'Beta Logística S/A', 'Gama Cargas', 'Delta Express'];
const PERFIS = ['Perfil Ouro - Seguradora X', 'Perfil Prata - Seguradora Y', '-'];
const LOCAIS = [
  { ref: '2,5 km de Campinas - SP', lat: -22.9, lon: -47.06 },
  { ref: '10 km de Curitiba - PR', lat: -25.43, lon: -49.27 },
  { ref: 'Recife - PE', lat: -8.05, lon: -34.9 }
];
const EVENTOS = [
  { exc: 'Violação de baú', classe: 'Veículo' },
  { exc: 'Desengate de carreta', classe: 'Veículo' },
  { exc: 'Antena violada', classe: 'Veículo' },
  { exc: 'Final de viagem não informado', classe: 'Motorista' },
  { exc: 'Final de viagem fora do raio', classe: 'Motorista' },
  { exc: 'Alerta de painel + perda de sinal', classe: 'Contexto suspeito' },
  { exc: 'Alerta desengate + valor da SM', classe: '' }            // classe ausente: deduzida como CS
];

// 36 eventos determinísticos entre jan e mar/2026
function gerarLinhas() {
  const linhas = [];
  for (let i = 0; i < 36; i++) {
    const ev = EVENTOS[i % EVENTOS.length], loc = LOCAIS[i % LOCAIS.length];
    const semCoord = i % 9 === 0;
    linhas.push({
      cliente: CLIENTES[i % CLIENTES.length], viagem: 5000 + i, filial: 'Matriz',
      placa: ['BRY-2E52', 'ABC1D23', 'XYZ-9K88'][i % 3], carreta: i % 2 ? 'CAR1A11' : '',
      motorista: ['João da Silva', 'Maria Souza'][i % 2], tecnologia: i % 2 ? 'omnilink' : 'sascar',
      perfil: PERFIS[i % PERFIS.length], exc: ev.exc, classe: ev.classe,
      data: new Date(2026, i % 3, 1 + (i % 27), 8 + (i % 10), 15),
      lat: semCoord ? null : loc.lat, lon: semCoord ? null : loc.lon, ref: loc.ref
    });
  }
  linhas.push({ ...linhas[0], cliente: 'TRANSPORTES ALFA LTDA.' });   // duplicado exato, com grafia diferente do cliente
  return linhas;
}

const pad = n => String(n).padStart(2, '0');
const dataBr = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const numBr = v => v == null ? '' : String(v).replace('.', ',');
const valores = (l, csv) => [l.cliente, l.viagem, l.filial, l.placa, l.carreta, l.motorista, l.tecnologia, l.perfil,
  l.exc, csv ? dataBr(l.data) : l.data, csv ? numBr(l.lat) : l.lat, csv ? numBr(l.lon) : l.lon, l.ref, l.classe];

const linhas = gerarLinhas();
const titulo = [['Relatório de exceções'], []];
const rodape = [[], ['', 'Filtros aplicados: período 01/01/2026 a 31/03/2026']];   // sem cliente: deve ser descartado

const csv = [...titulo, CABECALHO, ...linhas.map(l => valores(l, true)), ...rodape]
  .map(r => r.map(v => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(';')).join('\r\n');
writeFileSync(join(pasta, 'excecoes.csv'), '﻿' + csv);

const aba = XLSX.utils.aoa_to_sheet([...titulo, CABECALHO, ...linhas.map(l => valores(l, false)), ...rodape], { cellDates: true });
const livro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet([['capa']]), 'Capa');   // 1ª aba sem cabeçalho: o leitor deve pular
XLSX.utils.book_append_sheet(livro, aba, 'Dados');
XLSX.writeFile(livro, join(pasta, 'excecoes.xlsx'));

writeFileSync(join(pasta, 'invalida.csv'), 'coluna A;coluna B\r\n1;2\r\n');
console.log(`Fixtures geradas: ${linhas.length} eventos`);
