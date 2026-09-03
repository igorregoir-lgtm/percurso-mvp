// Percurso v2 — saida para o doador.
//
// REGRA ZERO (08-RELATORIO-DOADOR): o doador NAO entra no sistema. Nao ha login
// de doador, nao ha painel com acesso vivo a base. O que sai e' um artefato
// gerado, revisado pela diretoria e publicado. Doar nao pode virar caminho de
// acesso a crianca.
//
// Tres travas, todas verificadas em teste:
//   1. Nenhum numero que nao venha do banco — o texto e' template e interpola
//      valores calculados em SQL. Nao ha geracao livre.
//   2. Nenhuma afirmacao causal — `revisarSobreAlegacao` barra verbo causal
//      forte e exige a ressalva metodologica.
//   3. Supressao ANTES da redacao — nenhum recorte com menos de cinco criancas
//      chega ao texto.
import { all, get, run } from './db.js';
import {
  PARAMS, hoje, agora, addDias, diasEntre, dataBR, erro,
  inventario, presencaMedia, agregadoPorCiclo, revisarSobreAlegacao, cicloAberto, safras,
} from './domain.js';
import { suprimir, exposicao, coberturaRegistro, riscoEvasao } from './scores.js';
import { MARCADORES } from './voz.js';
// O modelo reescreve cada bloco; os números continuam vindo do SQL deste
// arquivo e são conferidos contra o bloco determinístico (decisão 28).
import { redigirComModelo, SISTEMA_REDATOR } from './redacao-modelo.js';

const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
// Decimal em portugues: 13,6 e nao 13.6.
const dec = (v) => v == null ? '—' : String(v).replace('.', ',');
const brl = (v) => v == null ? null
  : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --------------------------------------------------------------------------
