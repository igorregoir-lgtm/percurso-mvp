// Percurso — dados sinteticos.
// Regra 1 do bloco 6 do dossie: nenhum dado real de crianca, em nenhuma etapa.
// Tudo aqui e gerado por PRNG deterministico (mesma semente => mesmo banco),
// para que os testes do fluxo principal sejam reproduziveis.
import { getDb, all, get, run, tx } from './db.js';
import { hoje, agora, addDias, diasEntre, recalcularAlertas } from './domain.js';
import { segundaDa } from './scores.js';

const rand = mulberry32(20261009);
// Segundo gerador SO para a Vivencia terapeutica (turmas 6 e 7, decisao 31):
// ela entrou depois de todos os numeros sinteticos ja documentados, e consumir
// o gerador principal deslocaria a sequencia de tudo o que vem depois dela
// (folhas, pautas, observacoes) — 38% de descarte virava 19%, 10 alertas
// viravam 7. Com o gerador proprio, o mundo anterior fica identico.
const randVivencia = mulberry32(20260829);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (arr, r = rand) => arr[Math.floor(r() * arr.length)];
const intBetween = (a, b, r = rand) => a + Math.floor(r() * (b - a + 1));

const NOMES = ['Ana','Beatriz','Caio','Davi','Enzo','Fernanda','Gabriel','Helena','Igor','Julia','Kaua','Larissa','Miguel','Nina','Otavio','Pedro','Quezia','Rafael','Sofia','Thiago','Ursula','Vitor','Wesley','Yasmin','Zoe','Alice','Bruno','Carla','Diego','Elisa','Felipe','Giovana','Heitor','Isadora','Joao','Kelly','Lucas','Manuela','Nicolas','Olivia','Paulo','Rebeca','Samuel','Tatiane','Valentina','Wanderson','Bianca','Cauan','Daniela','Eduardo','Fabiana','Gustavo','Hellen','Ian','Jamile','Kaique','Luana','Matheus','Natalia','Osvaldo','Priscila','Renan','Sabrina','Tales','Vanessa'];
const SOBRENOMES = ['A.','B.','C.','D.','F.','G.','L.','M.','N.','P.','R.','S.','T.','V.'];
const RESPONSAVEIS = ['Responsável 1','Responsável 2','Responsável 3','Responsável 4','Responsável 5','Responsável 6'];

// Decisão 34 (02/09/2026): as seis dimensões são os seis indicadores da
// planilha socioemocional que o Instituto tem em mãos (Autocontrole,
// Convivência, Participação, Expressão emocional, Autoestima, Resiliência).
// As âncoras continuam em 4 níveis observáveis; a exportação para a planilha
// mapeia 1–4 → 0–2 num único lugar (src/planilha.js). Correspondência com a
// rubrica anterior: INTER→CONV, COOP→AUTOC, AUTO→PART, PERS→RESIL, EXPR igual,
// AUTOEST nova (o padrão da costura: "quis desistir" → resiliência, "nossa, eu
// consegui" → autoestima). Rubricas provisórias até o aval da psicóloga.
const DIMENSOES = [
  { codigo: 'AUTOC', nome: 'Autocontrole', descricao: 'Como a criança regula impulso e reação diante dos combinados, da espera e da frustração.', ancoras: [
    'Reage no impulso (grita, empurra, sai do lugar) na maior parte do encontro, mesmo com lembrete.',
    'Consegue se conter quando a educadora intervém individualmente.',
    'Espera a vez e segue os combinados na maior parte do encontro, sem lembrete.',
    'Regula-se sozinha e ajuda a turma a manter os combinados.'] },
  { codigo: 'CONV', nome: 'Convivência', descricao: 'Como a criança se aproxima, coopera e inclui os colegas nas atividades.', ancoras: [
    'Fica sozinha na maior parte do encontro; não procura os colegas.',
    'Participa quando alguém a chama; raramente toma a iniciativa.',
    'Procura colegas por conta própria e coopera em parte das atividades.',
    'Procura colegas, coopera e inclui quem está de fora nas atividades.'] },
  { codigo: 'PART', nome: 'Participação', descricao: 'Como a criança entra e permanece na atividade proposta.', ancoras: [
    'Só entra na atividade com a educadora ao lado; sai antes do fim.',
    'Entra com insistência; fica até o fim só em parte dos encontros.',
    'Entra por conta própria e fica do começo ao fim na maior parte dos encontros.',
    'Entra, fica do começo ao fim e puxa a atividade com os colegas.'] },
  { codigo: 'EXPR', nome: 'Expressão emocional', descricao: 'Como a criança comunica o que sente durante o encontro.', ancoras: [
    'Não nomeia o que sente; demonstra por reação física (chorar, sair, bater na mesa).',
    'Nomeia o que sente quando a educadora pergunta diretamente.',
    'Nomeia o que sente por conta própria em algumas situações.',
    'Nomeia o que sente e diz do que precisa (pausa, ajuda, conversa).'] },
  { codigo: 'AUTOEST', nome: 'Autoestima', descricao: 'Como a criança se posiciona diante do próprio fazer e do olhar dos outros.', ancoras: [
    'Desqualifica o que faz ("tá feio", "não sei") e evita mostrar; não aceita elogio.',
    'Mostra o que fez quando a educadora pede; aceita elogio com desconforto.',
    'Mostra o que fez por conta própria e reconhece algo bom no próprio trabalho.',
    'Reconhece o que conseguiu, nomeia o que aprendeu e apoia o trabalho dos colegas.'] },
  { codigo: 'RESIL', nome: 'Resiliência', descricao: 'O que a criança faz quando a tarefa fica difícil ou dá errado.', ancoras: [
    'Abandona a tarefa na primeira dificuldade.',
    'Continua se a educadora ficar por perto.',
    'Tenta outra vez sozinha antes de pedir ajuda.',
    'Tenta caminhos diferentes e termina a tarefa mesmo difícil.'] },
];

