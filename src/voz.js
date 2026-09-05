// Percurso v2 — camada de voz: catalogos fechados, agente extrator e folha do dia.
//
// DOUTRINA (01-VISAO-E-MUDANCAS / 06-AGENTES-IA do pack v2, e invariante 3 do
// plano de arquitetura):
//   1. A IA nunca grava. A IA pre-preenche; quem confirma e' a pessoa.
//   2. O agente escolhe DENTRO de listas fixas. Nunca escreve texto livre.
//   3. Se a IA cair, o registro manual continua funcionando.
//
// O extrator daqui e' deterministico: casamento lexical sobre listas fechadas,
// sem modelo, sem chamada de rede, sem chave de API. Isso mantem o custo de
// licenca em R$ 0 (restricao do bloco 5) e torna cada campo auditavel. O slot
// arquitetural do SLM esta preenchido com regra; trocar por um modelo local e'
// substituicao de implementacao SEM mudanca de contrato — a saida continua
// tendo que validar contra o mesmo schema.
import { all, get, run, tx } from './db.js';
import { PARAMS, agora, erro, filtrarPerimetro, marcarAtividade, encontroDe, turmaNaRubrica, chamada as chamadaDe } from './domain.js';

// --------------------------------------------------------------------------
// Catalogos fechados — espelham codigo/schema-extracao.json do pack v2.
// Mudar qualquer lista aqui e' mudar o contrato do agente.
// --------------------------------------------------------------------------
export const ATIVIDADES = [
  { codigo: 'roda',         rotulo: 'Roda de conversa', termos: ['roda', 'conversa', 'circulo', 'círculo', 'assembleia'] },
  { codigo: 'brincadeira',  rotulo: 'Brincadeira',      termos: ['brincad', 'brinca', 'jogo', 'jogar', 'brincar', 'pique'] },
  { codigo: 'leitura',      rotulo: 'Leitura',          termos: ['leitura', 'ler ', 'leram', 'livro', 'historia', 'história', 'lendo'] },
  { codigo: 'desenho',      rotulo: 'Desenho',          termos: ['desenh', 'pintura', 'pintar', 'pintaram', 'colagem', 'recorte'] },
  { codigo: 'musica',       rotulo: 'Música',           termos: ['musica', 'música', 'cantar', 'cantaram', 'canta', 'violao', 'violão', 'percussao', 'percussão'] },
  { codigo: 'parque',       rotulo: 'Parque',           termos: ['parque', 'quadra', 'patio', 'pátio', 'ar livre', 'la fora', 'lá fora'] },
  { codigo: 'nao_identificada', rotulo: 'Não identificada', termos: [] },
];

export const AREAS = [
  { codigo: 'educacao',   rotulo: 'Educação',   termos: ['escola', 'professor', 'estudar', 'licao', 'lição', 'dever', 'matematica', 'matemática', 'portugues', 'português', 'educacao', 'educação'] },
  { codigo: 'saude',      rotulo: 'Saúde',      termos: ['saude', 'saúde', 'posto', 'enfermeir', 'dentista', 'higiene', 'corpo', 'alimentacao saudavel', 'alimentação saudável'] },
  { codigo: 'esporte',    rotulo: 'Esporte',    termos: ['esporte', 'futebol', 'volei', 'vôlei', 'corrida', 'treino', 'atletismo', 'basquete'] },
  { codigo: 'artes',      rotulo: 'Artes',      termos: ['arte', 'teatro', 'danca', 'dança', 'pintura', 'musica', 'música', 'artesanato'] },
  { codigo: 'tecnologia', rotulo: 'Tecnologia', termos: ['tecnologia', 'computador', 'robotica', 'robótica', 'programacao', 'programação', 'tablet', 'internet'] },
  { codigo: 'outra',      rotulo: 'Outra área', termos: ['profiss', 'carreira', 'trabalho', 'oficio', 'ofício'] },
  { codigo: 'nenhuma',    rotulo: 'Nenhuma',    termos: [] },
];

export const MARCADORES = [
  { codigo: 'colaborou',  rotulo: 'Colaborou',  termos: ['colabor', 'ajudaram', 'ajudou um ao outro', 'em dupla', 'junto', 'dividiram'] },
  { codigo: 'participou', rotulo: 'Participou', termos: ['participa', 'participou', 'engajad', 'entraram na atividade', 'todo mundo entrou'] },
  { codigo: 'agitado',    rotulo: 'Agitado',    termos: ['agitad', 'agitacao', 'agitação', 'eletric', 'elétric', 'barulhent', 'correria'] },
  { codigo: 'disperso',   rotulo: 'Disperso',   termos: ['dispers', 'distrai', 'desatent', 'nao prestaram atencao', 'não prestaram atenção'] },
  { codigo: 'alegre',     rotulo: 'Alegre',     termos: ['alegre', 'animad', 'feliz', 'rindo', 'riram', 'divertid'] },
  { codigo: 'cansado',    rotulo: 'Cansado',    termos: ['cansad', 'sonolent', 'quietinh', 'sem energia', 'moles'] },
];

export const MAX_MARCADORES = 4;