// Numeros do ciclo — tudo o que o relatorio pode dizer, ja calculado.
// --------------------------------------------------------------------------
export function numerosDoPeriodo({ inicio, fim, custoPeriodo = null }) {
  if (!inicio || !fim || inicio > fim) throw erro(422, 'Período inválido: informe início e fim, nessa ordem.');
  const inv = inventario();

  // --- Bloco 1 · cobertura -------------------------------------------------
  const encontros = get(
    `SELECT COUNT(*) AS n FROM encontro WHERE data BETWEEN ? AND ?`, inicio, fim).n;
  const programasBrutos = all(
    `SELECT p.id, p.nome, p.faixa, p.no_escopo,
            COUNT(DISTINCT m.id) AS matriculas,
            COUNT(DISTINCT m.crianca_id) AS criancas
       FROM programa p
       LEFT JOIN matricula m ON m.programa_id = p.id AND m.status='ativa'
      GROUP BY p.id ORDER BY p.id`)
    .map(p => ({
      ...p, rotulo: p.nome,
      encontros: get(`SELECT COUNT(*) AS n FROM encontro e
                        JOIN turma t ON t.id = e.turma_id
                       WHERE t.programa_id = ? AND e.data BETWEEN ? AND ?`, p.id, inicio, fim).n,
      presenca_pct: (() => {
        const r = get(
          `SELECT COUNT(*) AS t, SUM(CASE WHEN pr.status='P' THEN 1 ELSE 0 END) AS p
             FROM presenca pr JOIN encontro e ON e.id = pr.encontro_id
             JOIN turma tu ON tu.id = e.turma_id
            WHERE tu.programa_id = ? AND e.data BETWEEN ? AND ?`, p.id, inicio, fim);
        return pct(r.p ?? 0, r.t);
      })(),
    }));

  // Supressao ANTES da redacao: programa com menos de 5 criancas e' agrupado.
  // `somaveis` explícito: sem ele o agrupamento somaria `presenca_pct` de dois
  // programas e publicaria "155%" na tabela do doador (achado SRV-03).
  const supProgramas = suprimir(programasBrutos, {
    rotulo: 'Demais programas', chave: 'criancas',
    somaveis: ['criancas', 'matriculas', 'encontros'],
  });

  // --- Bloco 2 · permanencia e presenca ------------------------------------
  // Vinculo por CRIANCA UNICA: a matricula mais antiga ainda ativa.
  const vinculos = all(
    `SELECT crianca_id, MIN(entrada) AS entrada FROM matricula
      WHERE status='ativa' GROUP BY crianca_id`)
    .map(v => ({ ...v, meses: Math.floor(diasEntre(v.entrada, fim) / 30.44) }));
  const faixas = [
    { rotulo: 'Menos de 6 meses',  min: 0,  max: 6 },
    { rotulo: '6 a 12 meses',      min: 6,  max: 12 },
    { rotulo: '12 a 24 meses',     min: 12, max: 24 },
    { rotulo: 'Mais de 24 meses',  min: 24, max: Infinity },
  ].map(f => ({ ...f, criancas: vinculos.filter(v => v.meses >= f.min && v.meses < f.max).length }));
  const supFaixas = suprimir(faixas, { rotulo: 'Demais faixas de vínculo', chave: 'criancas' });

  const maisDeDozeMeses = vinculos.filter(v => v.meses >= 12).length;
  const mesesMedios = vinculos.length
    ? Math.round((vinculos.reduce((a, v) => a + v.meses, 0) / vinculos.length) * 10) / 10 : null;
  const ordenados = vinculos.map(v => v.meses).sort((a, b) => a - b);
  const mediana = ordenados.length ? ordenados[Math.floor(ordenados.length / 2)] : null;

  const presencaR = get(
    `SELECT COUNT(*) AS t, SUM(CASE WHEN p.status='P' THEN 1 ELSE 0 END) AS p
       FROM presenca p JOIN encontro e ON e.id = p.encontro_id
      WHERE e.data BETWEEN ? AND ?`, inicio, fim);
  const presencaPct = pct(presencaR.p ?? 0, presencaR.t);

  // Retencao: quem tinha matricula antes do periodo e continua ativa no fim.
  const tinhaAntes = get(
    `SELECT COUNT(DISTINCT crianca_id) AS n FROM matricula WHERE entrada < ?`, inicio).n;
  const seguem = get(
    `SELECT COUNT(DISTINCT crianca_id) AS n FROM matricula
      WHERE entrada < ? AND status='ativa'`, inicio).n;
  const retencaoPct = pct(seguem, tinhaAntes);

  const evasao = safras().porPrograma;

  // --- Bloco 3 · dose (ancora academica ainda em aberto) -------------------
  // O relatorio do parceiro educacional NAO e' ingerido: a pergunta 2 do bloco 7
  // do dossie continua sem resposta pelo canal mediado. O que existe hoje e' a
  // comparacao interna de dose contra a rubrica — declarada como o que e'.
  const dose = compararDose({ inicio, fim });

  // --- Bloco 4 · exposicao -------------------------------------------------
  const exp = exposicao({ desde: inicio, ref: fim });
  const supAreas = suprimir(
    exp.areas.filter(a => a.criancas > 0).map(a => ({ ...a, rotulo: a.rotulo })),
    { rotulo: 'Demais áreas', chave: 'criancas', somaveis: ['criancas', 'atividades'] });
  // A LACUNA sai do MESMO conjunto suprimido, não da lista crua do score. Sem
  // isto, uma área com 4 crianças e nenhuma atividade era agrupada na tabela e
  // publicada nominalmente no texto — no mesmo documento que declara suprimir
  // qualquer recorte com menos de cinco.
  const lacunasPublicaveis = supAreas.publicaveis.filter(a => (a.atividades ?? 0) === 0);

  // --- Bloco 5 · observacao estruturada ------------------------------------
  const marcadores = marcadoresDoPeriodo({ inicio, fim });

  // --- Bloco 6 · metodo, limites e custo -----------------------------------
  const custo = custoPeriodo == null ? null : Number(custoPeriodo);
  if (custo != null && (!Number.isFinite(custo) || custo < 0))
    throw erro(422, 'Custo do período inválido.');

  return {
    periodo: { inicio, fim, rotulo: `${dataBR(inicio)} a ${dataBR(fim)}` },
    gerado_em: hoje(),
    minimo_celula: PARAMS.MINIMO_CELULA,
    cobertura: {
      criancas_unicas: inv.criancasUnicas,
      matriculas: inv.matriculas,
      // Decisao 31: a Vivencia e' programa ADICIONAL — entra na tabela por
      // programa, mas nao nos 120, senao a soma da tabela desmente o texto.
      matriculas_adicionais: inv.foraDaRubrica?.matriculas ?? 0,
      multi_programa: inv.multi,
      programas: supProgramas.publicaveis,
      programas_suprimidos: supProgramas.suprimidos,
      encontros,
      diferenca_pct: pct(inv.matriculas - inv.criancasUnicas, inv.criancasUnicas),
    },
    permanencia: {
      faixas: supFaixas.publicaveis,
      faixas_suprimidas: supFaixas.suprimidos,
      mais_de_doze_meses: maisDeDozeMeses,
      meses_medios: mesesMedios,
      mediana_meses: mediana,
      presenca_pct: presencaPct,
      presenca_por_programa: supProgramas.publicaveis
        .filter(p => p.presenca_pct != null)
        .sort((a, b) => b.presenca_pct - a.presenca_pct),
      retencao_pct: retencaoPct,
      evasao_por_programa: evasao,
    },
    dose,
    exposicao: {
      valor: exp.valor,
      aspiracoes_declaradas: exp.aspiracoes_declaradas,
      areas_com_interesse: exp.areas_com_interesse,
      areas_cobertas: exp.areas_cobertas,
      areas: supAreas.publicaveis,
      areas_suprimidas: supAreas.suprimidos,
      lacunas: lacunasPublicaveis.map(l => ({ area: l.rotulo, criancas: l.criancas })),
      lacunas_suprimidas: exp.lacunas.length - lacunasPublicaveis.length,
    },
    observacao: marcadores,
    custo: {
      valor: custo,
      valor_brl: brl(custo),
      por_crianca_unica: custo == null ? null : Math.round((custo / (inv.criancasUnicas || 1)) * 100) / 100,
      por_matricula: custo == null ? null : Math.round((custo / (inv.matriculas || 1)) * 100) / 100,
      denominador_crianca_unica: inv.criancasUnicas,
      denominador_matricula: inv.matriculas,
    },
    fontes: [
      { indicador: 'Crianças únicas e matrículas', fonte: 'Cadastro do instituto (tabelas crianca e matricula)', cobertura: '100%' },
      { indicador: 'Presença e permanência', fonte: 'Registro de presença por encontro', cobertura: '100%' },
      { indicador: 'Dose e trajetória', fonte: 'Presença cruzada com a rubrica de observação', cobertura: 'Crianças observadas nos dois ciclos' },
      { indicador: 'Aspiração e exposição', fonte: 'Registro do Laboratório de Sonhos e folha do dia', cobertura: 'Crianças com aspiração declarada' },
      { indicador: 'Marcadores de turma', fonte: 'Folha do dia, ao fim do encontro', cobertura: 'Encontros com folha completa' },
    ],
    nao_afirma: [
      { titulo: 'Não há grupo de comparação', texto: 'Nenhum indicador aqui isola o efeito do instituto de outras influências na vida da criança.' },
      { titulo: 'Não há medida clínica ou psicológica', texto: 'O atendimento psicológico existe e é sigiloso por lei. Nada dele entra neste documento, em nenhuma forma agregada.' },
      { titulo: 'A âncora acadêmica ainda não entrou', texto: 'O relatório do parceiro educacional não é ingerido: a pergunta 2 do bloco 7 do dossiê segue sem resposta pelo canal mediado.' },
      { titulo: 'Nenhuma criança é identificável', texto: `Qualquer recorte com menos de ${PARAMS.MINIMO_CELULA} crianças é agrupado ou suprimido antes da publicação.` },
    ],
  };
}

