// Agregações exibidas no painel, calculadas sobre o conjunto já filtrado.

export function contarPor(itens, chaveDe) {
  const contagem = new Map();
  for (const item of itens) {
    const chave = chaveDe(item);
    if (chave == null || chave === '') continue;
    contagem.set(chave, (contagem.get(chave) || 0) + 1);
  }
  return contagem;
}

const incrementar = (mapa, chave) => mapa.set(chave, (mapa.get(chave) || 0) + 1);
const maisFrequente = mapa => [...mapa.entries()].sort((a, b) => b[1] - a[1])[0];
const porTotalDepois = campo => (a, b) => b.total - a.total || a[campo].localeCompare(b[campo]);

// Agrupa registros por chave, criando o acumulador na primeira ocorrência.
function agrupar(registros, chaveDe, novo, somar) {
  const grupos = new Map();
  for (const r of registros) {
    const chave = chaveDe(r);
    if (chave == null) continue;
    let g = grupos.get(chave);
    if (!g) grupos.set(chave, g = novo(chave));
    somar(g, r);
  }
  return [...grupos.values()];
}

// Ranking com participação e % acumulado (Pareto).
function porCliente(registros, total) {
  const clientes = agrupar(registros, r => r.cliente,
    cliente => ({ cliente, total: 0, EQ: 0, FV: 0, CS: 0, m: {} }),
    (g, r) => { g.total++; g[r.classe]++; if (r.mes) g.m[r.mes] = (g.m[r.mes] || 0) + 1; }
  ).sort(porTotalDepois('cliente'));
  let acumulado = 0;
  clientes.forEach((c, i) => {
    acumulado += c.total;
    Object.assign(c, { rank: i + 1, pct: total ? c.total / total : 0, acum: total ? acumulado / total : 0 });
  });
  return clientes;
}

function porMesEClasse(registros, meses) {
  const linhas = meses.map(mes => ({ mes, EQ: 0, FV: 0, CS: 0, total: 0 }));
  const indice = new Map(meses.map((m, i) => [m, i]));
  for (const r of registros) {
    if (!r.mes) continue;
    const linha = linhas[indice.get(r.mes)];
    linha[r.classe]++; linha.total++;
  }
  return linhas;
}

// Local com coordenada média dos eventos georreferenciados.
function porLocal(registros) {
  return agrupar(registros, r => r.local,
    local => ({ local, total: 0, tipos: new Map(), cli: new Map(), placas: new Set(), somaLat: 0, somaLon: 0, nc: 0 }),
    (g, r) => {
      g.total++; incrementar(g.tipos, r.tipo); incrementar(g.cli, r.cliente);
      if (r.placa) g.placas.add(r.placa);
      if (r.lat != null) { g.somaLat += r.lat; g.somaLon += r.lon; g.nc++; }
    }
  ).map(g => Object.assign(g, {
    nCli: g.cli.size, nPl: g.placas.size,
    lat: g.nc ? g.somaLat / g.nc : null, lon: g.nc ? g.somaLon / g.nc : null
  })).sort(porTotalDepois('local'));
}

// Placas para gestão de qualidade: fim de viagem é problema do motorista, não do equipamento.
function porPlaca(registros) {
  return agrupar(registros, r => r.classe === 'FV' || !r.placa ? null : r.placa,
    placa => ({ placa, clis: new Map(), total: 0, tipos: new Map(), viagens: new Set(), tec: new Map() }),
    (g, r) => {
      g.total++; incrementar(g.tipos, r.tipo); incrementar(g.clis, r.cliente); incrementar(g.tec, r.tecnologia);
      if (r.viagem) g.viagens.add(r.viagem);
    }
  ).map(g => Object.assign(g, {
    cliente: maisFrequente(g.clis)?.[0] ?? '', tecnologia: maisFrequente(g.tec)?.[0] ?? '',
    nViagens: g.viagens.size, porViagem: g.total / Math.max(g.viagens.size, 1)
  })).sort(porTotalDepois('placa'));
}

function porMotorista(registros) {
  return agrupar(registros, r => r.classe !== 'FV' || !r.motorista ? null : r.motorista,
    motorista => ({ motorista, clis: new Map(), total: 0, tipos: new Map(), locais: new Map() }),
    (g, r) => { g.total++; incrementar(g.tipos, r.tipo); incrementar(g.clis, r.cliente); incrementar(g.locais, r.local); }
  ).map(g => {
    const [topLocal = '', topLocalN = 0] = maisFrequente(g.locais) || [];
    return Object.assign(g, { cliente: maisFrequente(g.clis)?.[0] ?? '', topLocal, topLocalN });
  }).sort(porTotalDepois('motorista'));
}

function porPerfil(registros) {
  return agrupar(registros, r => r.perfil,
    perfil => ({ perfil, total: 0, EQ: 0, FV: 0, CS: 0, clis: new Map() }),
    (g, r) => { g.total++; g[r.classe]++; incrementar(g.clis, r.cliente); }
  ).map(g => Object.assign(g, { cliente: maisFrequente(g.clis)?.[0] ?? '', nCli: g.clis.size }))
    .sort(porTotalDepois('perfil'));
}

export function agregar(registros) {
  const n = registros.length;
  const porClasse = contarPor(registros, r => r.classe);
  const meses = [...new Set(registros.map(r => r.mes).filter(Boolean))].sort();
  const clientes = porCliente(registros, n);
  const placas = porPlaca(registros);
  const top3 = clientes.slice(0, 3).reduce((soma, c) => soma + c.total, 0);
  return {
    n, EQ: porClasse.get('EQ') || 0, FV: porClasse.get('FV') || 0, CS: porClasse.get('CS') || 0,
    nClientes: clientes.length, top3pct: n ? top3 / n : 0,
    nPlacasEq: placas.length, geo: registros.filter(r => r.lat != null).length,
    tipos: contarPor(registros, r => r.tipo),
    csTipos: contarPor(registros.filter(r => r.classe === 'CS'), r => r.csTipo),
    meses, mesClasse: porMesEClasse(registros, meses),
    clientes, locais: porLocal(registros), placas, motoristas: porMotorista(registros), perfis: porPerfil(registros)
  };
}