// --------------------------------------------------------------------------
// Decisao 31 (campo, 29/08/2026) — o registro de VIVENCIA. A psicologa registra
// o procedimento que fez (padrao do conselho profissional: procedimento, nao
// individualizado, sem nome) e o check-in de grupo que ela validou ao vivo:
// "quantas ajudaram sem ninguem pedir? duas. quantas participaram do comeco ao
// fim? seis. conflito? resolveu conversando. um nao foi observado."
// Listas fechadas, como tudo aqui: o agente escolhe DENTRO delas.
// --------------------------------------------------------------------------
export const PROCEDIMENTOS = [
  { codigo: 'roda_emocoes',     rotulo: 'Roda de emoções',                      termos: ['roda de emoc', 'roda das emoc', 'nomear emoc', 'cartas de emoc', 'roda de sentimento', 'termometro', 'termômetro'] },
  { codigo: 'rede_apoio',       rotulo: 'Jogo da rede de apoio e cidadania',    termos: ['rede de apoio', 'cidadania', 'quem pode ajudar', 'a quem recorrer', 'servicos da comunidade', 'serviços da comunidade', 'agente comunitario', 'agente comunitário', 'posto de saude', 'posto de saúde', 'plaquinha'] },
  { codigo: 'regulacao',        rotulo: 'Regulação emocional e sistema nervoso', termos: ['regulac', 'regulaç', 'sistema nervoso', 'respirac', 'respiraç', 'acalmar', 'hulk', 'nem tudo e uma emergencia', 'nem tudo é uma emergência', 'se acalm'] },
  { codigo: 'historia',         rotulo: 'História ou metáfora',                 termos: ['historia', 'história', 'metafora', 'metáfora', 'conto', 'personagem', 'super-heroi', 'super-herói', 'heroi', 'herói'] },
  { codigo: 'oficina',          rotulo: 'Oficina manual',                       termos: ['costura', 'oficina', 'agulha', 'artesan', 'colagem', 'construir', 'construcao', 'construção', 'tecido'] },
  { codigo: 'jogo_cooperativo', rotulo: 'Jogo cooperativo',                     termos: ['jogo cooperativ', 'cooperativ', 'em equipe', 'em grupos', 'dois grupos', 'grupo 1', 'grupo 2', 'competicao do bem', 'competição do bem'] },
  { codigo: 'outro',            rotulo: 'Outro procedimento',                   termos: [] },
  { codigo: 'nao_identificado', rotulo: 'Não identificado',                     termos: [] },
];

export const OBJETIVOS = [
  { codigo: 'regulacao_emocional',  rotulo: 'Regulação emocional',      termos: ['regular', 'regulac', 'regulaç', 'acalmar', 'autocontrole', 'impulso', 'raiva', 'agitac', 'agitaç'] },
  { codigo: 'rede_apoio_cidadania', rotulo: 'Rede de apoio e cidadania', termos: ['rede de apoio', 'cidadania', 'a quem recorrer', 'direitos', 'comunidade', 'quem faz o que'] },
  { codigo: 'autoestima',           rotulo: 'Autoestima',               termos: ['autoestima', 'auto-estima', 'eu consegui', 'confianca', 'confiança', 'orgulh', 'capaz'] },
  { codigo: 'resiliencia',          rotulo: 'Resiliência',              termos: ['resilien', 'desistir', 'persist', 'tentar de novo', 'frustra', 'nao desist', 'não desist'] },
  { codigo: 'convivencia',          rotulo: 'Convivência',              termos: ['convivencia', 'convivência', 'cooper', 'colegas', 'respeito', 'combinados', 'em dupla'] },
  { codigo: 'expressao',            rotulo: 'Expressão emocional',      termos: ['express', 'nomear o que sente', 'falar sobre sentimento', 'falar do que sente', 'homem chora', 'homem tambem chora', 'homem também chora', 'sentimentos'] },
  { codigo: 'nenhum',               rotulo: 'Não informado',            termos: [] },
];

// O check-in de grupo: contagens da TURMA. Nao existe versao por crianca.
export const CHECKIN = [
  { campo: 'ajudaram_sem_pedir',               rotulo: 'Ajudaram sem ninguém pedir' },
  { campo: 'participaram_inteiro',             rotulo: 'Participaram do começo ao fim' },
  { campo: 'conflitos',                        rotulo: 'Entraram em conflito' },
  { campo: 'conflitos_resolvidos_conversando', rotulo: 'Conflitos resolvidos conversando' },
  { campo: 'nao_observados',                   rotulo: 'Não foi possível observar' },
];
export const CHECKIN_MAX = 30;
export const checkinVazio = () => Object.fromEntries(CHECKIN.map(c => [c.campo, null]));

const codigos = (lista) => lista.map(x => x.codigo);
export const rotuloDe = (lista, codigo) => lista.find(x => x.codigo === codigo)?.rotulo ?? codigo;

export function catalogos() {
  return {
    atividades: ATIVIDADES.filter(a => a.codigo !== 'nao_identificada').map(({ codigo, rotulo }) => ({ codigo, rotulo })),
    areas: AREAS.map(({ codigo, rotulo }) => ({ codigo, rotulo })),
    marcadores: MARCADORES.map(({ codigo, rotulo }) => ({ codigo, rotulo })),
    max_marcadores: MAX_MARCADORES,
    procedimentos: PROCEDIMENTOS.filter(p => p.codigo !== 'nao_identificado').map(({ codigo, rotulo }) => ({ codigo, rotulo })),
    objetivos: OBJETIVOS.map(({ codigo, rotulo }) => ({ codigo, rotulo })),
    checkin: CHECKIN.map(({ campo, rotulo }) => ({ campo, rotulo })),
    checkin_max: CHECKIN_MAX,
    voz_sugestao_segundos: PARAMS.VOZ_SUGESTAO_SEGUNDOS,
    confianca_minima: PARAMS.CONFIANCA_MINIMA,
  };
}