// Dose alta x dose baixa contra a rubrica agregada. Associação, nunca causa.
function compararDose({ inicio, fim }) {
  const linhas = all(
    `SELECT p.crianca_id,
            COUNT(*) AS encontros,
            SUM(CASE WHEN p.status='P' THEN 1 ELSE 0 END) AS presentes
       FROM presenca p JOIN encontro e ON e.id = p.encontro_id
      WHERE e.data BETWEEN ? AND ?
      GROUP BY p.crianca_id HAVING COUNT(*) >= 8`, inicio, fim)
    .map(l => ({ ...l, taxa: l.presentes / l.encontros }));

  const avancou = (criancaId) => {
    const r = all(
      `SELECT ci.ano, ci.ordem, AVG(oi.nivel) AS media
         FROM observacao o
         JOIN ciclo ci ON ci.id = o.ciclo_id
         JOIN observacao_item oi ON oi.observacao_id = o.id
        WHERE o.crianca_id = ? AND o.status='concluida'
        GROUP BY o.ciclo_id ORDER BY ci.ano, ci.ordem`, criancaId);
    if (r.length < 2) return null;
    return r.at(-1).media > r.at(-2).media;
  };

  const grupo = (filtro, criterio) => {
    const membros = linhas.filter(filtro).map(l => ({ ...l, avancou: avancou(l.crianca_id) }))
      .filter(l => l.avancou !== null);
    return {
      criterio, n: membros.length,
      avancaram: membros.filter(l => l.avancou).length,
      pct: pct(membros.filter(l => l.avancou).length, membros.length),
    };
  };

  const alta = grupo(l => l.taxa >= 0.8, 'Presença de 80% ou mais');
  const baixa = grupo(l => l.taxa < 0.6, 'Presença abaixo de 60%');
  // Supressao tambem aqui: grupo com menos de MINIMO_CELULA nao e' publicado.
  const publicavel = alta.n >= PARAMS.MINIMO_CELULA && baixa.n >= PARAMS.MINIMO_CELULA;
  return {
    publicavel, alta, baixa,
    fonte: 'rubrica interna de observação',
    // A ressalva fala com quem doa, não com um comitê: mesma honestidade, sem
    // jargão. Uma trava se mantém — o revisor lê palavra por palavra e não
    // entende negação ("não estabelece causa" reprovaria por conter "causa"),
    // então a redação diz o que a leitura É, nunca o que ela não é.
    limites: 'Só que a gente não está dizendo que o instituto fez isso acontecer. '
           + 'Quem vem mais costuma ter mais apoio em casa, e esse apoio pesa na escola do mesmo jeito; não temos um grupo de fora para comparar. '
           + 'Lemos este número como sinal de que vir importa — nunca como efeito medido. '
           + 'A avaliação da escola parceira não entra aqui: ela ainda não chega até nós por um caminho seguro.',
  };
}

// Marcadores de turma: proporcao de encontros em que cada marcador apareceu,
// primeira metade do periodo contra a segunda. Nao e' medida psicologica.
function marcadoresDoPeriodo({ inicio, fim }) {
  // O corte e' a mediana das folhas QUE EXISTEM no periodo, nao a metade do
  // calendario: um periodo de seis meses com registro so nos ultimos dois teria
  // a primeira metade vazia e a comparacao seria falsa por construcao.
  const janela = get(
    `SELECT MIN(e.data) AS ini, MAX(e.data) AS fim FROM folha f
       JOIN encontro e ON e.id = f.encontro_id WHERE e.data BETWEEN ? AND ?`, inicio, fim);
  const de = janela?.ini ?? inicio, ate = janela?.fim ?? fim;
  const meio = addDias(de, Math.floor(diasEntre(de, ate) / 2));
  const contar = (de, ate) => {
    const total = get(
      `SELECT COUNT(*) AS n FROM folha f JOIN encontro e ON e.id = f.encontro_id
        WHERE e.data BETWEEN ? AND ?`, de, ate).n;
    const porMarcador = Object.fromEntries(all(
      `SELECT fm.marcador, COUNT(*) AS n FROM folha_marcador fm
         JOIN folha f ON f.id = fm.folha_id JOIN encontro e ON e.id = f.encontro_id
        WHERE e.data BETWEEN ? AND ? GROUP BY fm.marcador`, de, ate)
      .map(r => [r.marcador, r.n]));
    return { total, porMarcador };
  };
  const a = contar(de, meio), b = contar(addDias(meio, 1), ate);
  const linhas = MARCADORES.map(m => ({
    marcador: m.codigo, rotulo: m.rotulo,
    inicio_pct: pct(a.porMarcador[m.codigo] ?? 0, a.total),
    fim_pct: pct(b.porMarcador[m.codigo] ?? 0, b.total),
  })).filter(l => l.inicio_pct != null || l.fim_pct != null);
  return {
    janela: { inicio: de, fim: ate, corte: meio },
    folhas_primeira_metade: a.total,
    folhas_segunda_metade: b.total,
    // Supressao por volume de folha, nao por crianca: com menos de MINIMO_CELULA
    // folhas em uma das metades a comparacao nao e' publicavel.
    publicavel: a.total >= PARAMS.MINIMO_CELULA && b.total >= PARAMS.MINIMO_CELULA,
    linhas,
    aviso: 'É o olhar de quem estava na sala, não um teste. '
         + 'Cada educadora enxerga de um jeito, e parte da diferença entre as colunas pode vir daí. '
         + 'Nenhuma criança é avaliada, pontuada ou classificada: a anotação é sempre sobre o grupo.',
  };
}

