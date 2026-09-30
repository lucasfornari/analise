// Agregações exibidas no painel, calculadas numa única passada sobre o conjunto já filtrado.
import { CLASSE } from './catalogoExcecoes.js';

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
const maisFrequente = mapa => { let melhor = '', n = -1; for (const [k, v] of mapa) if (v > n) { melhor = k; n = v; } return [melhor, Math.max(n, 0)]; };
const porTotalDepois = campo => (a, b) => b.total - a.total || String(a[campo]).localeCompare(String(b[campo]));
const porClasseZerada = () => ({ MOTORISTA: 0, VEICULO: 0, CONTEXTO: 0 });

// '2026-01' -> '2025-12'
export function mesAnterior(mes) {
  const [ano, m] = mes.split('-').map(Number);
  return m === 1 ? `${ano - 1}-12` : `${ano}-${String(m - 1).padStart(2, '0')}`;
}

// Último mês dos dados contra o mês de calendário anterior (null se não houver o anterior).
export function variacaoMensal(porMes, meses) {
  const atualMes = meses[meses.length - 1];
  if (!atualMes || !meses.includes(mesAnterior(atualMes))) return null;
  const atual = porMes[atualMes] || 0, anterior = porMes[mesAnterior(atualMes)] || 0;
  return { atual, anterior, diferenca: atual - anterior, pct: anterior ? (atual - anterior) / anterior : null };
}

// Maior sequência de meses de calendário seguidos com eventos.
function maiorSequencia(porMes, meses) {
  let maior = 0, atual = 0, anterior = null;
  for (const mes of meses) {
    if (!porMes[mes]) { atual = 0; anterior = mes; continue; }
    atual = anterior !== null && anterior === mesAnterior(mes) && porMes[anterior] ? atual + 1 : 1;
    maior = Math.max(maior, atual);
    anterior = mes;
  }
  return maior;
}

// Reincidente: entidade (motorista ou placa) com eventos em meses seguidos.
// porMes: quantas entidades tiveram evento no mês e quantas delas também no mês anterior.
export function reincidencia(entidades, meses) {
  const porMes = meses.map(mes => {
    const anterior = mesAnterior(mes), comparavel = meses.includes(anterior);
    let ativos = 0, reincidentes = 0;
    for (const e of entidades) {
      if (!e.m[mes]) continue;
      ativos++;
      if (comparavel && e.m[anterior]) reincidentes++;
    }
    return { mes, ativos, reincidentes: comparavel ? reincidentes : null, pct: comparavel && ativos ? reincidentes / ativos : null };
  });
  const lista = [];
  let maximoMensal = 0;   // maior contagem de um mês, para a escala de cor da tabela (laço: spread estoura a pilha com volume)
  for (const e of entidades) {
    const sequencia = maiorSequencia(e.m, meses);
    if (sequencia < 2) continue;
    lista.push({ ...e, sequencia, mesesAtivos: meses.filter(m => e.m[m]).length, variacao: variacaoMensal(e.m, meses) });
    for (const m of meses) if ((e.m[m] || 0) > maximoMensal) maximoMensal = e.m[m];
  }
  lista.sort((a, b) => b.sequencia - a.sequencia || b.total - a.total);
  return { porMes, lista, maximoMensal };
}