// --------------------------------------------------------------------------
// Validacao de schema — sem dependencia. Espelha codigo/schema-extracao.json.
// Toda escrita passa por aqui: schema invalido nao chega ao banco.
// --------------------------------------------------------------------------
export function validarExtracao(obj) {
  const erros = [];
  const o = obj ?? {};
  if (!codigos(ATIVIDADES).includes(o.atividade)) erros.push('atividade fora da lista fechada');
  if (!codigos(AREAS).includes(o.area_tematica)) erros.push('area_tematica fora da lista fechada');
  if (!Array.isArray(o.marcadores_turma)) erros.push('marcadores_turma deve ser lista');
  else {
    if (o.marcadores_turma.length > MAX_MARCADORES) erros.push(`marcadores_turma acima de ${MAX_MARCADORES}`);
    if (new Set(o.marcadores_turma).size !== o.marcadores_turma.length) erros.push('marcadores_turma com repetição');
    for (const m of o.marcadores_turma) if (!codigos(MARCADORES).includes(m)) erros.push(`marcador fora da lista: ${m}`);
  }
  if (!Number.isInteger(o.pediram_ajuda) || o.pediram_ajuda < 0 || o.pediram_ajuda > 30)
    erros.push('pediram_ajuda deve ser inteiro de 0 a 30');
  if (o.faltas_mencionadas != null && !Array.isArray(o.faltas_mencionadas))
    erros.push('faltas_mencionadas deve ser lista');
  if (typeof o.confianca !== 'number' || o.confianca < 0 || o.confianca > 1)
    erros.push('confianca deve ser número entre 0 e 1');
  if (typeof o.conteudo_excluido !== 'boolean') erros.push('conteudo_excluido deve ser booleano');
  // Decisao 31: procedimento e objetivo sao opcionais fora da vivencia (null),
  // mas quando vem, vem da lista fechada.
  if (o.procedimento != null && !codigos(PROCEDIMENTOS).includes(o.procedimento))
    erros.push('procedimento fora da lista fechada');
  if (o.objetivo != null && !codigos(OBJETIVOS).includes(o.objetivo))
    erros.push('objetivo fora da lista fechada');
  const ck = o.checkin ?? null;
  if (ck != null) {
    if (typeof ck !== 'object' || Array.isArray(ck)) erros.push('checkin deve ser objeto');
    else {
      for (const k of Object.keys(ck))
        if (!CHECKIN.some(c => c.campo === k)) erros.push(`checkin com campo desconhecido: ${k}`);
      for (const c of CHECKIN) {
        const v = ck[c.campo];
        if (v != null && (!Number.isInteger(v) || v < 0 || v > CHECKIN_MAX))
          erros.push(`${c.campo} deve ser inteiro de 0 a ${CHECKIN_MAX}`);
      }
      if (ck.conflitos != null && ck.conflitos_resolvidos_conversando != null
          && ck.conflitos_resolvidos_conversando > ck.conflitos)
        erros.push('conflitos resolvidos conversando não pode passar do total de conflitos');
    }
  }
  return { valido: erros.length === 0, erros };
}

// --------------------------------------------------------------------------
// Agente extrator (F4). Entrada: transcricao. Saida: objeto do schema.
// Nada aqui persiste. A transcricao nunca e' devolvida nem gravada.
// --------------------------------------------------------------------------
const normalizar = (t) => (t || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const NUMEROS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6,
                  sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14,
                  quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30,
                  nenhum: 0, nenhuma: 0, ninguem: 0 };
const PALAVRA_NUMERO = '(\\d{1,2}|' + Object.keys(NUMEROS).join('|') + ')';

