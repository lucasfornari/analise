import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO, CLASSES, CLASSE, CLASSE_DO_GRUPO, ROTULO_CLASSE, ROTULO_GRUPO, buscarExcecao, classificarExcecao, classeInformada }
  from '../../js/nucleo/catalogoExcecoes.js';
import { normalizarChave } from '../../js/nucleo/texto.js';

// Exceções e classes como vieram no export real do BI (ago–set/2026, 150 mil linhas).
// Divergências esperadas com o catálogo estão em CORRECOES.
const DO_EXPORT = {
  Motorista: ['BOTAO DE PANICO', 'CONTINUA RODANDO FORA DO HORARIO PERMITIDO', 'ENTREGAS PENDENTES (FIM INFORMADO FALTANDO PASSAR EM ALGUM CLIENTE)',
    'EVENTOS DE VELOCIDADE EXCEDIDA', 'FALTA O INICIO DE VIAGEM', 'FINAL DE VIAGEM INFORMADA FORA DO RAIO DE DESTINO', 'FINAL DE VIAGEM NAO INFORMADA',
    'FINAL DE VIAGEM NAO INFORMADA COM ENTREGA PENDENTE', 'ISCA ESTÁ DISTANTE DO VEÍCULO', 'PARADA LOCAL DE COLETA/ENTREGA',
    'PARADA LOCAL PERMITIDO NAO INFORMADA', 'PARADA NAO INFORMADA', 'PARADA PROIBIDA INFORMADA', 'PARADA PROIBIDA INFORMADA EM AREA DE RISCO',
    'PARADA PROIBIDA NAO INFORMADA', 'PARADA PROIBIDA NAO INFORMADA EM AREA DE RISCO', 'PARADA PROIBIDA RAIO DE DESTINO', 'PARADA PROIBIDA RAIO DE ORIGEM',
    'PERMANECE COM ENTREGAS PENDENTES', 'PERMANECE COM FINAL DE VIAGEM INFORMADA FORA DO RAIO DE DESTINO',
    'PERMANECE FALTANDO MACRO DE FINAL DE VIAGEM E COM ENTREGA PENDENTE', 'PERMANECE FINAL DE VIAGEM NAO INFORMADA', 'REINICIO DE VIAGEM NAO INFORMADO',
    'RODANDO FORA DO HORARIO PERMITIDO', 'S.O.S', 'TEMPO DE DESCARGA INSUFICIENTE', 'TEMPO DE NÃO ABERTURA DA PORTA DO MOTORISTA',
    'VEICULO CONTINUA FORA DE ROTA', 'VEICULO CONTINUA VOLTANDO NA ROTA', 'VEICULO FORA DE ROTA', 'VEICULO VOLTANDO NA ROTA',
    'VELOCIDADE EXCEDIDA FAIXA 1', 'VELOCIDADE EXCEDIDA FAIXA 2', 'VELOCIDADE EXCEDIDA FAIXA 3', 'VIAGEM COM ROTA INCORRETA', 'VIAGEM CONTINUA COM ROTA INCORRETA'],
  Veiculo: ['ALARMANDO DIRETO', 'BLOQUEADO MOVIMENTANDO', 'BOTAO DE PANICO', 'DESENGATE DA CARRETA 01', 'INTERFERENCIA DE JAMMER',
    'ISCA ESTÁ DISTANTE DO VEÍCULO', 'ISCA SEM POSIÇÃO', 'LOCALIZADOR LONGE DE VEICULO - BLOQUEADO', 'LOCALIZADOR SEM POSICAO',
    'SEM POSICAO EM AREA DE RISCO (COM SM)', 'SEM POSICAO EM AREA DE RISCO (SEM SM)', 'SEM POSICAO FORA DE AREA DE RISCO (COM SM)',
    'SEM POSICAO FORA DE AREA DE RISCO (SEM SM)', 'VEÍCULO ONIXSAT SEM INTELIGÊNCIA EMBARCADA', 'VIOLACAO DE ANTENA', 'VIOLACAO DE BATERIA',
    'VIOLACAO DE PAINEL', 'VIOLACAO PORTA BAU'],
  'Contexto Suspeito': ['ALERTAS DE ANTENA + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)',
    'ALERTAS DE DESENGATE + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)', 'ALERTAS DE DESENGATE + VALOR DA SM SUPERIOR AO CONFIGURADO NO PERFIL',
    'ALERTAS DE JAMMER + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)', 'ALERTAS DE PAINEL + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)',
    'ALERTAS DE PAINEL', 'ALERTAS DE PANICO + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)', 'ALERTAS DE PANICO',
    'ALERTAS DE PARADA PROIBIDA + PERDA DE SINAL (PERDA DE SINAL SUPERIOR A 30 MINUTOS)', 'ALERTAS DE PARADA PROIBIDA + VIOLACOES (ANTENA)',
    'ALERTAS DE PARADA PROIBIDA + VIOLACOES (DESENGATE)', 'ALERTAS DE PARADA PROIBIDA + VIOLACOES (JAMMER)', 'ALERTAS DE PARADA PROIBIDA + VIOLACOES (PAINEL)',
    'ALERTAS DE PARADA PROIBIDA + VIOLACOES (PANICO)', 'BATERIA VIOLADA + PERDA DE SINAL (10 MIN)', 'PARADA PROIBIDA + BAÚ',
    'PARADA PROIBIDA EM ÁREA DE RISCO + BAÚ', 'PERDAS DE SINAL EM ÁREA + VALOR DA CARGA', 'VEÍCULO SASCAR COM PERDA DE SINAL + PRIMEIRAS VIAGENS'],
  Sistema: ['TEMPO DE PARADA EM MACRO EXCEDIDO', 'TEMPO DE PARADA EXCEDIDO']
};
// [exceção, classe na planilha] em que o catálogo decide diferente, de propósito
const CORRECOES = new Set(['BOTAO DE PANICO|Veiculo', 'ISCA ESTÁ DISTANTE DO VEÍCULO|Motorista',
  'TEMPO DE PARADA EM MACRO EXCEDIDO|Sistema', 'TEMPO DE PARADA EXCEDIDO|Sistema']);

