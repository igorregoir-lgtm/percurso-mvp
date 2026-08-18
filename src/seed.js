// Percurso — dados sinteticos.
// Regra 1 do bloco 6 do dossie: nenhum dado real de crianca, em nenhuma etapa.
// Tudo aqui e gerado por PRNG deterministico (mesma semente => mesmo banco),
// para que os testes do fluxo principal sejam reproduziveis.
import { getDb, all, get, run, tx } from './db.js';
import { hoje, addDias, recalcularAlertas } from './domain.js';

const rand = mulberry32(20261009);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const intBetween = (a, b) => a + Math.floor(rand() * (b - a + 1));

const NOMES = ['Ana','Beatriz','Caio','Davi','Enzo','Fernanda','Gabriel','Helena','Igor','Julia','Kaua','Larissa','Miguel','Nina','Otavio','Pedro','Quezia','Rafael','Sofia','Thiago','Ursula','Vitor','Wesley','Yasmin','Zoe','Alice','Bruno','Carla','Diego','Elisa','Felipe','Giovana','Heitor','Isadora','Joao','Kelly','Lucas','Manuela','Nicolas','Olivia','Paulo','Rebeca','Samuel','Tatiane','Valentina','Wanderson','Bianca','Cauan','Daniela','Eduardo','Fabiana','Gustavo','Hellen','Ian','Jamile','Kaique','Luana','Matheus','Natalia','Osvaldo','Priscila','Renan','Sabrina','Tales','Vanessa'];
const SOBRENOMES = ['A.','B.','C.','D.','F.','G.','L.','M.','N.','P.','R.','S.','T.','V.'];
const RESPONSAVEIS = ['Responsável 1','Responsável 2','Responsável 3','Responsável 4','Responsável 5','Responsável 6'];