// Contagem do check-in: o numero que vem ANTES do termo, na mesma frase
// ("duas ajudaram sem ninguem pedir", "seis participaram do comeco ao fim").
// Ausente = null (nao informado), nunca 0: zero e' afirmacao, e a fala nao
// afirmou.
//
// O DEFAULT 1 SAIU EM 05/09/2026, e o motivo e' um defeito medido. A versao
// anterior devolvia 1 em tres situacoes de "nao entendi":
//
//   · termo sem numeral nenhum — "todas participaram do comeco ao fim" numa
//     turma de 24 gravava **1**, e o indicador de participacao despencava sem
//     que ninguem tivesse dito isso;
//   · numero fora de 0..CHECKIN_MAX — "32 participaram" gravava 1;
//   · "resolveram conversando" sozinho INVENTAVA um conflito que ninguem contou.
//
// Isso contradizia a doutrina escrita quatro linhas acima e em `:295`
// ("falhar em branco e' melhor que falhar preenchido"). Agora "nao entendi"
// e' `null` em todos os casos, e a pessoa preenche na conferencia — que e' o
// gate que sempre existiu.
//
// A fronteira: so' vira numero um NUMERAL INEQUIVOCO adjacente ao termo.
// Quantificador ("todas", "a maioria") nao vira numero porque o extrator NAO
// CONHECE o tamanho da turma — supor seria inventar. Faixa ("seis ou sete")
// tambem nao: a fala nao escolheu.
function contarAntesDe(texto, termo) {
  const re = new RegExp('(?:' + PALAVRA_NUMERO + '\\s+(?:crian[c]as?\\s+)?(?:dela?s?\\s+)?)?' + termo);
  const m = texto.match(re);
  if (!m) return null;
  const antes = texto.slice(0, m.index);

  // "seis OU sete participaram": o regex pega o numeral mais proximo (sete) e
  // transformaria uma faixa em numero firme. A fala nao escolheu; nem o produto.
  if (m[1] != null && new RegExp(PALAVRA_NUMERO + '\\s+(?:ou|a)\\s*$').test(antes)) return null;

  // Termo sem numeral. "meia duzia" e' fechado e literal, entao conta; qualquer
  // outra coisa (inclusive quantificador) fica em branco.
  if (m[1] == null) return /meia\s+duzia\s+(?:de\s+)?(?:crian[c]as?\s+)?$/.test(antes) ? 6 : null;

  // PALAVRA_NUMERO captura digito (\d{1,2}) OU palavra; aqui o teste tem de ser
  // regex LITERAL com \d simples — /^\\d+$/ procurava barra-invertida e virava 1.
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMEROS[m[1]];
  return Number.isInteger(n) && n >= 0 && n <= CHECKIN_MAX ? n : null;
}

export function extrairCheckin(textoNormalizado) {
  const t = textoNormalizado;
  const ck = checkinVazio();
  ck.ajudaram_sem_pedir = contarAntesDe(t, 'ajud(?:ou|aram|ando)\\s+(?:o[s]?\\s+colegas?\\s+)?sem\\s+(?:ninguem\\s+|que\\s+ninguem\\s+|precisar\\s+)?(?:pedir|pedisse|precisar)');
  ck.participaram_inteiro = contarAntesDe(t, 'particip(?:ou|aram|ando)\\s+(?:d[oa]\\s+)?(?:comeco|inicio)\\s+ao\\s+(?:fim|final)')
    ?? contarAntesDe(t, 'ficaram\\s+ate\\s+o\\s+fim') ?? contarAntesDe(t, 'particip(?:ou|aram)\\s+ate\\s+o\\s+fim');
  // A negacao vem antes OU depois: "sem conflito" e "conflito nenhum" dizem a
  // mesma coisa, e so' a primeira era entendida — a segunda gravava 1 conflito,
  // virando a negacao em afirmacao.
  if (/(sem|nenhum|nao teve|nao houve|zero)\s+conflito/.test(t)
   || /conflitos?\s+(nenhum|algum|zero)/.test(t)) ck.conflitos = 0;
  else ck.conflitos = contarAntesDe(t, 'conflitos?');
  const TERMO_RESOLVIDOS = 'resolv(?:eu|eram|ido|idos)\\s+(?:na\\s+conversa|conversando|no\\s+dialogo|dialogando)';
  const resolvidos = contarAntesDe(t, TERMO_RESOLVIDOS);
  if (resolvidos != null) {
    if (ck.conflitos == null) ck.conflitos = resolvidos;
    ck.conflitos_resolvidos_conversando = Math.min(resolvidos, ck.conflitos);
  } else if (new RegExp(TERMO_RESOLVIDOS).test(t) && ck.conflitos > 0) {
    // "teve um conflito e resolveram conversando": sem numeral proprio, mas o
    // total e' conhecido — resolveram OS conflitos. Sem total conhecido, o
    // "resolveram conversando" sozinho nao inventa conflito nenhum.
    ck.conflitos_resolvidos_conversando = ck.conflitos;
  } else if (ck.conflitos === 0) ck.conflitos_resolvidos_conversando = 0;
  ck.nao_observados = contarAntesDe(t, 'nao\\s+(?:foi|foram|deu\\s+para|consegui|conseguimos)\\s+observ\\w*')
    ?? contarAntesDe(t, 'nao\\s+observ(?:ei|amos|ad[oa]s?)');
  if (/(todos|todas|todo mundo)\s+(foram|foi)\s+observad/.test(t) || /observei\s+(todos|todas|todo mundo)/.test(t)) ck.nao_observados = 0;
  return ck;
}

function acharNaLista(lista, texto) {
  const achados = [];
  for (const item of lista) {
    for (const t of item.termos) {
      const alvo = normalizar(t);
      if (alvo && texto.includes(alvo)) { achados.push(item.codigo); break; }
    }
  }
  return achados;
}

function contarPediramAjuda(texto) {
  // "tres pediram ajuda", "4 crianças pediram ajuda", "pediram ajuda: 3"
  // FRONTEIRA DE PALAVRA obrigatoria: sem ela, a alternacao casava o SUFIXO —
  // "deze**sseis** pediram ajuda" gravava 6, "dezessete" 7, "dezenove" 9. E a
  // lista curta duplicava `NUMEROS` pela metade; agora usa a mesma fonte.
  // `pediu` entrou porque todo singular do preterito ("uma crianca pediu
  // ajuda") era perdido e virava o fallback.
  const re = new RegExp('(?<![a-z0-9])' + PALAVRA_NUMERO
    + '\\s*(?:crian[c]as?\\s*)?(?:me\\s*)?ped(?:iu|iram|ira|irao)\\s+ajuda');
  const m = texto.match(re);
  if (m) {
    const bruto = m[1];
    const n = /^\d+$/.test(bruto) ? Number(bruto) : NUMEROS[bruto];
    if (Number.isInteger(n) && n >= 0 && n <= 30) return n;
  }
  if (/ped(?:iu|iram|ira|irao)\s+ajuda/.test(texto)) return 1;
  return 0;
}