// --------------------------------------------------------------------------
// Redacao — template fechado. Cada numero abaixo veio de `numerosDoPeriodo`.
//
// QUEM FALA: o instituto, para quem doa. Nao e' um sistema descrevendo o que
// fez: e' a casa contando o periodo para quem a mantem aberta. Por isso o texto
// trata o leitor por "voce", usa palavra do dia a dia no lugar de jargao
// ("recorte", "denominador", "publicavel") e explica o que cada numero
// significa para uma crianca, nao para o metodo.
//
// A ORDEM segue a leitura de quem doa, nao a do auditor:
//   1 abertura · 2 quem foi recebido · 3 elas continuam vindo ·
//   4 o que se ve em quem vem mais · 5 o que a educadora ve na sala ·
//   6 o que elas sonham e o que faltou · 7 de onde vem o numero e o custo.
// O bloco 6 fecha o conteudo de proposito: termina no que ainda falta, que e'
// o unico pedido honesto que um relatorio assim pode fazer.
//
// O que NAO muda com o tom: nenhum numero nasce fora do banco, nenhum verbo
// causal passa pelo revisor, e a supressao ja rodou antes desta funcao.
// --------------------------------------------------------------------------

/**
 * A manchete e' um recorte como qualquer outro: com menos de MINIMO_CELULA
 * criancas de vinculo longo, ela identificaria o grupo. Mora numa funcao so
 * porque estava duplicada — e a duplicata do relatorio recebeu a guarda
 * enquanto a da carta ficou sem, publicando o mesmo recorte suprimido.
 */
