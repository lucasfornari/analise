// Conversão de células da planilha (datas e números no padrão brasileiro).

const dataValida = d => d instanceof Date && !isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100 ? d : null;

// Serial do Excel (dias desde 30/12/1899, fração = hora) para data no fuso local, arredondada ao segundo.
// A conta é feita em UTC e os campos são copiados para o horário local, para 08:15 continuar 08:15.
export function dataDoSerialExcel(serial) {
  const utc = new Date(Math.round((serial - 25569) * 86400) * 1000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), utc.getUTCHours(), utc.getUTCMinutes(), utc.getUTCSeconds());
}

// Aceita Date, serial do Excel, "dd/mm/aaaa [hh:mm[:ss]]" e ISO.
export function converterData(valor) {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date) return dataValida(valor);
  if (typeof valor === 'number') return isFinite(valor) ? dataValida(dataDoSerialExcel(valor)) : null;
  const texto = String(valor).trim();

  // dd/mm/aaaa: nunca interpreta como mm/dd (padrão americano)
  let m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    if (+m[2] > 12) return null;
    const ano = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return dataValida(new Date(ano, m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
  }

  m = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return dataValida(new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));

  // CSV com serial como texto ("46235,589")
  const serial = converterNumero(texto);
  return serial != null && serial > 30000 && serial < 80000 ? dataValida(dataDoSerialExcel(serial)) : null;
}

// Aceita número, "1.234,56", "-22,9" e "-22.9".
export function converterNumero(valor) {
  if (valor == null || valor === '') return null;
  if (typeof valor === 'number') return isFinite(valor) ? valor : null;
  let texto = String(valor).trim().replace(/\s/g, '');
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(texto)) texto = texto.replace(/\./g, '');   // separador de milhar
  texto = texto.replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(texto) ? parseFloat(texto) : null;
}