/**
 * Extrai os campos da folha a partir da transcricao.
 *
 * @param {string} transcricao   fala transcrita no navegador; nunca persistida
 * @param {string[]} nomesDaTurma nomes elegiveis para `faltas_mencionadas`
 * @returns {{extracao:object, perimetro:object}}
 */
export function extrairDaFala(transcricao, nomesDaTurma = [], { vivencia = false } = {}) {
  const bruto = (transcricao || '').trim();

  // Passo 1 — lista de exclusao ANTES de qualquer extracao (F5).
  // O trecho bloqueado nao alimenta nenhum campo e nao e' gravado em lugar
  // nenhum: sai apenas na resposta HTTP, para a tela devolver encaminhamento.
  // Na vivencia, o NOME do procedimento ("vivencia terapeutica", "terapia em
  // grupo") nao e' conteudo sobre crianca e nao dispara o filtro (decisao 31).
  const perimetro = filtrarPerimetro(bruto, nomesDaTurma, { contexto: vivencia ? 'vivencia' : null });
  const limpo = normalizar(perimetro.limpo);

  const vazia = {
    atividade: 'nao_identificada', area_tematica: 'nenhuma', marcadores_turma: [],
    pediram_ajuda: 0, faltas_mencionadas: [], confianca: 0, conteudo_excluido: perimetro.bloqueado,
    procedimento: vivencia ? 'nao_identificado' : null, objetivo: vivencia ? 'nenhum' : null,
    checkin: checkinVazio(),
  };
  if (!limpo || limpo.split(/\s+/).length < 4) return { extracao: vazia, perimetro };

  const ativs = acharNaLista(ATIVIDADES, limpo);
  const areas = acharNaLista(AREAS, limpo);
  const marcs = acharNaLista(MARCADORES, limpo).slice(0, MAX_MARCADORES);
  const ajuda = contarPediramAjuda(limpo);
  const procs = vivencia ? acharNaLista(PROCEDIMENTOS, limpo) : [];
  const objs = vivencia ? acharNaLista(OBJETIVOS, limpo) : [];
  const checkin = extrairCheckin(limpo);
  const temCheckin = Object.values(checkin).some(v => v != null);

  // faltas: so quando a educadora DIZ que faltou, e so para nome da turma.
  //
  // FRONTEIRA DE PALAVRA, obrigatoria. Era `limpo.includes(primeiro)`, e
  // "Ana" casava dentro de "semana" — "faltou gente essa semana" marcaria a Ana
  // como falta. Presenca decide renovacao de matricula (regua de 75%, decisao
  // 33): uma falta inventada por substring nao e' detalhe.
  const faltas = [];
  if (/(faltou|faltaram|nao veio|nao vieram|nao apareceu)/.test(limpo)) {
    for (const nome of nomesDaTurma) {
      const primeiro = normalizar(nome).split(' ')[0];
      if (primeiro.length < 3) continue;
      const fronteira = new RegExp(`(?:^|[^a-z0-9])${primeiro.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z0-9])`);
      if (fronteira.test(limpo)) faltas.push(nome);
    }
  }

  // Confianca: quanto do schema a fala preencheu, ponderado pelo tamanho.
  const palavras = limpo.split(/\s+/).length;
  let conf = 0;
  if (ativs.length) conf += 0.35;
  if (areas.length) conf += 0.20;
  if (marcs.length) conf += 0.25;
  if (ajuda > 0 || faltas.length) conf += 0.10;
  if (temCheckin) conf += 0.15;
  // Na vivencia o procedimento e' o campo central: pesa como a atividade.
  if (vivencia && procs.length) conf += 0.35;
  if (vivencia && objs.length) conf += 0.15;
  conf += Math.min(0.10, palavras / 400);
  conf = Math.round(Math.min(1, conf) * 100) / 100;

  // Falhar em branco e' melhor que falhar preenchido (06-AGENTES-IA).
  if (conf < PARAMS.CONFIANCA_MINIMA) return { extracao: { ...vazia, confianca: conf }, perimetro };

  const extracao = {
    atividade: ativs[0] ?? 'nao_identificada',
    area_tematica: areas[0] ?? 'nenhuma',
    marcadores_turma: marcs,
    pediram_ajuda: ajuda,
    faltas_mencionadas: faltas,
    confianca: conf,
    conteudo_excluido: perimetro.bloqueado,
    procedimento: vivencia ? (procs[0] ?? 'nao_identificado') : null,
    objetivo: vivencia ? (objs[0] ?? 'nenhum') : null,
    checkin,
  };
  const v = validarExtracao(extracao);
  // Um extrator que produz saida invalida cai para o estado neutro em vez de
  // gravar lixo: a degradacao e' sempre para o manual, nunca para o errado.
  if (!v.valido) return { extracao: { ...vazia, confianca: 0 }, perimetro, invalido: v.erros };
  return { extracao, perimetro };
}