export function capaPorVinculo(n) {
  return n.permanencia.mais_de_doze_meses >= n.minimo_celula;
}
export function redigirRelatorio(n) {
  const b = [];

  // 1 · Abertura. O número que abre é o mais difícil de conseguir no território:
  // criança que continua vindo. Sem gente suficiente nesse recorte, a abertura
  // troca de número e DIZ que trocou — sem nomear "doze meses" nem "um ano",
  // porque a própria formulação já entregaria o grupo pequeno.
  b.push(capaPorVinculo(n)
    ? { numero: 1, titulo: 'Para começar · o que aconteceu por aqui', destaque: `${n.permanencia.mais_de_doze_meses} crianças`,
        texto: `${n.permanencia.mais_de_doze_meses} crianças estão nesta casa há mais de um ano`
          + (n.permanencia.presenca_pct != null ? `, e vieram a ${n.permanencia.presenca_pct}% dos encontros deste período` : '')
          + `. No Jardim Ângela, continuar vindo é a coisa mais difícil de conseguir — e é isso que você ajuda a sustentar. `
          + `Estes dois números saem da lista de presença de cada encontro, uma criança por vez: dá para conferir dia a dia. `
          + `Este é o retrato de ${n.periodo.rotulo}.` }
    : { numero: 1, titulo: 'Para começar · o que aconteceu por aqui',
        destaque: n.permanencia.presenca_pct != null ? `${n.permanencia.presenca_pct}% de presença` : `${n.cobertura.criancas_unicas} crianças`,
        texto: `Neste período recebemos ${n.cobertura.criancas_unicas} crianças únicas`
          + (n.permanencia.presenca_pct != null ? `, que vieram a ${n.permanencia.presenca_pct}% dos encontros` : '')
          + `. Tem um número que preferimos não colocar aqui: quantas delas já completaram um ciclo inteiro de casa. `
          + `São menos de ${n.minimo_celula}, e publicar apontaria para crianças específicas — nenhum número vale isso. `
          + `Este é o retrato de ${n.periodo.rotulo}.` });

  b.push({ numero: 2, titulo: 'Quem você ajudou a receber',
    texto: `Foram ${n.cobertura.criancas_unicas} crianças únicas e ${n.cobertura.matriculas} matrículas ativas nos programas de matrícula${n.cobertura.matriculas_adicionais ? ` (mais ${n.cobertura.matriculas_adicionais} na Vivência terapêutica, programa adicional de quem já está no Laboratório)` : ''}, em ${n.cobertura.encontros} encontros ao longo do período. `
      + `Os dois números são diferentes de propósito: ${n.cobertura.multi_programa} crianças participam de mais de um programa e aparecem duas vezes na conta de matrículas. `
      + `Daria para somar tudo e dizer que alcançamos cerca de ${n.cobertura.diferenca_pct}% a mais de gente. Preferimos não fazer isso. `
      + `Quando você lê "criança" neste documento, é uma criança, contada uma vez só.`,
    tabela: n.cobertura.programas.map(p => ({
      'Programa': p.rotulo, 'Idade': p.faixa ?? '—', 'Crianças': p.criancas,
      'Matrículas': p.matriculas, 'Encontros': p.encontros })) });

  b.push({ numero: 3, titulo: 'Elas continuam vindo',
    texto: `Cada criança está conosco, em média, há ${dec(n.permanencia.meses_medios)} meses; metade delas, há ${dec(n.permanencia.mediana_meses)} meses ou mais. `
      + (n.permanencia.retencao_pct != null
          ? `Das que já estavam matriculadas antes deste período, ${n.permanencia.retencao_pct}% seguem aqui. ` : '')
      + `É o número que a gente mais olha por dentro: criança que volta é criança que confia no lugar. `
      + `Na tabela, há quanto tempo cada grupo está na casa — e ninguém é contado duas vezes.`,
    tabela: n.permanencia.faixas.map(f => ({ 'Há quanto tempo estão aqui': f.rotulo, 'Crianças': f.criancas })) });

  b.push({ numero: 4, titulo: 'O que a gente vê em quem vem mais',
    texto: n.dose.publicavel
      ? `Este é o número que pede mais calma. Entre as crianças que vieram a 80% ou mais dos encontros, ${n.dose.alta.pct}% das ${n.dose.alta.n} melhoraram na leitura das educadoras de um ciclo para o outro. `
        + `Entre as que vieram a menos de 60%, foram ${n.dose.baixa.pct}% das ${n.dose.baixa.n}. ${n.dose.limites}`
      : `Neste período a gente não publica esta comparação: um dos dois grupos tem menos de ${n.minimo_celula} crianças, e o número acabaria apontando para elas. ${n.dose.limites}` });

  b.push({ numero: 5, titulo: 'O que a educadora vê na sala',
    texto: n.observacao.publicavel
      ? `No fim de cada encontro, a educadora para um minuto e anota como a turma esteve naquele dia: se o grupo colaborou, se participou, se estava agitado. `
        + `A tabela compara o começo do período (${n.observacao.folhas_primeira_metade} anotações) com o fim (${n.observacao.folhas_segunda_metade}). `
        + n.observacao.aviso
      : `Neste período tivemos poucas anotações em uma das metades — menos de ${n.minimo_celula} — e a comparação diria mais sobre o nosso registro do que sobre as crianças. Por isso ela fica de fora. `
        + n.observacao.aviso,
    tabela: n.observacao.publicavel
      ? n.observacao.linhas.map(l => ({
          'O que a educadora anotou': l.rotulo,
          'No começo do período': l.inicio_pct == null ? null : `${l.inicio_pct}% dos encontros`,
          'No fim': l.fim_pct == null ? null : `${l.fim_pct}% dos encontros` }))
      : [] });

  // 6 · fecha o conteúdo no que ainda falta: é o pedido, e é o que dá crédito
  // a tudo o que veio antes.
  b.push({ numero: 6, titulo: 'O que elas sonham — e o que a gente conseguiu oferecer',
    texto: `No Laboratório de Sonhos, ${n.exposicao.aspiracoes_declaradas} crianças disseram o que querem ser quando crescer. `
      + `São ${n.exposicao.areas_com_interesse} áreas diferentes, e a gente conseguiu levar atividade a ${n.exposicao.areas_cobertas} delas: ${n.exposicao.valor}% dos sonhos encontraram alguém para conversar. `
      + (n.exposicao.lacunas.length
          ? `Ainda estão esperando: ${n.exposicao.lacunas.map(l => `${l.rotulo ?? l.area}, com ${l.criancas} crianças`).join('; ')}. `
            + `São meninas e meninos que disseram o que querem ser e ainda não encontraram ninguém daquela área para conhecer. `
            + `A gente conta o que faltou porque é isso que faz o resto deste documento valer alguma coisa.`
          : `Nenhuma área ficou sem atividade neste período.`),
    tabela: n.exposicao.areas.map(a => ({
      'Área do sonho': a.rotulo, 'Crianças': a.criancas, 'Atividades no período': a.atividades,
      'Situação': a.atividades > 0 ? 'teve atividade' : 'ainda esperando' })) });

  b.push({ numero: 7, titulo: 'De onde vêm os números, quanto custou e o que a gente não afirma',
    texto: `Cada número daqui vem do registro do dia a dia, feito pela educadora no fim do encontro — a tabela mostra a origem de cada um e o quanto ele cobre. Nada foi estimado. `
      + (n.custo.valor != null
          ? `Manter esta casa aberta neste período custou ${n.custo.valor_brl}: ${brl(n.custo.por_crianca_unica)} por criança única e ${brl(n.custo.por_matricula)} por matrícula. `
            + `As duas contas aparecem sempre juntas; se a gente publicasse só a segunda, o custo por criança pareceria menor do que ele é. `
          : `O custo deste período ainda não foi fechado. Quando for, as duas contas vão aparecer lado a lado — por criança única (${n.custo.denominador_crianca_unica} crianças) e por matrícula (${n.custo.denominador_matricula}) —, nunca só uma delas. `)
      + `E, para terminar com honestidade: as crianças com mais presença apresentam os avanços descritos aqui, mas nada neste documento separa o que veio do instituto do que veio da escola, da família ou da própria criança. Fatores externos não foram isolados. `
      + `Nenhuma criança aparece sozinha em nenhuma linha: qualquer grupo com menos de ${n.minimo_celula} é reunido a outro ou fica de fora.`,
    tabela: n.fontes.map(f => ({ 'Número': f.indicador, 'De onde vem': f.fonte, 'Quanto cobre': f.cobertura })) });

  return b;
}