const GOVERNANCA = [
  { campo: 'presenca', rotulo: 'Presença', base_legal: 'Legítimo interesse (LGPD Art. 7º, IX)', titular: 'Organização', acesso: 'Equipe do programa', retencao: '5 anos', exige_consentimento: 0 },
  { campo: 'rubrica_socioemocional', rotulo: 'Rubrica socioemocional', base_legal: 'Consentimento específico do responsável (LGPD Art. 14)', titular: 'Organização', acesso: 'Educador da criança + coordenação', retencao: 'Enquanto ativa + 2 anos', exige_consentimento: 1 },
  { campo: 'campo_livre', rotulo: 'Campo livre da observação', base_legal: 'Consentimento específico do responsável (LGPD Art. 14)', titular: 'Organização', acesso: 'Educador que registrou', retencao: 'Descarte ao fim do ciclo', exige_consentimento: 1 },
  { campo: 'aspiracao', rotulo: 'Aspiração declarada (Lab. de Sonhos)', base_legal: 'Legítimo interesse — atividade-fim do programa (LGPD Art. 7º, IX)', titular: 'Organização', acesso: 'Equipe do programa', retencao: 'Enquanto ativa', exige_consentimento: 0 },
  { campo: 'folha_do_dia', rotulo: 'Folha do dia (registro da turma)', base_legal: 'Legítimo interesse — execução do programa (LGPD Art. 7º, IX)', titular: 'Organização', acesso: 'Equipe do programa', retencao: '5 anos', exige_consentimento: 0 },
  { campo: 'audio_da_voz', rotulo: 'Áudio da captura por voz', base_legal: 'Não coletado — descartado na transcrição, dentro do navegador', titular: '—', acesso: 'Ninguém', retencao: 'Não persiste em nenhum momento', exige_consentimento: 0 },
  { campo: 'transcricao_da_voz', rotulo: 'Transcrição da captura por voz', base_legal: 'Não coletada — usada em memória e descartada na confirmação', titular: '—', acesso: 'Ninguém', retencao: 'Não persiste em nenhum momento', exige_consentimento: 0 },
  { campo: 'score_evasao', rotulo: 'Score de risco de evasão', base_legal: 'Legítimo interesse — proteção do vínculo (LGPD Art. 7º, IX)', titular: 'Organização', acesso: 'Coordenação e diretoria', retencao: 'Recalculado a cada consulta; não historiado', exige_consentimento: 0 },
  { campo: 'agregado_publicado', rotulo: 'Agregado publicado no relatório', base_legal: 'Legítimo interesse — prestação de contas (LGPD Art. 7º, IX)', titular: 'Organização', acesso: 'Público, após revisão da diretoria', retencao: 'Permanente', exige_consentimento: 0 },
  { campo: 'conteudo_clinico', rotulo: 'Conteúdo clínico', base_legal: 'Fora do sistema por construção — sigilo profissional da psicóloga', titular: 'Psicóloga', acesso: 'Ninguém, no Percurso', retencao: 'Não coletado', exige_consentimento: 1 },
  // Decisão 31 (campo, 29/08/2026): o que a Vivência registra é indicador de
  // programa — procedimento em lista fechada e contagens de grupo. É registro
  // de TURMA, como a folha do dia: sem criança nomeada, sem consentimento.
  { campo: 'registro_de_vivencia', rotulo: 'Registro de vivência (procedimento e check-in de grupo)', base_legal: 'Legítimo interesse — execução do programa (LGPD Art. 7º, IX)', titular: 'Organização', acesso: 'Profissional da turma + coordenação', retencao: '5 anos', exige_consentimento: 0 },
  // Decisão 33: o recado da turma substitui o que já sai hoje para o grupo dos
  // responsáveis (atividade e presença em número). Sem criança nomeada; não
  // persiste — é gerado sob demanda e quem envia é a pessoa.
  // Decisão 32: o parecer para profissional parceiro é o ÚNICO dado que sai
  // identificável por código — atrás de consentimento específico, liberação
  // registrada e revisor. Nasce pendente para toda criança, como a rubrica.
  { campo: 'parecer_profissional', rotulo: 'Parecer a profissional parceiro (por código)', base_legal: 'Consentimento específico do responsável (LGPD Art. 14)', titular: 'Organização', acesso: 'Profissional parceiro nomeado pela coordenação, após liberação', retencao: 'Registro da liberação permanente; o texto é o do parecer liberado', exige_consentimento: 1 },
  { campo: 'recado_da_turma', rotulo: 'Recado da turma aos responsáveis', base_legal: 'Legítimo interesse — comunicação com responsáveis sobre a turma (LGPD Art. 7º, IX)', titular: 'Organização', acesso: 'Responsáveis da turma, pelo grupo que já existe; quem envia é a pessoa', retencao: 'Não persiste — gerado sob demanda, só agregado da turma', exige_consentimento: 0 },
];