// --------------------------------------------------------------------------
// F6 — confirmacao humana. E' AQUI que a primeira gravacao acontece.
// --------------------------------------------------------------------------
export function folhaDe(encontroId) {
  const f = get(`SELECT * FROM folha WHERE encontro_id = ?`, encontroId);
  if (!f) return null;
  f.marcadores = all(`SELECT marcador FROM folha_marcador WHERE folha_id = ? ORDER BY marcador`, f.id)
    .map(r => r.marcador);
  f.checkin = Object.fromEntries(CHECKIN.map(c => [c.campo, f[c.campo] ?? null]));
  f.relato_liberado = !!f.relato_liberado_em;
  return f;
}

export function folhaDaTurma(turmaId, data) {
  const enc = encontroDe(turmaId, data);
  return enc ? folhaDe(enc.id) : null;
}

/**
 * A ULTIMA folha da turma ANTES desta data — a matriz-prima do "Igual ao
 * encontro de <data>".
 *
 * POR QUE ISTO EXISTE: hoje toda folha nasce neutra (procedimento
 * `nao_identificado`, objetivo `nenhum`, marcadores vazios) mesmo quando ha'
 * doze encontros iguais da mesma turma atras. Foi promessa literal na visita
 * (Grav. 84): *"ele ja' sabe o que voce faz... e' igual a sala do passado"*.
 *
 * NAO usa modelo, e nao pre-grava nada: e' sugestao para a tela oferecer com um
 * toque, e o gate de confirmacao humana continua identico.
 */
export function folhaAnteriorDaTurma(turmaId, data) {
  const enc = get(
    `SELECT e.id, e.data FROM encontro e JOIN folha f ON f.encontro_id = e.id
      WHERE e.turma_id = ? AND e.data < ? ORDER BY e.data DESC LIMIT 1`, turmaId, data);
  if (!enc) return null;
  const f = folhaDe(enc.id);
  if (!f) return null;
  return {
    data: enc.data,
    campos: {
      atividade: f.atividade,
      area_tematica: f.area_tematica,
      marcadores_turma: [...f.marcadores],
      procedimento: f.procedimento ?? null,
      objetivo: f.objetivo ?? null,
      // As CONTAGENS nao vem: quantas ajudaram sem pedir e quantos conflitos
      // houve sao do encontro de hoje, e repeti-las seria inventar observacao.
      // O que se repete e' o DESENHO da atividade, nao o que aconteceu nela.
    },
  };
}

/**
 * Grava a folha do dia. Chamada SOMENTE depois do toque em "Confirmar e guardar".
 *
 * @param {object} p
 * @param {number} p.encontroId
 * @param {number} p.educadorId
 * @param {object} p.campos       o que a pessoa confirmou (ja editado por ela)
 * @param {'voz'|'manual'} p.origem
 * @param {object|null} p.sugestao o que o agente havia proposto — so para medir
 *                                 a taxa de correcao; nao decide nada
 * @param {boolean} p.fechar
 */