const textoCorrido = (blocos) => blocos.map(b => `${b.titulo}\n${b.texto}`).join('\n\n');

// --------------------------------------------------------------------------
// Carta do trimestre — mesmo pipeline, template curto. Uma pagina, um numero,
// um pedido concreto. Para quem doa por Pix e nao vai ler sete blocos.
// --------------------------------------------------------------------------
export function redigirCarta(n) {
  const lac = n.exposicao.lacunas[0] ?? null;
  const porVinculo = capaPorVinculo(n);
  const p = [];
  p.push(`Você ajudou a manter esta casa aberta neste período. Aqui está o que aconteceu dentro dela.`);
  p.push(porVinculo
    ? `${n.permanencia.mais_de_doze_meses} crianças estão no instituto há mais de um ano. No Jardim Ângela, continuar vindo é a coisa mais difícil de conseguir — e é isso que você sustenta.`
    : `Recebemos ${n.cobertura.criancas_unicas} crianças únicas`
      + (n.permanencia.presenca_pct != null ? `, que vieram a ${n.permanencia.presenca_pct}% dos encontros` : '')
      + `. Quantas delas já estão aqui há mais tempo? Esse número não é publicado neste período: são menos de ${n.minimo_celula} crianças, e ele acabaria apontando para elas.`);
  p.push(`Neste período, ${n.exposicao.aspiracoes_declaradas} crianças disseram o que querem ser quando crescer, em ${n.exposicao.areas_com_interesse} áreas; conseguimos levar atividade a ${n.exposicao.areas_cobertas} delas.`
    + (lac ? ` Outras ${lac.criancas} ainda esperam conhecer alguém da área de ${(lac.rotulo ?? lac.area).toLowerCase()}.` : ''));
  p.push(`Nenhuma criança aparece sozinha nestas linhas: grupos com menos de ${n.minimo_celula} crianças são agrupados ou suprimidos antes de qualquer publicação.`);
  p.push(`As crianças que vêm mais apresentam os avanços que você leu aqui. `
    + `Só que a gente não separa o que veio desta casa do que veio da escola e da família: fatores externos não foram isolados.`);
  return [{
    numero: 1, titulo: `Carta do período · ${n.periodo.rotulo}`,
    destaque: porVinculo
      ? `${n.permanencia.mais_de_doze_meses}`
      : (n.permanencia.presenca_pct != null ? `${n.permanencia.presenca_pct}%` : `${n.cobertura.criancas_unicas}`),
    texto: p.join(' '),
  }];
}

// Periodos que a diretoria costuma pedir, calculados sobre o calendario.
// Morava em src/api.js como funcao privada; passou para ca (exportada) porque o
// painel do Passo precisa saber quais periodos existem para dizer qual ainda
// nao tem relatorio publicado — e api.js nao e' lugar de regra de dominio.
export function periodosSugeridos(ref = hoje()) {
  const h = ref;
  const ano = Number(h.slice(0, 4));
  const mes = Number(h.slice(5, 7));
  const semestre = mes <= 6
    ? { rotulo: `1º semestre de ${ano}`, inicio: `${ano}-01-01`, fim: `${ano}-06-30` }
    : { rotulo: `2º semestre de ${ano}`, inicio: `${ano}-07-01`, fim: `${ano}-12-31` };
  const tri = Math.ceil(mes / 3);
  const iniTri = String((tri - 1) * 3 + 1).padStart(2, '0');
  const fimTri = String(tri * 3).padStart(2, '0');
  const ultimoDia = new Date(Date.UTC(ano, tri * 3, 0)).getUTCDate();
  return [
    semestre,
    { rotulo: `${tri}º trimestre de ${ano}`, inicio: `${ano}-${iniTri}-01`, fim: `${ano}-${fimTri}-${ultimoDia}` },
    { rotulo: `Ano de ${ano}`, inicio: `${ano}-01-01`, fim: `${ano}-12-31` },
    { rotulo: 'Últimos 180 dias', inicio: addDias(h, -180), fim: h },
  ];
}