export function semear() {
  const db = getDb();
  const T = hoje();

  return tx(() => {
    for (const t of ['importacao','relatorio','pauta','atividade_area','folha_marcador','folha','aspiracao','atividade','sintese','alerta','consentimento','observacao_item','observacao','presenca','encontro','matricula','crianca','turma','programa','ancora','dimensao','ciclo','educador','governanca_campo'])
      db.exec(`DELETE FROM ${t};`);

    for (const g of GOVERNANCA)
      run(`INSERT INTO governanca_campo (campo,rotulo,base_legal,titular,acesso,retencao,exige_consentimento)
           VALUES (?,?,?,?,?,?,?)`, g.campo, g.rotulo, g.base_legal, g.titular, g.acesso, g.retencao, g.exige_consentimento);

    // A psicóloga (papel `profissional`) entrou depois da visita de 29/08/2026:
    // nome SINTÉTICO, como todos os outros — nenhuma pessoa real do Instituto
    // aparece nesta seed.
    run(`INSERT INTO educador (id,nome,apelido,papel) VALUES
         (1,'Maria Silvia','Maria S.','educador'),
         (2,'Rita Amaral','Rita A.','coordenacao'),
         (3,'Cleide Nunes','Cleide N.','educador'),
         (4,'Solange Ribeiro','Solange R.','diretoria'),
         (5,'Carolina Duarte','Carolina D.','profissional')`);

    // `no_escopo` = entra na rubrica por ciclo. A Vivência terapêutica fica
    // FORA da rubrica (o olhar clínico não vira dado — bloco 6) e DENTRO do
    // registro de turma: presença, procedimento e check-in de grupo (decisão 31).
    run(`INSERT INTO programa (id,nome,faixa,cadencia,no_escopo,nota) VALUES
      (1,'Reforço escolar','7 a 11 anos','Segunda a sexta, dois turnos',1,NULL),
      (2,'Laboratório de Sonhos','7 a 11 anos','Sábados',1,NULL),
      (3,'Primeira infância','3 a 5 anos','Segunda a sexta, manhã',1,NULL),
      (4,'Vivência terapêutica','7 a 11 anos','Sábados, manhã e tarde',0,
       'Fora da rubrica por decisão: o registro clínico é da psicóloga e o sigilo profissional impede transferência (bloco 6). Entra no Percurso com presença, registro de vivência e check-in de grupo — indicador de programa, nunca conteúdo clínico (decisão 31).')`);

    // Campo: a turma da manhã tem mais meninos; a da tarde, mais meninas. A seed
    // não registra sexo (não há campo para isso no modelo) — só a existência
    // das duas turmas, com a profissional responsável.
    run(`INSERT INTO turma (id,programa_id,nome,turno,educador_id) VALUES
      (1,1,'Reforço · Tarde A','semana',1),
      (2,1,'Reforço · Tarde B','semana',3),
      (3,2,'Laboratório · Sábado 1','sabado',3),
      (4,2,'Laboratório · Sábado 2','sabado',3),
      (5,3,'Primeira infância · Manhã','semana',3),
      (6,4,'Vivência · Sábado manhã','sabado',5),
      (7,4,'Vivência · Sábado tarde','sabado',5)`);

    const c1i = addDias(T, -165), c1f = addDias(T, -135);
    const c2i = addDias(T, -14),  c2f = addDias(T, 26);
    const mesNome = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
    run(`INSERT INTO ciclo (id,nome,ano,ordem,inicio,fim,status) VALUES (1,?,?,1,?,?,'fechado')`,
        `Ciclo 1 · ${mesNome(c1i)}`, Number(c1i.slice(0, 4)), c1i, c1f);
    run(`INSERT INTO ciclo (id,nome,ano,ordem,inicio,fim,status) VALUES (2,?,?,2,?,?,'aberto')`,
        `Ciclo 2 · ${mesNome(c2i)}`, Number(c2i.slice(0, 4)), c2i, c2f);

    DIMENSOES.forEach((d, i) => {
      run(`INSERT INTO dimensao (id,codigo,nome,descricao,ordem) VALUES (?,?,?,?,?)`, i + 1, d.codigo, d.nome, d.descricao, i + 1);
      d.ancoras.forEach((txt, j) =>
        run(`INSERT INTO ancora (dimensao_id,nivel,texto) VALUES (?,?,?)`, i + 1, j + 1, txt));
    });

    // --- Criancas e matriculas ---------------------------------------------
    // 120 matriculas ativas, 14 criancas em dois programas => 106 criancas unicas.
    // E' exatamente a inconsistencia que o dossie aponta ("60+40+20=120"), resolvida.
    let seq = 0;
    const novaCrianca = (idadeMin, idadeMax, entrada) => {
      seq++;
      const codigo = 'EBZ-' + String(seq).padStart(4, '0');
      const anos = intBetween(idadeMin, idadeMax);
      run(`INSERT INTO crianca (codigo,nome,nascimento,responsavel,ativo,criado_em) VALUES (?,?,?,?,1,?)`,
          codigo, `${pick(NOMES)} ${pick(SOBRENOMES)}`,
          addDias(T, -(anos * 365 + intBetween(0, 364))), pick(RESPONSAVEIS), entrada);
      return get(`SELECT id FROM crianca WHERE codigo = ?`, codigo).id;
    };
    const entradaAleatoria = () => {
      const r = rand();
      return addDias(T, -(r < 0.30 ? intBetween(560, 900) : r < 0.65 ? intBetween(240, 559) : intBetween(40, 239)));
    };
    const matricular = (criancaId, programaId, turmaId, entrada, saida = null) =>
      run(`INSERT INTO matricula (crianca_id,programa_id,turma_id,entrada,saida,status) VALUES (?,?,?,?,?,?)`,
          criancaId, programaId, turmaId, entrada, saida, saida ? 'encerrada' : 'ativa');

    const reforco = [];
    for (let i = 0; i < 40; i++) {
      const entrada = entradaAleatoria();
      const id = novaCrianca(7, 11, entrada);
      matricular(id, 1, i < 20 ? 1 : 2, entrada);
      reforco.push({ id, entrada });
    }
    reforco.slice(0, 14).forEach((c, i) => matricular(c.id, 2, i % 2 === 0 ? 3 : 4, addDias(c.entrada, 20)));
    for (let i = 0; i < 46; i++) {
      const entrada = entradaAleatoria();
      matricular(novaCrianca(7, 11, entrada), 2, i % 2 === 0 ? 3 : 4, entrada);
    }
    for (let i = 0; i < 20; i++) {
      const entrada = entradaAleatoria();
      matricular(novaCrianca(3, 5, entrada), 3, 5, entrada);
    }
    // Vivência terapêutica (decisão 31): 24 crianças que JÁ estão no Laboratório
    // de Sonhos, 12 por turma de sábado. Não muda os 120 nem as 106 únicas —
    // é matrícula adicional, como no dossiê, cujos 120 não incluem a vivência.
    const doLabParaVivencia = all(
      `SELECT crianca_id, entrada FROM matricula WHERE programa_id = 2 AND status='ativa'
        ORDER BY crianca_id LIMIT 24`);
    doLabParaVivencia.forEach((m, i) => matricular(m.crianca_id, 4, i < 12 ? 6 : 7, m.entrada));
    // Criancas que sairam — dao sinal de evasao para as safras (F6).
    // A duracao e' limitada ao que ja' passou: sem o teto, entrada + duracao
    // caia depois de hoje e a seed produzia matricula ENCERRADA com data de
    // saida no futuro. Passou despercebido enquanto nenhuma tela mostrava a
    // saida; a tela de arquivo (decisao 30) mostra, e "saiu em 29/10/2026"
    // num 25/08/2026 e' dado errado, nao detalhe de apresentacao.
    for (let i = 0; i < 26; i++) {
      const entrada = addDias(T, -intBetween(300, 900));
      const id = novaCrianca(7, 11, entrada);
      run(`UPDATE crianca SET ativo = 0 WHERE id = ?`, id);
      const duracao = Math.max(1, Math.min(intBetween(45, 400), diasEntre(entrada, T)));
      matricular(id, rand() < 0.5 ? 1 : 2, null, entrada, addDias(entrada, duracao));
    }

    // --- Consentimentos ------------------------------------------------------
    const ativas = all(`SELECT DISTINCT crianca_id FROM matricula WHERE status='ativa'`).map(r => r.crianca_id);
    const tardeA = all(`SELECT crianca_id FROM matricula WHERE turma_id = 1 AND status='ativa' ORDER BY crianca_id`).map(r => r.crianca_id);
    // Um consentimento pendente fica na turma da persona; os demais em outras
    // turmas, para o painel de consentimentos ter volume.
    const bloqueadaConsent = tardeA[6];
    const pendentes = new Set([bloqueadaConsent, ativas[52], ativas[74], ativas[88]]);
    for (const id of ativas) {
      const st = pendentes.has(id) ? 'pendente' : 'ativo';
      for (const campo of ['rubrica_socioemocional', 'campo_livre']) {
        run(`INSERT INTO consentimento (crianca_id,campo,status,responsavel,data_registro) VALUES (?,?,?,?,?)`,
            id, campo, st, st === 'ativo' ? pick(RESPONSAVEIS) : null,
            st === 'ativo' ? addDias(T, -intBetween(30, 400)) : null);
      }
      // Decisao 32: compartilhar com profissional parceiro e' OUTRO pedido ao
      // responsavel — nasce pendente para toda crianca, sem consumir o gerador
      // (senao a sequencia sintetica documentada deslocava inteira).
      run(`INSERT INTO consentimento (crianca_id,campo,status,responsavel,data_registro) VALUES (?,?,'pendente',NULL,NULL)`,
          id, 'parecer_profissional');
    }

    // Aspiracao declarada — a metodologia do Laboratorio de Sonhos (bloco 3 do
    // dossie): a crianca nomeia o que quer ser. ~75% das criancas do Laboratorio
    // tem aspiracao declarada; quem nao declara e' levada a ampliar repertorio.
    // As areas usam o MESMO vocabulario fechado da folha do dia (src/voz.js) —
    // sem isso o score de exposicao compararia macas com laranjas.
    // Peso deliberado em `saude`: e' a area que fica em lacuna na demonstracao.
    const AREAS_ASPIRACAO = ['saude','saude','saude','educacao','educacao','esporte','esporte','artes','tecnologia','outra'];
    const doLab = all(`SELECT DISTINCT crianca_id FROM matricula WHERE programa_id = 2 AND status='ativa'`);
    for (const r of doLab) {
      if (rand() < 0.78)
        run(`INSERT INTO aspiracao (crianca_id, area, declarada_em) VALUES (?,?,?)
             ON CONFLICT(crianca_id, area) DO NOTHING`,
            r.crianca_id, pick(AREAS_ASPIRACAO), addDias(T, -intBetween(60, 300)));
    }

    // Uma matricula recente na Tarde A: bloqueada por janela minima de convivio.
    // Precisa ser crianca de UM programa so — quem tambem esta no Laboratorio
    // acumula convivio por la e nao ficaria bloqueada.
    const soReforco = tardeA.filter(id =>
      get(`SELECT COUNT(*) n FROM matricula WHERE crianca_id = ? AND status='ativa'`, id).n === 1);
    const recente = soReforco.at(-1);
    run(`UPDATE matricula SET entrada = ? WHERE crianca_id = ? AND turma_id = 1`, addDias(T, -10), recente);

    // --- Encontros e presenca (F2) ------------------------------------------
    // A persona parou de registrar ha 7 dias — a Tarde A tem datas em aberto.
    // Perfil de presenca com cauda baixa DE PROPOSITO: sem criancas de dose
    // baixa o bloco 4 do relatorio nunca sai do estado suprimido, e o score de
    // evasao nao teria contra o que comparar. ~10% frequentam menos de 60%.
    const perfil = new Map(ativas.map(id => {
      const r = rand();
      return [id, r < 0.10 ? 0.38 + rand() * 0.20 : r < 0.30 ? 0.60 + rand() * 0.18 : 0.78 + rand() * 0.19];
    }));
    const ultimoRegistro = { 1: addDias(T, -7), 2: T, 3: T, 4: T, 5: T, 6: T, 7: T };
    for (const t of all(`SELECT * FROM turma`)) {
      const alunos = all(`SELECT crianca_id, entrada FROM matricula WHERE turma_id = ? AND status='ativa'`, t.id);
      if (!alunos.length) continue;
      const rnd = t.programa_id === 4 ? randVivencia : rand;
      let dia = addDias(T, -75);
      while (dia <= ultimoRegistro[t.id]) {
        const dow = new Date(dia + 'T12:00:00Z').getUTCDay();
        if (t.turno === 'sabado' ? dow === 6 : dow >= 1 && dow <= 5) {
          run(`INSERT INTO encontro (turma_id,data,registrado_por,registrado_em,duracao_segundos) VALUES (?,?,?,?,?)`,
              t.id, dia, t.educador_id, dia + 'T17:10:00.000Z',
              // maioria dentro da meta de 2 min; ~15% estoura — da grafico honesto
              rnd() < 0.85 ? intBetween(28, 110, rnd) : intBetween(125, 200, rnd));
          const encId = get(`SELECT id FROM encontro WHERE turma_id=? AND data=?`, t.id, dia).id;
          for (const a of alunos) {
            if (a.entrada > dia) continue;
            run(`INSERT INTO presenca (encontro_id,crianca_id,status) VALUES (?,?,?)`,
                encId, a.crianca_id, rnd() < (perfil.get(a.crianca_id) ?? 0.85) ? 'P' : 'F');
          }
        }
        dia = addDias(dia, 1);
      }
    }

    // Criancas com ausencias consecutivas — alimentam o alerta (F6) e o score
    // de risco de evasao (F8). Tres delas ficam na turma da persona, que e' o
    // numero que a pauta de segunda mostra na demonstracao.
    // As faltas sao forcadas DENTRO DA TURMA: o score de evasao le a serie da
    // matricula, entao marcar falta no sabado do Laboratorio nao criaria streak
    // no Reforco. Sem esse cuidado o dado sintetico nao exercita o score.
    for (const [id, turmaAlvo, faltas] of
         [[tardeA[2], 1, 4], [tardeA[9], 1, 3], [tardeA[15], 1, 2], [ativas[41], null, 4], [ativas[70], null, 3]]) {
      const tid = turmaAlvo ?? get(
        `SELECT turma_id FROM matricula WHERE crianca_id = ? AND status='ativa' AND turma_id IS NOT NULL LIMIT 1`, id)?.turma_id;
      if (!tid) continue;
      for (const u of all(`SELECT p.id FROM presenca p JOIN encontro e ON e.id = p.encontro_id
                            WHERE p.crianca_id = ? AND e.turma_id = ? ORDER BY e.data DESC LIMIT ?`, id, tid, faltas))
        run(`UPDATE presenca SET status='F' WHERE id = ?`, u.id);
    }

    // Régua de presença do Instituto (75%, decisão 33): na Vivência da manhã,
    // uma criança fica claramente abaixo da régua e outra na faixa de atenção,
    // para a tela ter as três faixas e a coordenação ter com quem conversar.
    {
      const manha = all(`SELECT crianca_id FROM matricula WHERE turma_id = 6 AND status='ativa' ORDER BY crianca_id`);
      const alvoAbaixo = manha[3]?.crianca_id, alvoAtencao = manha[7]?.crianca_id;
      const pres = (id) => all(`SELECT p.id FROM presenca p JOIN encontro e ON e.id = p.encontro_id
                                 WHERE p.crianca_id = ? AND e.turma_id = 6 ORDER BY e.data`, id);
      if (alvoAbaixo) pres(alvoAbaixo).forEach((p, i) => run(`UPDATE presenca SET status = ? WHERE id = ?`, i % 5 < 3 ? 'F' : 'P', p.id));
      if (alvoAtencao) pres(alvoAtencao).forEach((p, i) => run(`UPDATE presenca SET status = ? WHERE id = ?`, i % 9 === 0 || i % 9 === 4 ? 'F' : 'P', p.id));
    }

    // --- Folha do dia, exposicao e pauta (v2) --------------------------------
    // A folha e' da TURMA. Nenhum campo aqui fala de crianca nomeada.
    // A turma 4 fica DELIBERADAMENTE sem folha nenhuma: e' a "turma sem registro"
    // que a cobertura da coordenacao precisa mostrar para ser util.
    const ATIVIDADES_SEED = ['roda','brincadeira','leitura','desenho','musica','parque'];
    // `saude` esta fora de proposito: e' a area com aspiracao declarada e ZERO
    // atividade, a lacuna que a pauta de segunda e o relatorio publicam.
    const AREAS_SEED = ['educacao','educacao','esporte','artes','tecnologia','outra','nenhuma'];
    const MARCADORES_SEED = ['colaborou','participou','agitado','disperso','alegre','cansado'];
    // Vivencia (decisao 31): os procedimentos que a visita mostrou — o jogo da
    // rede de apoio, a roda sobre regulacao/sistema nervoso, a oficina de costura.
    const PROCEDIMENTOS_SEED = ['rede_apoio','regulacao','roda_emocoes','historia','oficina','jogo_cooperativo'];
    const OBJETIVO_DO_PROCEDIMENTO = { rede_apoio: 'rede_apoio_cidadania', regulacao: 'regulacao_emocional',
      roda_emocoes: 'expressao', historia: 'expressao', oficina: 'autoestima', jogo_cooperativo: 'convivencia' };

    for (const t of all(`SELECT * FROM turma`)) {
      if (t.id === 4) continue;
      const rnd = t.programa_id === 4 ? randVivencia : rand;
      const pk = (arr) => pick(arr, rnd);
      const encs = all(`SELECT id, data FROM encontro WHERE turma_id = ? ORDER BY data`, t.id);
      encs.forEach((e, i) => {
        if (rnd() > 0.82) return;                       // ~18% de encontros sem folha
        const porVoz = rnd() < 0.35;
        const area = pk(AREAS_SEED);
        const marcs = [...new Set([pk(MARCADORES_SEED), pk(MARCADORES_SEED)])];
        // Taxa de correcao alvo ~20%: um extrator lexical que acertasse tudo
        // seria implausivel, e a metrica so serve se for honesta.
        const editados = porVoz ? (rnd() < 0.45 ? 0 : rnd() < 0.75 ? 1 : rnd() < 0.92 ? 2 : 3) : 0;
        // Check-in de grupo (decisao 31) em TODA folha, sempre pelo gerador da
        // vivencia: contagens de turma coerentes com os presentes do dia, sem
        // deslocar a sequencia principal. Na vivencia, procedimento e objetivo.
        const presentesDia = get(`SELECT COUNT(*) n FROM presenca WHERE encontro_id = ? AND status='P'`, e.id).n;
        const conflitos = intBetween(0, 2, randVivencia);
        const ehVivencia = t.programa_id === 4;
        const proc = ehVivencia ? pick(PROCEDIMENTOS_SEED, randVivencia) : null;
        run(`INSERT INTO folha (encontro_id, atividade, area_tematica, pediram_ajuda, origem,
                                confianca, campos_sugeridos, campos_editados, conteudo_excluido,
                                procedimento, objetivo, ajudaram_sem_pedir, participaram_inteiro,
                                conflitos, conflitos_resolvidos_conversando, nao_observados,
                                relato_liberado_por, relato_liberado_em,
                                confirmado_por, confirmado_em, status)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            e.id, pk(ATIVIDADES_SEED), area, intBetween(0, 5, rnd), porVoz ? 'voz' : 'manual',
            porVoz ? Math.round((0.62 + rnd() * 0.36) * 100) / 100 : null,
            porVoz ? 4 : 0, editados,
            porVoz && rnd() < 0.06 ? 1 : 0,
            proc, ehVivencia ? OBJETIVO_DO_PROCEDIMENTO[proc] : null,
            intBetween(0, Math.min(4, presentesDia), randVivencia),
            Math.max(0, presentesDia - intBetween(0, 3, randVivencia)),
            conflitos, intBetween(0, conflitos, randVivencia), intBetween(0, 1, randVivencia),
            // Relatos anteriores da vivencia ja' liberados; o mais recente fica em rascunho.
            ehVivencia && i < encs.length - 1 ? 5 : null,
            ehVivencia && i < encs.length - 1 ? e.data + 'T18:00:00.000Z' : null,
            t.educador_id ?? 1, e.data + 'T17:20:00.000Z',
            i === encs.length - 1 ? 'aberta' : 'fechada');
        const fid = get(`SELECT id FROM folha WHERE encontro_id = ?`, e.id).id;
        for (const m of marcs) run(`INSERT INTO folha_marcador (folha_id, marcador) VALUES (?,?)`, fid, m);
        if (area !== 'nenhuma')
          run(`INSERT INTO atividade_area (turma_id, area, data, origem) VALUES (?,?,?, 'folha')`, t.id, area, e.data);
      });
    }
    // Historico de decisao da pauta — o descarte e' o dado de qualidade do agente.
    for (const turmaId of [1, 2]) {
      for (let semanas = 8; semanas >= 1; semanas--) {
        const seg = segundaDa(addDias(T, -semanas * 7));
        const descartada = rand() < 0.26;                // taxa de descarte alvo ~26%
        run(`INSERT INTO pauta (turma_id, semana, sugestao_codigo, sugestao_titulo, decisao, decidido_por, decidido_em)
             VALUES (?,?,?,?,?,?,?) ON CONFLICT(turma_id, semana) DO NOTHING`,
            turmaId, seg, 'EXP-SAUDE', 'Roda de conversa sobre profissões de cuidado',
            descartada ? 'descartada' : 'aceita', turmaId === 1 ? 1 : 3, seg + 'T09:00:00.000Z');
      }
    }

    // --- Observacoes (F3/F5) -------------------------------------------------
    // Vies deliberado para que 5 das 6 dimensoes subam e "Expressao emocional"
    // fique como a menor media — o padrao que a leitura de ciclo deve revelar.
    // Resiliencia recua de leve: e' a que a leitura da planilha tem que apontar.
    const base  = { AUTOC: 2.6,  CONV: 2.7,  PART: 2.4,  EXPR: 1.9,  AUTOEST: 2.3,  RESIL: 2.3 };
    const delta = { AUTOC: 0.30, CONV: 0.35, PART: 0.28, EXPR: 0.18, AUTOEST: 0.22, RESIL: -0.05 };
    const dims = all(`SELECT * FROM dimensao ORDER BY ordem`);
    // A dose entra no avanco: crianca que frequenta mais avanca um pouco mais.
    // E' uma premissa do MUNDO SINTETICO, declarada aqui — nao um achado. O
    // bloco 4 do relatorio publica a comparacao sempre com a caixa de limites.
    const nivelDe = (cod, ciclo, dose = 1) =>
      Math.max(1, Math.min(4, Math.round(
        base[cod] + (ciclo === 2 ? delta[cod] * dose : 0) + (rand() - 0.5) * 1.6)));

    const gravaObs = (cicloId, criancaId, educadorId, status) => {
      const ts = new Date().toISOString();
      run(`INSERT INTO observacao (ciclo_id,crianca_id,educador_id,status,nota_livre,atualizado_em,concluido_em)
           VALUES (?,?,?,?,NULL,?,?)`,
          cicloId, criancaId, educadorId, status, ts, status === 'concluida' ? ts : null);
      const oid = get(`SELECT id FROM observacao WHERE ciclo_id=? AND crianca_id=?`, cicloId, criancaId).id;
      // dose: 0,3 para quem frequenta ~40%; ~1,4 para quem frequenta ~97%.
      const dose = Math.max(0.3, ((perfil.get(criancaId) ?? 0.85) - 0.35) / 0.45);
      dims.slice(0, status === 'concluida' ? dims.length : 3).forEach(d =>
        run(`INSERT INTO observacao_item (observacao_id,dimensao_id,nivel) VALUES (?,?,?)`,
            oid, d.id, nivelDe(d.codigo, cicloId, dose)));
    };
    const educadorDa = (criancaId) =>
      get(`SELECT t.educador_id AS e FROM matricula m JOIN turma t ON t.id = m.turma_id
            WHERE m.crianca_id = ? AND m.status='ativa' LIMIT 1`, criancaId)?.e ?? 1;

    const observaveis = ativas.filter(id => !pendentes.has(id));
    for (const id of observaveis) if (rand() < 0.90) gravaObs(1, id, educadorDa(id), 'concluida');

    const tardeASet = new Set(tardeA);
    for (const id of observaveis) {
      if (tardeASet.has(id) || id === recente) continue;   // a turma da persona vem abaixo
      if (rand() < 0.68) gravaObs(2, id, educadorDa(id), 'concluida');
    }
    // Turma da persona no ciclo 2: 18 observaveis, 16 concluidas, 1 rascunho, 1 intacta.
    const alvoPersona = tardeA.filter(id => id !== recente && !pendentes.has(id));
    alvoPersona.slice(0, 16).forEach(id => gravaObs(2, id, 1, 'concluida'));
    if (alvoPersona[16]) gravaObs(2, alvoPersona[16], 1, 'rascunho');

    // --- Atividade da persona: lapso de 7 dias (anti-abandono) --------------
    for (let d = 60; d >= 7; d--) {
      const dia = addDias(T, -d);
      const dow = new Date(dia + 'T12:00:00Z').getUTCDay();
      if (dow >= 1 && dow <= 5) run(`INSERT INTO atividade (educador_id,data,tipo) VALUES (1,?,'chamada')`, dia);
    }
    run(`INSERT INTO atividade (educador_id,data,tipo) VALUES (2,?,'painel')`, addDias(T, -1));
    // A profissional registra aos sábados: o último sábado passado fica marcado,
    // para ela não abrir o app em "lapso" logo na primeira semana.
    {
      let s = addDias(T, -1);
      while (new Date(s + 'T12:00:00Z').getUTCDay() !== 6) s = addDias(s, -1);
      for (let k = 0; k < 6; k++)
        run(`INSERT INTO atividade (educador_id,data,tipo) VALUES (5,?,'chamada')`, addDias(s, -7 * k));
    }

    // Os alertas de ausencia ja nascem calculados: a coordenacao abre o painel
    // no dia 1 e ve as criancas em risco, sem depender de uma chamada nova.
    recalcularAlertas();

    return resumo();
  });
}

export function resumo() {
  return {
    criancas: get(`SELECT COUNT(*) n FROM crianca`).n,
    criancas_ativas: get(`SELECT COUNT(DISTINCT crianca_id) n FROM matricula WHERE status='ativa'`).n,
    matriculas_ativas: get(`SELECT COUNT(*) n FROM matricula WHERE status='ativa'`).n,
    encontros: get(`SELECT COUNT(*) n FROM encontro`).n,
    presencas: get(`SELECT COUNT(*) n FROM presenca`).n,
    observacoes: get(`SELECT COUNT(*) n FROM observacao`).n,
    consentimentos_pendentes: get(`SELECT COUNT(*) n FROM consentimento WHERE campo='rubrica_socioemocional' AND status='pendente'`).n,
    folhas: get(`SELECT COUNT(*) n FROM folha`).n,
    folhas_por_voz: get(`SELECT COUNT(*) n FROM folha WHERE origem='voz'`).n,
    aspiracoes: get(`SELECT COUNT(*) n FROM aspiracao`).n,
    atividades_por_area: get(`SELECT COUNT(*) n FROM atividade_area`).n,
    pautas_decididas: get(`SELECT COUNT(*) n FROM pauta WHERE decisao IS NOT NULL`).n,
  };
}