export function salvarFolha({ encontroId, educadorId, campos, origem = 'manual', sugestao = null, fechar = false }) {
  const enc = get(`SELECT * FROM encontro WHERE id = ?`, encontroId);
  if (!enc) throw erro(404, 'Encontro não encontrado — faça a chamada antes de contar como foi.');
  if (!['voz', 'manual'].includes(origem)) throw erro(422, 'Origem da folha inválida.');

  const c = campos ?? {};
  const vivencia = !turmaNaRubrica(enc.turma_id);
  const inteiroOuNulo = (x) => (x === '' || x == null) ? null : (Number.isInteger(Number(x)) ? Number(x) : NaN);
  const ckEntrada = c.checkin && typeof c.checkin === 'object' ? c.checkin : {};
  const checkin = Object.fromEntries(CHECKIN.map(k => [k.campo, inteiroOuNulo(ckEntrada[k.campo])]));
  const proposta = {
    atividade: c.atividade ?? 'nao_identificada',
    area_tematica: c.area_tematica ?? 'nenhuma',
    marcadores_turma: [...new Set(c.marcadores_turma ?? [])],
    pediram_ajuda: Number.isFinite(Number(c.pediram_ajuda)) ? Number(c.pediram_ajuda) : 0,
    faltas_mencionadas: [],
    // A confianca e' do AGENTE, nunca do corpo enviado pelo cliente: quem edita
    // a folha a mao nao pode reescrever a metrica que mede o proprio agente.
    confianca: origem === 'voz' && sugestao && typeof sugestao.confianca === 'number' ? sugestao.confianca : 1,
    conteudo_excluido: !!c.conteudo_excluido,
    procedimento: c.procedimento ?? (vivencia ? 'nao_identificado' : null),
    objetivo: c.objetivo ?? (vivencia ? 'nenhum' : null),
    checkin,
  };
  const v = validarExtracao(proposta);
  if (!v.valido) throw erro(422, `Folha fora do formato fechado: ${v.erros.join('; ')}.`);
  // Na vivencia o procedimento e' o registro (padrao do conselho): sem ele nao
  // ha o que relatar. Fora dela, procedimento e objetivo nao se aplicam.
  if (vivencia && (!proposta.procedimento || proposta.procedimento === 'nao_identificado'))
    throw erro(422, 'Escolha o procedimento da vivência — é ele que vai para o registro do conselho.',
      { campo: 'procedimento' });
  if (!vivencia) { proposta.procedimento = null; proposta.objetivo = null; }

  // Taxa de correcao pos-extracao: a metrica que mede a IA de verdade.
  let sugeridos = 0, editados = 0;
  if (origem === 'voz' && sugestao) {
    const par = [
      ['atividade', sugestao.atividade, proposta.atividade],
      ['area_tematica', sugestao.area_tematica, proposta.area_tematica],
      ['pediram_ajuda', sugestao.pediram_ajuda, proposta.pediram_ajuda],
      ['marcadores_turma',
        JSON.stringify([...(sugestao.marcadores_turma ?? [])].sort()),
        JSON.stringify([...proposta.marcadores_turma].sort())],
      // O check-in conta como UM campo na taxa de correcao: cinco contagens
      // corrigidas numa fala nao podem pesar mais que a atividade errada.
      ['checkin', JSON.stringify(sugestao.checkin ?? checkinVazio()), JSON.stringify(proposta.checkin)],
      ...(vivencia ? [['procedimento', sugestao.procedimento, proposta.procedimento],
                      ['objetivo', sugestao.objetivo, proposta.objetivo]] : []),
    ];
    for (const [, antes, depois] of par) { sugeridos++; if (antes !== depois) editados++; }
  }

  return tx(() => {
    const existente = get(`SELECT * FROM folha WHERE encontro_id = ?`, encontroId);
    if (existente?.status === 'fechada') {
      throw erro(422, 'Esta folha já foi fechada. Reabra pela coordenação para corrigir.');
    }
    const status = fechar ? 'fechada' : 'aberta';
    const ck = proposta.checkin;
    run(`INSERT INTO folha (encontro_id, atividade, area_tematica, pediram_ajuda, origem,
                            confianca, campos_sugeridos, campos_editados, conteudo_excluido,
                            procedimento, objetivo, ajudaram_sem_pedir, participaram_inteiro,
                            conflitos, conflitos_resolvidos_conversando, nao_observados,
                            confirmado_por, confirmado_em, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(encontro_id) DO UPDATE SET
           atividade=excluded.atividade, area_tematica=excluded.area_tematica,
           pediram_ajuda=excluded.pediram_ajuda, origem=excluded.origem,
           confianca=excluded.confianca, campos_sugeridos=excluded.campos_sugeridos,
           campos_editados=excluded.campos_editados, conteudo_excluido=excluded.conteudo_excluido,
           procedimento=excluded.procedimento, objetivo=excluded.objetivo,
           ajudaram_sem_pedir=excluded.ajudaram_sem_pedir, participaram_inteiro=excluded.participaram_inteiro,
           conflitos=excluded.conflitos, conflitos_resolvidos_conversando=excluded.conflitos_resolvidos_conversando,
           nao_observados=excluded.nao_observados,
           -- editar a folha depois de liberar o relato INVALIDA a liberacao: o
           -- texto que a profissional aprovou nao e' mais o que esta' no banco.
           relato_liberado_por=NULL, relato_liberado_em=NULL,
           confirmado_por=excluded.confirmado_por, confirmado_em=excluded.confirmado_em,
           status=excluded.status`,
        encontroId, proposta.atividade, proposta.area_tematica, proposta.pediram_ajuda, origem,
        origem === 'voz' && sugestao ? proposta.confianca : null, sugeridos, editados,
        proposta.conteudo_excluido ? 1 : 0,
        proposta.procedimento, proposta.objetivo, ck.ajudaram_sem_pedir, ck.participaram_inteiro,
        ck.conflitos, ck.conflitos_resolvidos_conversando, ck.nao_observados,
        educadorId, agora(), status);

    const folha = get(`SELECT * FROM folha WHERE encontro_id = ?`, encontroId);
    run(`DELETE FROM folha_marcador WHERE folha_id = ?`, folha.id);
    for (const m of proposta.marcadores_turma)
      run(`INSERT INTO folha_marcador (folha_id, marcador) VALUES (?,?)`, folha.id, m);

    // A area do encontro alimenta o score de exposicao (F10).
    run(`DELETE FROM atividade_area WHERE turma_id = ? AND data = ? AND origem = 'folha'`, enc.turma_id, enc.data);
    if (proposta.area_tematica !== 'nenhuma')
      run(`INSERT INTO atividade_area (turma_id, area, data, origem) VALUES (?,?,?, 'folha')`,
          enc.turma_id, proposta.area_tematica, enc.data);

    marcarAtividade(educadorId, origem === 'voz' ? 'folha_voz' : 'folha');
    return folhaDe(encontroId);
  });
}

/**
 * Reabre uma folha fechada. So a coordenacao — e o ato fica no lastro de
 * atividade. Sem isso, fechar uma folha por engano seria um beco sem saida, e
 * beco sem saida em sistema que a organizacao opera sozinha vira planilha
 * paralela.
 */