const DIMENSOES = [
  { codigo: 'INTER', nome: 'Interação com colegas', descricao: 'Como a criança se aproxima e se mantém junto dos colegas nas atividades.', ancoras: [
    'Fica sozinha na maior parte do encontro; não procura os colegas.',
    'Participa quando alguém a chama; raramente toma a iniciativa.',
    'Procura colegas por conta própria em parte das atividades.',
    'Procura colegas e inclui quem está de fora nas atividades.'] },
  { codigo: 'COOP', nome: 'Cooperação e combinados', descricao: 'Como a criança lida com os combinados coletivos da turma.', ancoras: [
    'Não segue os combinados da turma, mesmo com lembrete.',
    'Segue os combinados quando lembrada individualmente.',
    'Segue os combinados na maior parte do encontro, sem lembrete.',
    'Segue os combinados e ajuda a turma a lembrar deles.'] },
  { codigo: 'EXPR', nome: 'Expressão emocional', descricao: 'Como a criança comunica o que sente durante o encontro.', ancoras: [
    'Não nomeia o que sente; demonstra por reação física (chorar, sair, bater na mesa).',
    'Nomeia o que sente quando a educadora pergunta diretamente.',
    'Nomeia o que sente por conta própria em algumas situações.',
    'Nomeia o que sente e diz do que precisa (pausa, ajuda, conversa).'] },
  { codigo: 'AUTO', nome: 'Autonomia na tarefa', descricao: 'Como a criança começa e conduz a atividade proposta.', ancoras: [
    'Só inicia a tarefa com a educadora ao lado.',
    'Inicia com instrução repetida; pede ajuda a cada passo.',
    'Inicia sozinha e pede ajuda em pontos específicos.',
    'Inicia, organiza o próprio material e busca ajuda depois de já ter tentado.'] },
  { codigo: 'PERS', nome: 'Persistência diante da dificuldade', descricao: 'O que a criança faz quando a tarefa fica difícil.', ancoras: [
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
  { campo: 'conteudo_clinico', rotulo: 'Conteúdo clínico', base_legal: 'Fora do sistema por construção — sigilo profissional da psicóloga', titular: 'Psicóloga', acesso: 'Ninguém, no Percurso', retencao: 'Não coletado', exige_consentimento: 1 },
];

export function semear() {
  const db = getDb();
  const T = hoje();

  return tx(() => {
    for (const t of ['atividade','sintese','alerta','consentimento','observacao_item','observacao','presenca','encontro','matricula','crianca','turma','programa','ancora','dimensao','ciclo','educador','governanca_campo'])
      db.exec(`DELETE FROM ${t};`);

    for (const g of GOVERNANCA)
      run(`INSERT INTO governanca_campo (campo,rotulo,base_legal,titular,acesso,retencao,exige_consentimento)
           VALUES (?,?,?,?,?,?,?)`, g.campo, g.rotulo, g.base_legal, g.titular, g.acesso, g.retencao, g.exige_consentimento);

    run(`INSERT INTO educador (id,nome,apelido,papel) VALUES
         (1,'Maria Silvia','Maria S.','educador'),
         (2,'Rita Amaral','Rita A.','coordenacao'),
         (3,'Cleide Nunes','Cleide N.','educador')`);

    run(`INSERT INTO programa (id,nome,faixa,cadencia,no_escopo,nota) VALUES
      (1,'Reforço escolar','7 a 11 anos','Segunda a sexta, dois turnos',1,NULL),
      (2,'Laboratório de Sonhos','7 a 11 anos','Sábados',1,NULL),
      (3,'Primeira infância','3 a 5 anos','Segunda a sexta, manhã',1,NULL),
      (4,'Vivência terapêutica','7 a 11 anos','Sábados de manhã',0,
       'Fora do Percurso por construção: o registro é clínico, a titular é a psicóloga e o sigilo profissional impede transferência (bloco 6 do dossiê).')`);

    run(`INSERT INTO turma (id,programa_id,nome,turno,educador_id) VALUES
      (1,1,'Reforço · Tarde A','semana',1),
      (2,1,'Reforço · Tarde B','semana',3),
      (3,2,'Laboratório · Sábado 1','sabado',3),
      (4,2,'Laboratório · Sábado 2','sabado',3),
      (5,3,'Primeira infância · Manhã','semana',3)`);

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
    // Criancas que sairam — dao sinal de evasao para as safras (F6)
    for (let i = 0; i < 26; i++) {
      const entrada = addDias(T, -intBetween(300, 900));
      const id = novaCrianca(7, 11, entrada);
      run(`UPDATE crianca SET ativo = 0 WHERE id = ?`, id);
      matricular(id, rand() < 0.5 ? 1 : 2, null, entrada, addDias(entrada, intBetween(45, 400)));
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
    }

    // Aspiracao declarada — a metodologia do Laboratorio de Sonhos (bloco 3 do
    // dossie): a crianca nomeia o que quer ser. ~75% das criancas do Laboratorio
    // tem aspiracao declarada; quem nao declara e' levada a ampliar repertorio.
    const AREAS = ['Saúde', 'Tecnologia', 'Artes', 'Esportes', 'Educação', 'Meio Ambiente', 'Direito', 'Gastronomia'];
    const doLab = all(`SELECT DISTINCT crianca_id FROM matricula WHERE programa_id = 2 AND status='ativa'`);
    for (const r of doLab) {
      if (rand() < 0.75) run(`UPDATE crianca SET aspiracao = ? WHERE id = ?`, pick(AREAS), r.crianca_id);
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
    const perfil = new Map(ativas.map(id => [id, 0.72 + rand() * 0.25]));
    const ultimoRegistro = { 1: addDias(T, -7), 2: T, 3: T, 4: T, 5: T };
    for (const t of all(`SELECT * FROM turma`)) {
      const alunos = all(`SELECT crianca_id, entrada FROM matricula WHERE turma_id = ? AND status='ativa'`, t.id);
      if (!alunos.length) continue;
      let dia = addDias(T, -75);
      while (dia <= ultimoRegistro[t.id]) {
        const dow = new Date(dia + 'T12:00:00Z').getUTCDay();
        if (t.turno === 'sabado' ? dow === 6 : dow >= 1 && dow <= 5) {
          run(`INSERT INTO encontro (turma_id,data,registrado_por,registrado_em,duracao_segundos) VALUES (?,?,?,?,?)`,
              t.id, dia, t.educador_id, dia + 'T17:10:00.000Z',
              // maioria dentro da meta de 2 min; ~15% estoura — da grafico honesto
              rand() < 0.85 ? intBetween(28, 110) : intBetween(125, 200));
          const encId = get(`SELECT id FROM encontro WHERE turma_id=? AND data=?`, t.id, dia).id;
          for (const a of alunos) {
            if (a.entrada > dia) continue;
            run(`INSERT INTO presenca (encontro_id,crianca_id,status) VALUES (?,?,?)`,
                encId, a.crianca_id, rand() < (perfil.get(a.crianca_id) ?? 0.85) ? 'P' : 'F');
          }
        }
        dia = addDias(dia, 1);
      }
    }

    // Criancas com ausencias consecutivas — alimentam o alerta (F6).
    for (const id of [tardeA[2], tardeA[9], ativas[41], ativas[70]]) {
      for (const u of all(`SELECT p.id FROM presenca p JOIN encontro e ON e.id = p.encontro_id
                            WHERE p.crianca_id = ? ORDER BY e.data DESC LIMIT 4`, id))
        run(`UPDATE presenca SET status='F' WHERE id = ?`, u.id);
    }

    // --- Observacoes (F3/F5) -------------------------------------------------
    // Vies deliberado para que 4 das 5 dimensoes subam e "Expressao emocional"
    // fique como a menor media — o padrao que a leitura de ciclo deve revelar.
    const base  = { INTER: 2.7,  COOP: 2.6,  EXPR: 1.9,  AUTO: 2.4,  PERS: 2.3 };
    const delta = { INTER: 0.35, COOP: 0.30, EXPR: 0.18, AUTO: 0.28, PERS: -0.05 };
    const dims = all(`SELECT * FROM dimensao ORDER BY ordem`);
    const nivelDe = (cod, ciclo) =>
      Math.max(1, Math.min(4, Math.round(base[cod] + (ciclo === 2 ? delta[cod] : 0) + (rand() - 0.5) * 1.6)));

    const gravaObs = (cicloId, criancaId, educadorId, status) => {
      const ts = new Date().toISOString();
      run(`INSERT INTO observacao (ciclo_id,crianca_id,educador_id,status,nota_livre,atualizado_em,concluido_em)
           VALUES (?,?,?,?,NULL,?,?)`,
          cicloId, criancaId, educadorId, status, ts, status === 'concluida' ? ts : null);
      const oid = get(`SELECT id FROM observacao WHERE ciclo_id=? AND crianca_id=?`, cicloId, criancaId).id;
      dims.slice(0, status === 'concluida' ? dims.length : 3).forEach(d =>
        run(`INSERT INTO observacao_item (observacao_id,dimensao_id,nivel) VALUES (?,?,?)`,
            oid, d.id, nivelDe(d.codigo, cicloId)));
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
  };
}