// --------------------------------------------------------------------------
// Geracao, revisao e publicacao.
// --------------------------------------------------------------------------
export async function gerarRelatorio({ tipo = 'ciclo', inicio, fim, custoPeriodo = null }) {
  if (!['ciclo', 'carta'].includes(tipo)) throw erro(422, 'Tipo de relatório inválido.');
  const n = numerosDoPeriodo({ inicio, fim, custoPeriodo });
  const blocos = tipo === 'ciclo' ? redigirRelatorio(n) : redigirCarta(n);

  // O modelo REESCREVE cada bloco, um a um, e cada reescrita atravessa a mesma
  // cadeia: só pode usar números que já estão no bloco determinístico, não pode
  // atribuir nada à criança, e passa pelo revisor de sobre-alegação. Bloco
  // reprovado fica com o texto do template — a mistura é por bloco, e o
  // documento nunca fica pior do que era. A publicação continua sendo ato da
  // diretoria, e ela vê as duas versões lado a lado (decisão 28).
  let algumPeloModelo = false;
  for (const b of blocos) {
    const r = await redigirComModelo({
      sistema: SISTEMA_REDATOR,
      pedido: `Este é um bloco do relatório para quem financia o instituto, correto mas seco.\n\n`
        + `TÍTULO: ${b.titulo}\nTEXTO:\n"""${b.texto}"""\n\n`
        + `Reescreva SÓ o texto (não repita o título) em tom de carta a quem doa: frases curtas, `
        + `palavras do dia a dia, e o que cada número significa para uma criança. Mantenha cada `
        + `número ligado exatamente à mesma coisa a que já está ligado.`,
      fatos: n, determinado: b.texto, revisor: revisarSobreAlegacao, maxTokens: 800,
    });
    b.texto_automatico = b.texto;          // a versão conferida fica guardada
    b.origem = r.origem;
    if (r.origem === 'modelo') { b.texto = r.texto; b.rotulo = r.rotulo; algumPeloModelo = true; }
    else b.motivo = r.motivo;
  }

  const texto = textoCorrido(blocos);
  const rev = revisarSobreAlegacao(texto);
  const periodo = `${inicio}..${fim}`;

  const supressoes = {
    minimo: n.minimo_celula,
    programas: n.cobertura.programas_suprimidos,
    faixas: n.permanencia.faixas_suprimidas,
    areas: n.exposicao.areas_suprimidas,
    lacunas_suprimidas: n.exposicao.lacunas_suprimidas,
    capa_por_vinculo: capaPorVinculo(n),
    dose_publicavel: n.dose.publicavel,
    observacao_publicavel: n.observacao.publicavel,
    blocos_pelo_modelo: blocos.filter(b => b.origem === 'modelo').map(b => b.numero),
    algum_pelo_modelo: algumPeloModelo,
  };

  const existente = get(`SELECT * FROM relatorio WHERE tipo = ? AND periodo = ?`, tipo, periodo);
  if (existente?.status === 'publicado')
    throw erro(422, 'Este relatório já foi publicado. Gere um período novo ou peça a reabertura à diretoria.');

  run(`INSERT INTO relatorio (tipo, periodo, periodo_inicio, periodo_fim, blocos_json, texto,
                              revisor_status, revisor_notas, supressoes_json, status, gerado_em)
       VALUES (?,?,?,?,?,?,?,?,?, 'rascunho', ?)
       ON CONFLICT(tipo, periodo) DO UPDATE SET
         blocos_json=excluded.blocos_json, texto=excluded.texto,
         revisor_status=excluded.revisor_status, revisor_notas=excluded.revisor_notas,
         supressoes_json=excluded.supressoes_json, status='rascunho',
         gerado_em=excluded.gerado_em, publicado_por=NULL, publicado_em=NULL`,
      tipo, periodo, inicio, fim, JSON.stringify({ blocos, numeros: n }), texto,
      rev.status, rev.notas.join(' '), JSON.stringify(supressoes), agora());
  return relatorioDe(tipo, periodo);
}

export function relatorioDe(tipo, periodo) {
  const r = get(`SELECT * FROM relatorio WHERE tipo = ? AND periodo = ?`, tipo, periodo);
  if (!r) return null;
  const { blocos, numeros } = JSON.parse(r.blocos_json);
  return { ...r, blocos, numeros, supressoes: JSON.parse(r.supressoes_json) };
}

export function relatorios() {
  return all(`SELECT id, tipo, periodo, periodo_inicio, periodo_fim, status, revisor_status, gerado_em, publicado_em
                FROM relatorio ORDER BY gerado_em DESC`);
}

export function publicarRelatorio(tipo, periodo, usuarioId) {
  const u = get(`SELECT * FROM educador WHERE id = ?`, usuarioId);
  if (!u) throw erro(404, 'Usuário não encontrado.');
  if (u.papel !== 'diretoria') throw erro(403, 'Somente a diretoria revisa e publica o relatório do ciclo.');
  const r = get(`SELECT * FROM relatorio WHERE tipo = ? AND periodo = ?`, tipo, periodo);
  if (!r) throw erro(404, 'Não há rascunho gerado para este período.');
  if (r.revisor_status !== 'aprovado')
    throw erro(422, 'O revisor de sobre-alegação reprovou o texto. Corrija antes de publicar.');
  run(`UPDATE relatorio SET status='publicado', publicado_por=?, publicado_em=? WHERE id = ?`,
      usuarioId, agora(), r.id);
  return relatorioDe(tipo, periodo);
}