export function reabrirFolha(encontroId, usuarioId) {
  const u = get(`SELECT * FROM educador WHERE id = ?`, usuarioId);
  if (!u) throw erro(404, 'Usuário não encontrado.');
  if (u.papel !== 'coordenacao') throw erro(403, 'Somente a coordenação reabre uma folha fechada.');
  const f = get(`SELECT * FROM folha WHERE encontro_id = ?`, encontroId);
  if (!f) throw erro(404, 'Não há folha para este encontro.');
  if (f.status !== 'fechada') throw erro(422, 'Esta folha já está aberta.');
  run(`UPDATE folha SET status = 'aberta' WHERE id = ?`, f.id);
  marcarAtividade(usuarioId, 'reabrir_folha');
  return folhaDe(encontroId);
}

/** Qualidade do agente: taxa de correcao pos-extracao (07-SCORES). */
export function qualidadeDoExtrator({ turmaId = null } = {}) {
  const filtro = turmaId ? 'AND e.turma_id = ?' : '';
  const p = turmaId ? [turmaId] : [];
  const r = get(
    `SELECT COUNT(*) AS n, SUM(f.campos_sugeridos) AS sug, SUM(f.campos_editados) AS edt,
            ROUND(AVG(f.confianca), 2) AS confianca
       FROM folha f JOIN encontro e ON e.id = f.encontro_id
      WHERE f.origem = 'voz' ${filtro}`, ...p);
  const total = get(`SELECT COUNT(*) AS n FROM folha f JOIN encontro e ON e.id = f.encontro_id
                      WHERE 1=1 ${filtro}`, ...p).n;
  return {
    folhas: total,
    por_voz: r.n ?? 0,
    confianca_media: r.confianca ?? null,
    taxa_correcao_pct: r.sug ? Math.round(((r.edt ?? 0) / r.sug) * 100) : null,
    excluiram_conteudo: get(
      `SELECT COUNT(*) AS n FROM folha f JOIN encontro e ON e.id = f.encontro_id
        WHERE f.conteudo_excluido = 1 ${filtro}`, ...p).n,
  };
}


// --------------------------------------------------------------------------
// E6 (campo, 29/08/2026): devolver algo POR ENCONTRO, nao so' no fecho do
// ciclo. Compara o check-in de hoje com as ultimas folhas da turma que tem
// check-in. Com menos de 3 anteriores a comparacao mentiria — entao so' os
// numeros de hoje ("falhar em branco", 06-AGENTES-IA). Determinstico; nenhum
// numero que nao venha do banco.
// --------------------------------------------------------------------------
export const DEVOLUCAO_MINIMO_HISTORICO = 3;
export const DEVOLUCAO_JANELA = 4;

export function devolucaoDoEncontro(encontroId) {
  const enc = get(`SELECT * FROM encontro WHERE id = ?`, encontroId);
  if (!enc) return null;
  const hoje = folhaDe(encontroId);
  if (!hoje) return null;
  const presentes = chamadaDe(enc.turma_id, enc.data).criancas.filter(c => c.status === 'P').length;
  const anteriores = all(
    `SELECT f.* FROM folha f JOIN encontro e ON e.id = f.encontro_id
      WHERE e.turma_id = ? AND e.data < ?
        AND (f.ajudaram_sem_pedir IS NOT NULL OR f.participaram_inteiro IS NOT NULL
             OR f.conflitos IS NOT NULL OR f.nao_observados IS NOT NULL)
      ORDER BY e.data DESC LIMIT ?`, enc.turma_id, enc.data, DEVOLUCAO_JANELA);
  const comparavel = anteriores.length >= DEVOLUCAO_MINIMO_HISTORICO;
  const linhas = [];
  for (const c of CHECKIN) {
    const v = hoje.checkin[c.campo];
    if (v == null) continue;
    const serie = anteriores.map(a => a[c.campo]).filter(x => x != null);
    let comparacao = null, media = null;
    if (comparavel && serie.length >= DEVOLUCAO_MINIMO_HISTORICO) {
      media = Math.round((serie.reduce((s, x) => s + x, 0) / serie.length) * 10) / 10;
      comparacao = v > media + 0.5 ? 'acima' : v < media - 0.5 ? 'abaixo' : 'na_media';
    }
    const emRelacao = c.campo === 'participaram_inteiro' || c.campo === 'ajudaram_sem_pedir' ? presentes : null;
    linhas.push({
      campo: c.campo, rotulo: c.rotulo, hoje: v, presentes: emRelacao,
      media_anteriores: media, n_anteriores: serie.length, comparacao,
      texto: `${c.rotulo}: ${v}${emRelacao ? ` de ${emRelacao} presentes` : ''}`
        + (comparacao ? ` — ${comparacao === 'acima' ? 'acima da' : comparacao === 'abaixo' ? 'abaixo da' : 'na'} média dos últimos ${serie.length} encontros (${String(media).replace('.', ',')})` : ''),
    });
  }
  return {
    encontro: { id: enc.id, data: enc.data, turma_id: enc.turma_id }, presentes,
    comparavel, anteriores: anteriores.length, minimo_historico: DEVOLUCAO_MINIMO_HISTORICO,
    linhas,
    leitura: !linhas.length
      ? 'Sem check-in nesta folha — as contagens do grupo é que fazem a devolução.'
      : comparavel
        ? 'Comparação com as últimas folhas desta turma. Contagens do grupo, nunca de uma criança.'
        : `Ainda sem base para comparar (precisa de ${DEVOLUCAO_MINIMO_HISTORICO} folhas anteriores com check-in). Ficam os números de hoje.`,
  };
}