export function agregar(registros) {
  const n = registros.length;
  const porClasse = porClasseZerada();
  const grupos = new Map(), excecoes = new Map(), porMes = new Map();
  const clientes = new Map(), locais = new Map(), placas = new Map(), motoristas = new Map(), perfis = new Map();
  let geo = 0;

  for (const r of registros) {
    porClasse[r.classe]++;
    incrementar(grupos, r.grupo);

    let e = excecoes.get(r.excecao);
    if (!e) excecoes.set(r.excecao, e = { excecao: r.excecao, classe: r.classe, grupo: r.grupo, total: 0 });
    e.total++;

    if (r.mes) {
      let pm = porMes.get(r.mes);
      if (!pm) porMes.set(r.mes, pm = { mes: r.mes, ...porClasseZerada(), total: 0 });
      pm[r.classe]++; pm.total++;
    }

    let c = clientes.get(r.cliente);
    if (!c) clientes.set(r.cliente, c = { cliente: r.cliente, total: 0, ...porClasseZerada(), m: {} });
    c.total++; c[r.classe]++;
    if (r.mes) c.m[r.mes] = (c.m[r.mes] || 0) + 1;

    let l = locais.get(r.local);
    if (!l) locais.set(r.local, l = { local: r.local, total: 0, grupos: new Map(), cli: new Map(), placas: new Set(), somaLat: 0, somaLon: 0, nc: 0, eventos: [] });
    l.total++; incrementar(l.grupos, r.grupo); incrementar(l.cli, r.cliente); l.eventos.push(r);
    if (r.placa) l.placas.add(r.placa);
    if (r.lat != null) { l.somaLat += r.lat; l.somaLon += r.lon; l.nc++; geo++; }

    // placas: equipamento e contexto; motoristas: exceções de motorista
    if (r.classe !== CLASSE.MOTORISTA && r.placa) {
      let p = placas.get(r.placa);
      if (!p) placas.set(r.placa, p = { placa: r.placa, clis: new Map(), total: 0, grupos: new Map(), viagens: new Set(), tec: new Map(), m: {} });
      p.total++; incrementar(p.grupos, r.grupo); incrementar(p.clis, r.cliente); incrementar(p.tec, r.tecnologia);
      if (r.viagem) p.viagens.add(r.viagem);
      if (r.mes) p.m[r.mes] = (p.m[r.mes] || 0) + 1;
    }
    if (r.classe === CLASSE.MOTORISTA && r.motorista) {
      let mo = motoristas.get(r.motorista);
      if (!mo) motoristas.set(r.motorista, mo = { motorista: r.motorista, clis: new Map(), total: 0, grupos: new Map(), locais: new Map(), placas: new Set(), m: {} });
      mo.total++; incrementar(mo.grupos, r.grupo); incrementar(mo.clis, r.cliente); incrementar(mo.locais, r.local);
      if (r.placa) mo.placas.add(r.placa);
      if (r.mes) mo.m[r.mes] = (mo.m[r.mes] || 0) + 1;
    }

    let pf = perfis.get(r.perfil);
    if (!pf) perfis.set(r.perfil, pf = { perfil: r.perfil, total: 0, ...porClasseZerada(), clis: new Map() });
    pf.total++; pf[r.classe]++; incrementar(pf.clis, r.cliente);
  }

  const meses = [...porMes.keys()].sort();
  const mesClasse = meses.map(m => porMes.get(m));
  const totalDoMes = Object.fromEntries(mesClasse.map(m => [m.mes, m.total]));

  // Ranking com participação, % acumulado (Pareto), participação em cada mês e variação mensal.
  const listaClientes = [...clientes.values()].sort(porTotalDepois('cliente'));
  let acumulado = 0;
  listaClientes.forEach((c, i) => {
    acumulado += c.total;
    Object.assign(c, {
      rank: i + 1, pct: n ? c.total / n : 0, acum: n ? acumulado / n : 0,
      pctMes: Object.fromEntries(meses.map(m => [m, totalDoMes[m] ? (c.m[m] || 0) / totalDoMes[m] : 0])),
      variacao: variacaoMensal(c.m, meses)
    });
  });

  const listaPlacas = [...placas.values()].map(p => Object.assign(p, {
    cliente: maisFrequente(p.clis)[0], tecnologia: maisFrequente(p.tec)[0],
    nViagens: p.viagens.size, porViagem: p.total / Math.max(p.viagens.size, 1)
  })).sort(porTotalDepois('placa'));

  const listaMotoristas = [...motoristas.values()].map(mo => {
    const [topLocal, topLocalN] = maisFrequente(mo.locais);
    return Object.assign(mo, { cliente: maisFrequente(mo.clis)[0], topLocal, topLocalN, nPlacas: mo.placas.size });
  }).sort(porTotalDepois('motorista'));

  return {
    n, ...porClasse, geo,
    nClientes: clientes.size,
    variacao: variacaoMensal(totalDoMes, meses),
    grupos, excecoes: [...excecoes.values()].sort(porTotalDepois('excecao')),
    meses, mesClasse,
    clientes: listaClientes,
    locais: [...locais.values()].map(l => Object.assign(l, {
      nCli: l.cli.size, nPl: l.placas.size, lat: l.nc ? l.somaLat / l.nc : null, lon: l.nc ? l.somaLon / l.nc : null
    })).sort(porTotalDepois('local')),
    placas: listaPlacas,
    motoristas: listaMotoristas,
    perfis: [...perfis.values()].map(pf => Object.assign(pf, { cliente: maisFrequente(pf.clis)[0], nCli: pf.clis.size }))
      .sort(porTotalDepois('perfil')),
    reincidencia: { motoristas: reincidencia(listaMotoristas, meses), placas: reincidencia(listaPlacas, meses) }
  };
}