// --------------------------------------------------------------------------
// F15 — consulta em linguagem natural sobre a CAMADA AGREGADA.
//
// Deterministica: casamento de intencao contra uma lista fechada de perguntas
// que o sistema sabe responder com numero vindo de SQL. Quando nao reconhece,
// diz que nao sabe — nunca estima, nunca infere, nunca devolve dado individual.
//
// PRECEDENCIA (corrigido em 03/09/2026). O casamento era "primeira intencao da
// lista que bate", e `contagem` estava em primeiro com o termo 'quantas crianc'.
// Resultado: TODA pergunta que comecasse por "quantas criancas..." caia em
// contagem antes de o assunto ser testado — inclusive "quantas criancas estao em
// risco de sair?", que e' uma das seis perguntas que o proprio sistema SUGERE
// quando nao entende. Ele sugeria uma pergunta que respondia errado.
//
// A correcao nao e' reordenar a lista (continuaria fragil): `contagem` passa a
// ser declarada GENERICA e so' e' considerada quando nenhuma intencao de assunto
// casou. "Quantas criancas" e' formula de contagem, nao assunto; o assunto e'
// "risco de sair", "presenca", "cobertura". O assunto vence a formula, sempre.
// --------------------------------------------------------------------------
const INTENCOES = [
  { codigo: 'contagem', generica: true,
    termos: ['quantas crianc', 'quantos atendid', 'quantas matricul', 'quantos alunos', 'tamanho do instituto', 'quantas pessoas'],
    responder: () => {
      const i = inventario();
      return { resposta: `${i.criancasUnicas} crianças únicas e ${i.matriculas} matrículas ativas. ${i.multi} crianças estão em mais de um programa — é essa a diferença entre os dois números.`,
               fonte: 'tabelas crianca e matricula' };
    } },
  { codigo: 'presenca', termos: ['presenca', 'frequencia', 'comparecimento', 'quantos vieram'],
    responder: () => {
      const p = presencaMedia();
      return { resposta: p.pct == null ? 'Ainda não há presença registrada neste mês.'
                : `A presença média do mês corrente é de ${p.pct}% (${p.presentes} de ${p.total} marcações).`,
               fonte: 'tabela presenca' };
    } },
  { codigo: 'evasao', termos: ['evasao', 'sairam', 'estao saindo', 'risco de sair', 'abandon', 'permanencia', 'tempo de vinculo'],
    responder: () => {
      const r = riscoEvasao({});
      const s = safras().porPrograma;
      return { resposta: `${r.em_risco} matrículas em risco de evasão de ${r.avaliadas} avaliadas (duas ou mais faltas seguidas, ou score acima de ${r.limiar_acao}). `
                 + `Por programa: ${s.map(p => `${p.programa} ${p.evasao_pct}% de evasão, vínculo médio de ${p.meses_medios} meses`).join('; ')}.`,
               fonte: 'score de risco de evasão e análise de safras' };
    } },
  { codigo: 'cobertura', termos: ['cobertura', 'folhas', 'registro em dia', 'quem nao registrou', 'turmas sem registro'],
    responder: () => {
      const c = coberturaRegistro({});
      return { resposta: `A cobertura do registro está em ${c.valor}% (${c.completas} folhas completas de ${c.total} encontros no período). `
                 + `${c.turmas_sem_registro} turma(s) sem nenhuma folha completa. ${c.doutrina}`,
               fonte: 'tabelas encontro e folha' };
    } },
  { codigo: 'exposicao', termos: ['exposic', 'aspirac', 'sonho', 'lacuna', 'area sem atividade', 'laboratorio de sonhos'],
    responder: () => {
      const e = exposicao({});
      return { resposta: `${e.aspiracoes_declaradas} aspirações declaradas em ${e.areas_com_interesse} áreas; ${e.areas_cobertas} tiveram atividade — cobertura de ${e.valor}%. `
                 + (e.lacunas.length ? `Em aberto: ${e.lacunas.map(l => `${l.rotulo} (${l.criancas})`).join('; ')}.` : 'Nenhuma área ficou em aberto.'),
               fonte: 'tabelas aspiracao e atividade_area' };
    } },
  { codigo: 'ciclo', termos: ['ciclo', 'observac', 'rubrica', 'dimens'],
    responder: () => {
      const c = cicloAberto();
      const agg = agregadoPorCiclo();
      const ultimas = agg.series.map(s => `${s.dimensao} ${s.valores.at(-1) ?? '—'}`).join('; ');
      return { resposta: c ? `Ciclo aberto: ${c.nome}, janela até ${dataBR(c.fim)}. Médias de turma no ciclo mais recente — ${ultimas} (escala 1 a 4).`
                            : 'Não há ciclo de observação aberto.',
               fonte: 'tabelas ciclo, observacao e observacao_item' };
    } },
];

export function consultar(pergunta) {
  const t = (pergunta || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!t.trim()) throw erro(422, 'Escreva a pergunta.');
  // Duas passadas: assunto primeiro, formula de contagem depois. Ver a nota de
  // PRECEDENCIA acima — sem isso, 'quantas crianc' engole o assunto da pergunta.
  const casa = i => i.termos.some(termo => t.includes(termo));
  const achada = INTENCOES.find(i => !i.generica && casa(i))
              ?? INTENCOES.find(i => i.generica && casa(i));
  if (!achada) {
    return {
      reconhecida: false,
      resposta: 'Não sei responder isso a partir da camada agregada — e prefiro dizer que não sei a inventar um número.',
      sugestoes: [
        'Quantas crianças o instituto atende?',
        'Como está a presença deste mês?',
        'Quantas crianças estão em risco de sair?',
        'Como está a cobertura do registro?',
        'Quais áreas do Laboratório de Sonhos estão em aberto?',
        'Como está o ciclo de observação?',
      ],
      doutrina: 'A consulta só alcança a camada agregada. Dado individual de criança não é respondido aqui, em nenhuma formulação.',
    };
  }
  const r = achada.responder();
  return { reconhecida: true, intencao: achada.codigo, ...r,
    doutrina: 'Resposta montada com número vindo de SQL. Nenhum valor é estimado, projetado ou inferido.' };
}