test('catálogo cobre todas as exceções do export e só diverge da planilha nas correções previstas', () => {
  const nomes = new Set(Object.values(DO_EXPORT).flat());
  assert.equal(nomes.size, 73);
  assert.equal(CATALOGO.length, 73);
  for (const [classeDaPlanilha, excecoes] of Object.entries(DO_EXPORT)) {
    for (const nome of excecoes) {
      const definicao = buscarExcecao(nome);
      assert.ok(definicao, `fora do catálogo: ${nome}`);
      const diverge = classeInformada(classeDaPlanilha) !== definicao.classe;
      assert.equal(diverge, CORRECOES.has(`${nome}|${classeDaPlanilha}`), `${nome} (${classeDaPlanilha} -> ${definicao.classe})`);
    }
  }
});

test('catálogo é fixo e consistente', () => {
  assert.ok(Object.isFrozen(CATALOGO) && Object.isFrozen(CLASSE) && Object.isFrozen(CLASSES) && Object.isFrozen(ROTULO_GRUPO));
  assert.ok(CATALOGO.every(Object.isFrozen));
  assert.throws(() => { CATALOGO[0].classe = 'OUTRA'; }, TypeError);
  const chaves = CATALOGO.map(d => normalizarChave(d.nome));
  assert.equal(new Set(chaves).size, chaves.length, 'nomes duplicados');
  for (const d of CATALOGO) {
    assert.ok(CLASSES.includes(d.classe), d.nome);
    assert.equal(CLASSE_DO_GRUPO[d.grupo], d.classe, `${d.nome}: grupo ${d.grupo} é de outra classe`);
    assert.ok(ROTULO_GRUPO[d.grupo] && ROTULO_CLASSE[d.classe]);
  }
  // todo grupo (exceto "não catalogada") tem ao menos uma exceção
  const usados = new Set(CATALOGO.map(d => d.grupo));
  for (const grupo of Object.keys(ROTULO_GRUPO)) if (grupo !== 'NAO_CATALOGADA') assert.ok(usados.has(grupo), grupo);
});

test('busca ignora acento, caixa e espaços', () => {
  assert.equal(buscarExcecao('  isca esta distante do veiculo ')?.classe, 'VEICULO');
  assert.equal(buscarExcecao('Parada  Proibida + Bau')?.grupo, 'PARADA_VIOLACAO');
  assert.equal(buscarExcecao('inexistente'), null);
});

test('exceção fora do catálogo: classe da planilha e, sem ela, dedução pelo texto', () => {
  const casos = [
    [['NOVA', 'Veiculo'], 'VEICULO'], [['NOVA', 'Contexto suspeito'], 'CONTEXTO'], [['NOVA', 'motorista'], 'MOTORISTA'],
    [['ALERTA NOVO + PERDA', ''], 'CONTEXTO'], [['VIOLACAO NOVA', 'Sistema'], 'VEICULO'], [['OUTRA COISA', null], 'MOTORISTA']
  ];
  for (const [[nome, classe], esperada] of casos) {
    const r = classificarExcecao(nome, classe);
    assert.deepEqual([r.classe, r.grupo, r.catalogada], [esperada, 'NAO_CATALOGADA', false], nome);
  }
  assert.deepEqual(classificarExcecao('velocidade excedida faixa 1', 'Veiculo'),
    { nome: 'VELOCIDADE EXCEDIDA FAIXA 1', classe: 'MOTORISTA', grupo: 'VELOCIDADE', catalogada: true }, 'catálogo prevalece');
});
