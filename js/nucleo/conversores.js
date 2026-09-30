// Conversão de células da planilha (datas e números no padrão brasileiro).

const dataValida = d => d instanceof Date && !isNaN(d) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100 ? d : null;

// Aceita Date, serial do Excel, "dd/mm/aaaa [hh:mm[:ss]]" e ISO.
// ssf (SheetJS) converte o serial respeitando o calendário do Excel; sem ele, usa a conta aproximada.
export function converterData(valor, ssf) {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date) return dataValida(valor);
  if (typeof valor === 'number') {
    const d = ssf?.parse_date_code(valor);
    if (d) return dataValida(new Date(d.y, d.m - 1, d.d, d.H, d.M, Math.floor(d.S)));
    return dataValida(new Date(Math.round((valor - 25569) * 864e5)));
  }
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
  return null;
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
