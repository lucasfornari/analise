// Top N locais com mais alertas, com dados para criar alvos (cerca) ou estudar a redução.
import { principaisExcecoes, distanciaMetros, percentil } from '../apoio.js';

const SEM_REFERENCIA = '(sem referência)';

// Centro (média das coordenadas dos eventos) e raio que cobre a fração `p` dos eventos, em metros.
export function centroERaio(eventos, p) {
  let lat = 0, lon = 0, n = 0;
  for (const r of eventos) if (r.lat != null) { lat += r.lat; lon += r.lon; n++; }
  if (!n) return { centro: null, raio: null, comCoordenada: 0 };
  const centro = { lat: lat / n, lon: lon / n };
  const distancias = [];
  for (const r of eventos) if (r.lat != null) distancias.push(distanciaMetros(centro.lat, centro.lon, r.lat, r.lon));
  return { centro, raio: Math.round(percentil(distancias, p)), comCoordenada: n };
}

export const locais = {
  id: 'locais',
  titulo: 'Locais com mais alertas',
  regra: 'Locais agrupados pelo nome da referência, sem a distância ("3,7 km de POSTO X" e "9,9 km de POSTO X" são o mesmo local); eventos sem referência ficam de fora. Centro = média das coordenadas dos eventos; raio = distância que cobre 90% deles (base para criar um alvo).',
  calcular({ agregado, opcoes }) {
    const candidatos = agregado.locais.filter(l => l.local !== SEM_REFERENCIA);
    const itens = candidatos.slice(0, opcoes.topN).map((l, i) => ({
      posicao: i + 1, nome: l.local, total: l.total, pct: agregado.n ? l.total / agregado.n : 0, placas: l.nPl, clientes: l.nCli,
      ...centroERaio(l.eventos, opcoes.percentilRaio),
      excecoes: principaisExcecoes(l.porExcecao, agregado.classeDaExcecao, opcoes.excecoesPorItem)
    }));
    return { itens, totalDeLocais: candidatos.length, cobertura: agregado.n ? itens.reduce((s, x) => s + x.total, 0) / agregado.n : 0 };
  }
};
