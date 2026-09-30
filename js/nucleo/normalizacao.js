// Transforma as linhas cruas da planilha em registros de evento prontos para filtrar e agregar.
import { normalizarChave, limparTexto, chavePlaca } from './texto.js';
import { converterData, converterNumero } from './conversores.js';
import { localizarCabecalho, mapearColunas, COLUNAS_OBRIGATORIAS } from './colunas.js';
import { classificar, tipoDoEvento, composicaoCS, localDaReferencia } from './classificacao.js';

const doisDigitos = n => String(n).padStart(2, '0');
const linhaVazia = linha => !linha || linha.every(v => v == null || String(v).trim() === '');
const semPerfil = valor => /^[-–—\s]*$/.test(limparTexto(valor));

// Grafias diferentes do mesmo nome ("Alfa Ltda" / "ALFA LTDA.") viram um só rótulo: o primeiro visto.
class Rotulos {
  #porCampo = new Map();

  rotulo(campo, bruto) {
    if (!this.#porCampo.has(campo)) this.#porCampo.set(campo, new Map());
    const vistos = this.#porCampo.get(campo);
    let chave = normalizarChave(bruto);
    if (campo === 'cliente') chave = chave.replace(/[.\s]+$/, '');   // ignora ponto final de "LTDA."
    if (!vistos.has(chave)) vistos.set(chave, limparTexto(bruto));
    return vistos.get(chave);
  }
}

function coordenadas(lat, lon) {
  const valida = lat != null && lon != null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
  return valida ? { lat, lon } : { lat: null, lon: null };
}

// linhas: matriz de células (header: 1 do SheetJS). ssf: XLSX.SSF para datas seriais.
// Retorna { registros, estatisticas, colunas } ou lança erro com mensagem para o usuário.
export function normalizarPlanilha(linhas, ssf) {
  const iCabecalho = localizarCabecalho(linhas);
  if (iCabecalho < 0) throw new Error('Não encontrei o cabeçalho com as colunas "Cliente" e "Exceções". Confira se é o export do BI de exceções.');
  const colunas = mapearColunas(linhas[iCabecalho]);
  const faltando = COLUNAS_OBRIGATORIAS.filter(c => colunas[c] < 0);
  if (faltando.length) throw new Error('Colunas obrigatórias ausentes: ' + faltando.join(', ') + '.');

  const celula = (linha, campo) => colunas[campo] >= 0 ? linha[colunas[campo]] : null;
  const rotulos = new Rotulos();
  const registros = [], chavesVistas = new Set();
  const estatisticas = { lidas: 0, vazias: 0, descartadas: 0, semData: 0, semCoord: 0, duplicadas: 0, classeDeduzida: 0 };

  for (const linha of linhas.slice(iCabecalho + 1)) {
    if (linhaVazia(linha)) { estatisticas.vazias++; continue; }
    estatisticas.lidas++;

    // sem cliente ou exceção: rodapé de filtros do BI ou linha quebrada
    const clienteBruto = celula(linha, 'cliente'), excecaoBruta = celula(linha, 'excecao');
    if (!limparTexto(clienteBruto) || !limparTexto(excecaoBruta)) { estatisticas.descartadas++; continue; }

    const data = converterData(celula(linha, 'data'), ssf);
    if (!data) estatisticas.semData++;
    const { lat, lon } = coordenadas(converterNumero(celula(linha, 'lat')), converterNumero(celula(linha, 'lon')));
    if (lat == null) estatisticas.semCoord++;
    if (!limparTexto(celula(linha, 'classe'))) estatisticas.classeDeduzida++;

    const classe = classificar(celula(linha, 'classe'), excecaoBruta);
    const mes = data ? `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}` : null;
    const registro = {
      cliente: rotulos.rotulo('cliente', clienteBruto),
      excecao: rotulos.rotulo('excecao', excecaoBruta),
      classe,
      tipo: tipoDoEvento(classe, excecaoBruta),
      csTipo: classe === 'CS' ? composicaoCS(excecaoBruta) : null,
      data, mes,
      dia: data ? `${mes}-${doisDigitos(data.getDate())}` : null,
      placa: chavePlaca(celula(linha, 'placa')),
      carreta: chavePlaca(celula(linha, 'carreta')),
      motorista: rotulos.rotulo('motorista', celula(linha, 'motorista')),
      perfil: semPerfil(celula(linha, 'perfil')) ? '(sem perfil)' : rotulos.rotulo('perfil', celula(linha, 'perfil')),
      filial: limparTexto(celula(linha, 'filial')),
      viagem: limparTexto(celula(linha, 'viagem')).replace(/\.0+$/, ''),   // "123.0" quando o Excel trata como número
      tecnologia: limparTexto(celula(linha, 'tecnologia')).toUpperCase(),
      lat, lon,
      referencia: limparTexto(celula(linha, 'referencia')),
      local: rotulos.rotulo('local', localDaReferencia(celula(linha, 'referencia')))
    };

    // duplicado exato: mesma viagem, exceção, data e placa
    registro.dupKey = [registro.viagem, normalizarChave(excecaoBruta), data ? data.getTime() : '', registro.placa].join('|');
    registro.dup = chavesVistas.has(registro.dupKey);
    if (registro.dup) estatisticas.duplicadas++; else chavesVistas.add(registro.dupKey);
    registros.push(registro);
  }
  estatisticas.validas = registros.length;
  return { registros, estatisticas, colunas };
}
