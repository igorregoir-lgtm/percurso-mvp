// Percurso — testes unitários das regras críticas de domínio.
// Roda sem servidor, contra um banco temporário descartável:
//   node scripts/unit-test.mjs
// Complementa o smoke test (scripts/smoke-test.mjs): aqui as invariantes de
// proteção são exercitadas direto na função, sem passar pela camada HTTP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// O banco de teste vive em um diretório temporário — nunca toca data/percurso.db.
const dirTemp = mkdtempSync(join(tmpdir(), 'percurso-unit-'));
process.env.PERCURSO_DB = join(dirTemp, 'unit.db');

const D = await import('../src/domain.js');
const { semear } = await import('../src/seed.js');
const { all, get, run, closeDb } = await import('../src/db.js');
const V = await import('../src/voz.js');
const S = await import('../src/scores.js');
const R = await import('../src/relatorio.js');
const G = await import('../src/ingestao.js');
const { criarFila, CHAVE } = await import('../public/fila.js');

semear();

process.on('exit', () => {
  try { closeDb(); rmSync(dirTemp, { recursive: true, force: true }); } catch {}
});

// ---------------------------------------------------------------------------
// Filtro de perímetro (bloco 6) — nada clínico chega ao banco.
// ---------------------------------------------------------------------------
test('filtrarPerimetro: barra frase clínica e preserva o restante', () => {
  const f = D.filtrarPerimetro(
    'Participou bem da roda. A mãe contou que ele foi diagnosticado com depressão. Terminou sozinho.');
  assert.equal(f.bloqueado, true);
  assert.equal(f.trechos.length, 1);
  assert.equal(f.trechos[0].categoria, 'saúde mental / diagnóstico');
  assert.doesNotMatch(f.limpo, /depress/i);
  assert.match(f.limpo, /roda/i);
  assert.match(f.limpo, /sozinho/i);
});

test('filtrarPerimetro: cobre as quatro categorias do perímetro', () => {
  const casos = [
    ['Está fazendo terapia semanal.', 'saúde mental / diagnóstico'],
    ['O pai está preso desde o ano passado.', 'vida íntima e familiar'],
    ['Sofreu agressão no caminho.', 'violência / proteção'],
    ['Ficou internado no hospital.', 'saúde física / corpo'],
  ];
  for (const [texto, categoria] of casos) {
    const f = D.filtrarPerimetro(texto);
    assert.equal(f.bloqueado, true, `deveria bloquear: ${texto}`);
    assert.equal(f.trechos[0].categoria, categoria);
  }
});

test('filtrarPerimetro: texto benigno passa intacto', () => {
  const f = D.filtrarPerimetro('Começou a puxar conversa na roda de leitura. Terminou a tarefa sozinho.');
  assert.equal(f.bloqueado, false);
  assert.equal(f.trechos.length, 0);
});

test('filtrarPerimetro: texto vazio ou nulo não quebra', () => {
  assert.deepEqual(D.filtrarPerimetro(''), { limpo: '', bloqueado: false, trechos: [] });
  assert.deepEqual(D.filtrarPerimetro(null), { limpo: '', bloqueado: false, trechos: [] });
});

test('filtrarPerimetro: limite declarado — paráfrase sem termo da lista passa', () => {
  // Documenta o limite registrado em DECISOES-TECNICAS.md §5: o filtro é por
  // termo, não por sentido. Se este teste passar a falhar, o filtro evoluiu
  // e a decisão técnica precisa ser atualizada junto.
  const f = D.filtrarPerimetro('A situação na casa dela anda muito complicada ultimamente.');
  assert.equal(f.bloqueado, false);
});

// ---------------------------------------------------------------------------
// Revisor de sobre-alegação (F7) — linguagem como artefato metodológico.
// ---------------------------------------------------------------------------
const RESSALVA = 'Fatores externos não foram isolados.';

test('revisarSobreAlegacao: verbo causal forte reprova', () => {
  const r = D.revisarSobreAlegacao(`O programa gerou os avanços observados. ${RESSALVA}`);
  assert.equal(r.status, 'reprovado');
  assert.match(r.notas.join(' '), /gerou/);
});

test('revisarSobreAlegacao: sem a ressalva metodológica reprova', () => {
  const r = D.revisarSobreAlegacao('Os dados sugerem que os programas contribuíram para os avanços.');
  assert.equal(r.status, 'reprovado');
  assert.match(r.notas.join(' '), /ressalva/i);
});

test('revisarSobreAlegacao: texto contido com ressalva aprova', () => {
  // Formulação de associação, como o 06-AGENTES-IA prescreve: "crianças com
  // maior presença apresentam", nunca "o programa causou" — nem "contribuiu".
  const r = D.revisarSobreAlegacao(
    `Crianças com maior presença apresentam os avanços descritos. A leitura é de associação: fatores externos não foram isolados.`);
  assert.equal(r.status, 'aprovado');
  assert.deepEqual(r.notas, []);
});

test('redigirSintese: o template fechado sempre passa no próprio revisor', () => {
  const ciclo = get(`SELECT id FROM ciclo WHERE status='aberto'`);
  const n = D.numerosDoCiclo(ciclo.id);
  const texto = D.redigirSintese(n);
  assert.equal(D.revisarSobreAlegacao(texto).status, 'aprovado');
  // Os números do texto vêm do SQL, nunca de geração livre.
  assert.ok(texto.includes(String(n.observadas)));
  assert.ok(texto.includes(`${n.cobertura_pct}%`));
});

// ---------------------------------------------------------------------------
// Consentimento e elegibilidade (F1/F3 · LGPD Art. 14).
// ---------------------------------------------------------------------------
test('elegibilidade: consentimento pendente bloqueia com motivo explícito', () => {
  const ciclo = get(`SELECT id FROM ciclo WHERE status='aberto'`);
  const pendente = get(
    `SELECT crianca_id FROM consentimento WHERE campo='rubrica_socioemocional' AND status='pendente' LIMIT 1`);
  const el = D.elegibilidade(pendente.crianca_id, ciclo.id);
  assert.equal(el.pode, false);
  assert.equal(el.motivo, 'consentimento');
});

test('elegibilidade: registrar e revogar consentimento abre e fecha o campo', () => {
  const ciclo = get(`SELECT id FROM ciclo WHERE status='aberto'`);
  const pendente = get(
    `SELECT co.crianca_id FROM consentimento co
       JOIN presenca p ON p.crianca_id = co.crianca_id
      WHERE co.campo='rubrica_socioemocional' AND co.status='pendente'
      GROUP BY co.crianca_id HAVING SUM(p.status='P') >= 4 LIMIT 1`);
  assert.ok(pendente, 'seed precisa ter criança pendente com convívio suficiente');

  D.registrarConsentimento(pendente.crianca_id, 'rubrica_socioemocional', 'ativo', 'Responsável Teste');
  assert.equal(D.elegibilidade(pendente.crianca_id, ciclo.id).pode, true);

  D.registrarConsentimento(pendente.crianca_id, 'rubrica_socioemocional', 'revogado', null);
  const depois = D.elegibilidade(pendente.crianca_id, ciclo.id);
  assert.equal(depois.pode, false);
  assert.equal(depois.motivo, 'consentimento');
});

test('registrarConsentimento: ativar sem nomear o responsável é recusado (422)', () => {
  const c = get(`SELECT id FROM crianca LIMIT 1`);
  assert.throws(
    () => D.registrarConsentimento(c.id, 'rubrica_socioemocional', 'ativo', '  '),
    (e) => e.status === 422);
});

// ---------------------------------------------------------------------------
// Gravação da observação — o filtro roda ANTES do INSERT.
// ---------------------------------------------------------------------------
test('salvarObservacao: o olhar não aceita texto sobre a criança (v2)', () => {
  const ciclo = get(`SELECT id FROM ciclo WHERE status='aberto'`);
  const alvo = get(
    `SELECT co.crianca_id FROM consentimento co
       JOIN presenca p ON p.crianca_id = co.crianca_id
      WHERE co.campo='rubrica_socioemocional' AND co.status='ativo'
        AND co.crianca_id NOT IN (SELECT crianca_id FROM observacao WHERE ciclo_id = ${ciclo.id})
      GROUP BY co.crianca_id HAVING SUM(p.status='P') >= 4 LIMIT 1`);
  assert.ok(alvo, 'seed precisa ter criança observável sem observação no ciclo aberto');
  const itens = D.rubrica().map(d => ({ dimensao_id: d.id, nivel: 3 }));

  // Texto sobre a crianca e' recusado com encaminhamento humano — e nada grava.
  assert.throws(
    () => D.salvarObservacao({ cicloId: ciclo.id, criancaId: alvo.crianca_id, educadorId: 1, itens,
                               notaLivre: 'Está tomando remédio controlado.', concluir: true }),
    (e) => e.status === 422 && e.extra.motivo === 'campo_livre_removido');
  assert.equal(get(`SELECT COUNT(*) n FROM observacao WHERE ciclo_id=? AND crianca_id=?`,
                   ciclo.id, alvo.crianca_id).n, 0);

  // Sem texto, a rubrica grava normalmente e a coluna fica NULL.
  const r = D.salvarObservacao({ cicloId: ciclo.id, criancaId: alvo.crianca_id, educadorId: 1, itens, concluir: true });
  assert.equal(r.status, 'concluida');
  assert.equal(get(`SELECT nota_livre FROM observacao WHERE ciclo_id=? AND crianca_id=?`,
                   ciclo.id, alvo.crianca_id).nota_livre, null);
});


test('salvarObservacao: ciclo fechado não aceita observação nova', () => {
  const fechado = get(`SELECT id FROM ciclo WHERE status='fechado' LIMIT 1`);
  const c = get(`SELECT crianca_id FROM matricula WHERE status='ativa' LIMIT 1`);
  assert.throws(
    () => D.salvarObservacao({ cicloId: fechado.id, criancaId: c.crianca_id, educadorId: 1, itens: [], concluir: false }),
    (e) => e.status === 422);
});

test('salvarObservacao: nível fora da escala 1–4 é recusado', () => {
  const ciclo = get(`SELECT id FROM ciclo WHERE status='aberto'`);
  const alvo = get(
    `SELECT co.crianca_id FROM consentimento co
       JOIN presenca p ON p.crianca_id = co.crianca_id
      WHERE co.campo='rubrica_socioemocional' AND co.status='ativo'
      GROUP BY co.crianca_id HAVING SUM(p.status='P') >= 4 LIMIT 1`);
  const dim = get(`SELECT id FROM dimensao LIMIT 1`);
  assert.throws(
    () => D.salvarObservacao({ cicloId: ciclo.id, criancaId: alvo.crianca_id, educadorId: 1,
                               itens: [{ dimensao_id: dim.id, nivel: 9 }], concluir: false }),
    (e) => e.status === 422);
});

// ---------------------------------------------------------------------------
// Supressão de célula pequena (n < 5) — anti-reidentificação.
// ---------------------------------------------------------------------------
test('agregadoPorCiclo: nenhuma média circula com n abaixo do mínimo', () => {
  for (const escopo of [{}, { programaId: 1 }, { turmaId: 1 }]) {
    const agg = D.agregadoPorCiclo(escopo);
    for (const s of agg.series) {
      s.valores.forEach((v, i) => {
        if (v != null) assert.ok(s.n[i] >= D.PARAMS.MINIMO_CELULA,
          `média exposta com n=${s.n[i]} em ${s.dimensao} (escopo ${JSON.stringify(escopo)})`);
      });
    }
  }
});

test('agregadoPorCiclo: célula pequena real é suprimida (não arredondada)', () => {
  // Turma sintética mínima: 2 crianças observadas em um ciclo => média não circula.
  run(`INSERT INTO turma (id, programa_id, nome, turno, educador_id) VALUES (99, 1, 'Turma Teste n<5', 'semana', 1)`);
  const criancas = [];
  for (let i = 0; i < 2; i++) {
    run(`INSERT INTO crianca (codigo, nome, nascimento, responsavel, ativo, criado_em)
         VALUES ('TST-${i}', 'Teste ${i}', '2018-01-01', 'Responsável T', 1, '2026-01-01')`);
    const id = get(`SELECT id FROM crianca WHERE codigo = 'TST-${i}'`).id;
    run(`INSERT INTO matricula (crianca_id, programa_id, turma_id, entrada, status)
         VALUES (?, 1, 99, '2026-01-01', 'ativa')`, id);
    criancas.push(id);
  }
  const ciclo = get(`SELECT id FROM ciclo WHERE status='aberto'`);
  const dims = D.rubrica();
  for (const cid of criancas) {
    run(`INSERT INTO observacao (ciclo_id, crianca_id, educador_id, status, atualizado_em, concluido_em)
         VALUES (?, ?, 1, 'concluida', datetime('now'), datetime('now'))`, ciclo.id, cid);
    const oid = get(`SELECT id FROM observacao WHERE ciclo_id=? AND crianca_id=?`, ciclo.id, cid).id;
    for (const d of dims) run(`INSERT INTO observacao_item (observacao_id, dimensao_id, nivel) VALUES (?,?,4)`, oid, d.id);
  }
  const agg = D.agregadoPorCiclo({ turmaId: 99 });
  assert.ok(agg.suprimidas > 0, 'a célula pequena deveria ter sido suprimida');
  for (const s of agg.series) for (const v of s.valores) assert.equal(v, null);
});

// ---------------------------------------------------------------------------
// Síntese aprovada é imutável até reabertura.
// ---------------------------------------------------------------------------
test('gerarSintese: síntese aprovada não é sobrescrita', () => {
  const ciclo = get(`SELECT id FROM ciclo WHERE status='aberto'`);
  D.gerarSintese(ciclo.id, null);
  D.aprovarSintese(ciclo.id, null, 2);           // Rita (coordenação)
  assert.throws(() => D.gerarSintese(ciclo.id, null), (e) => e.status === 422);
});

test('aprovarSintese: educadora não aprova (403)', () => {
  const ciclo = get(`SELECT id FROM ciclo WHERE status='aberto'`);
  assert.throws(() => D.aprovarSintese(ciclo.id, null, 1), (e) => e.status === 403);
});

// ---------------------------------------------------------------------------
// Datas — a decisão técnica nº 10 (data local, não UTC).
// ---------------------------------------------------------------------------
test('utilitários de data: addDias e diasEntre são consistentes', () => {
  assert.equal(D.addDias('2026-08-22', 10), '2026-09-01');
  assert.equal(D.addDias('2026-12-31', 1), '2027-01-01');
  assert.equal(D.diasEntre('2026-08-01', '2026-08-22'), 21);
  assert.match(D.hoje(), /^\d{4}-\d{2}-\d{2}$/);
});

// ---------------------------------------------------------------------------
// v2 — extrator, scores, supressão, ingestão e consulta.
// (o fecho de ciclo vem por último: ele muda qual ciclo está aberto)
// ---------------------------------------------------------------------------
test('validarExtracao: só aceita o schema fechado', () => {
  const bom = { atividade: 'roda', area_tematica: 'saude', marcadores_turma: ['alegre'],
                pediram_ajuda: 2, confianca: 0.8, conteudo_excluido: false };
  assert.equal(V.validarExtracao(bom).valido, true);

  const fora = V.validarExtracao({ ...bom, atividade: 'festa_junina' });
  assert.equal(fora.valido, false);
  assert.match(fora.erros.join(' '), /lista fechada/);

  assert.equal(V.validarExtracao({ ...bom, marcadores_turma: ['a', 'b', 'c', 'd', 'e'] }).valido, false);
  assert.equal(V.validarExtracao({ ...bom, marcadores_turma: ['alegre', 'alegre'] }).valido, false);
  assert.equal(V.validarExtracao({ ...bom, pediram_ajuda: 2.5 }).valido, false);
  assert.equal(V.validarExtracao({ ...bom, pediram_ajuda: 99 }).valido, false);
  assert.equal(V.validarExtracao({ ...bom, confianca: 1.4 }).valido, false);
  assert.equal(V.validarExtracao({ ...bom, conteudo_excluido: 'sim' }).valido, false);
});

test('extrairDaFala: mesma fala, mesma saída (determinístico e auditável)', () => {
  const fala = 'Fizemos leitura no pátio, a turma colaborou e ficou cansada. Duas crianças pediram ajuda.';
  const a = V.extrairDaFala(fala, []).extracao;
  const b = V.extrairDaFala(fala, []).extracao;
  assert.deepEqual(a, b);
  assert.equal(a.atividade, 'leitura');
  assert.equal(a.pediram_ajuda, 2);
  assert.ok(a.marcadores_turma.includes('colaborou'));
  assert.equal(V.validarExtracao(a).valido, true);
});

test('extrairDaFala: a lista de exclusão barra antes de extrair, e o resto sobrevive', () => {
  const { extracao, perimetro } = V.extrairDaFala(
    'A turma desenhou bastante e ficou alegre. O pai da Bia está preso desde março.', ['Bia S.']);
  assert.equal(extracao.conteudo_excluido, true);
  assert.equal(perimetro.trechos.length, 1);
  assert.match(perimetro.trechos[0].categoria, /vida íntima/);
  assert.doesNotMatch(JSON.stringify(extracao), /preso|Bia/i);
  assert.equal(extracao.atividade, 'desenho');
});

test('extrairDaFala: abaixo do piso de confiança nada é pré-marcado', () => {
  const { extracao } = V.extrairDaFala('hum, tanto faz', []);
  assert.ok(extracao.confianca < D.PARAMS.CONFIANCA_MINIMA);
  assert.equal(extracao.atividade, 'nao_identificada');
  assert.equal(extracao.area_tematica, 'nenhuma');
  assert.deepEqual(extracao.marcadores_turma, []);
  assert.equal(extracao.pediram_ajuda, 0);
});

test('extrairDaFala: falta só entra com nome da turma e verbo explícito', () => {
  const nomes = ['Ana Clara', 'Pedro Henrique'];
  assert.deepEqual(V.extrairDaFala('A turma fez uma roda muito boa e alegre.', nomes).extracao.faltas_mencionadas, []);
  const com = V.extrairDaFala('Fizemos roda e a turma participou. A Ana Clara faltou hoje.', nomes).extracao;
  assert.deepEqual(com.faltas_mencionadas, ['Ana Clara']);
});

test('suprimir: recorte pequeno é agrupado, não apagado em silêncio', () => {
  const grupos = [
    { rotulo: 'Reforço', criancas: 40 }, { rotulo: 'Laboratório', criancas: 60 },
    { rotulo: 'Vivência', criancas: 3 }, { rotulo: 'Piloto', criancas: 4 },
  ];
  const r = S.suprimir(grupos, { minimo: 5, rotulo: 'Demais programas' });
  assert.equal(r.publicaveis.length, 3);
  const agrupado = r.publicaveis.at(-1);
  assert.equal(agrupado.rotulo, 'Demais programas');
  assert.equal(agrupado.criancas, 7);        // 3 + 4
  assert.equal(agrupado.agrupa, 2);
  assert.deepEqual(r.suprimidos, ['Vivência', 'Piloto']);
  // Nenhum recorte publicavel abaixo do minimo.
  assert.ok(r.publicaveis.every(g => g.criancas >= 5));
});

test('suprimir: se nem o agrupado passa do mínimo, ele não é publicado', () => {
  const r = S.suprimir([{ rotulo: 'A', criancas: 9 }, { rotulo: 'B', criancas: 2 }], { minimo: 5 });
  assert.equal(r.publicaveis.length, 1);
  assert.equal(r.agrupado, null);
  assert.deepEqual(r.suprimidos, ['B']);
});

test('riscoEvasao: duas faltas seguidas colocam a matrícula na lista', () => {
  const m = get(`SELECT m.id FROM matricula m WHERE m.status='ativa' AND m.turma_id IS NOT NULL LIMIT 1`);
  const crianca = get(`SELECT crianca_id FROM matricula WHERE id = ?`, m.id).crianca_id;
  // Fixture CONTROLADA: as duas últimas presenças viram falta e a terceira vira
  // presença. Sem fixar a terceira, o teste dependia de a criança não ter falta
  // natural ali — passava por sorte e quebrava quando o seed mudava.
  const enc = all(`SELECT e.id FROM encontro e
                     JOIN matricula m ON m.turma_id = e.turma_id
                    WHERE m.id = ? ORDER BY e.data DESC LIMIT 3`, m.id);
  const marcar = (encontroId, status) =>
    run(`INSERT INTO presenca (encontro_id, crianca_id, status) VALUES (?,?,?)
         ON CONFLICT(encontro_id, crianca_id) DO UPDATE SET status=excluded.status`,
        encontroId, crianca, status);
  marcar(enc[0].id, 'F'); marcar(enc[1].id, 'F'); marcar(enc[2].id, 'P');

  const r = S.riscoEvasaoDe(m.id);
  assert.equal(r.consecutivas, 2);
  // A regra de acao e' o campo `alerta`, nao o valor: duas faltas seguidas
  // entram na lista mesmo com score abaixo do limiar de 60.
  assert.equal(r.alerta, true);
  assert.match(r.motivo, /2 faltas seguidas/);
  assert.ok(r.valor > 0 && r.valor <= 100);
});

test('riscoEvasao: o valor discrimina em vez de saturar em 100', () => {
  const r = S.riscoEvasao({});
  const valores = new Set(r.linhas.map(l => l.valor));
  assert.ok(r.linhas.length >= 3, 'a base sintética precisa de mais de duas matrículas em risco');
  assert.ok(valores.size > 1, `todos os scores iguais (${[...valores]}) — a coluna não informaria nada`);
  assert.ok(r.linhas.every(l => l.valor >= 0 && l.valor <= 100));
});

test('riscoEvasao: compara a criança com a linha de base dela, não com a turma', () => {
  const r = S.riscoEvasao({});
  assert.ok(r.linhas.every(l => typeof l.linha_de_base_pct === 'number' && typeof l.recente_pct === 'number'));
  assert.equal(r.escopo, 'matrícula');
  // Nenhum score socioemocional individual é devolvido em lugar nenhum.
  assert.ok(r.linhas.every(l => !('socioemocional' in l) && !('nivel' in l)));
});

test('coberturaRegistro: folha em branco não conta como registro', () => {
  const enc = get(`SELECT e.id, e.turma_id, e.data FROM encontro e
                    LEFT JOIN folha f ON f.encontro_id = e.id WHERE f.id IS NULL LIMIT 1`);
  const antes = S.coberturaRegistro({ turmaId: enc.turma_id, desde: '2000-01-01' });
  // Folha sem atividade identificada e sem marcador: existe, mas nao e' registro.
  run(`INSERT INTO folha (encontro_id, atividade, area_tematica, pediram_ajuda, origem,
                          confirmado_por, confirmado_em, status)
       VALUES (?, 'nao_identificada', 'nenhuma', 0, 'manual', 1, ?, 'aberta')`, enc.id, D.agora());
  const depois = S.coberturaRegistro({ turmaId: enc.turma_id, desde: '2000-01-01' });
  assert.equal(depois.completas, antes.completas);
});

test('exposicao: área com interessadas e zero atividades vira lacuna nomeada', () => {
  const e = S.exposicao({});
  assert.ok(e.lacunas.length > 0, 'a base sintética precisa ter ao menos uma lacuna');
  assert.ok(e.lacunas.every(l => l.criancas > 0 && l.atividades === 0));
  assert.ok(e.maior_lacuna.rotulo.length > 0);
  assert.ok(e.valor >= 0 && e.valor <= 100);
});

test('segundaDa: qualquer dia da semana resolve para a segunda-feira dela', () => {
  assert.equal(S.segundaDa('2026-08-22'), '2026-08-17');   // sábado
  assert.equal(S.segundaDa('2026-08-17'), '2026-08-17');   // segunda
  assert.equal(S.segundaDa('2026-08-23'), '2026-08-17');   // domingo -> semana que passou
});

test('estadoDoRegistro: o rótulo descreve o registro, nunca a criança', () => {
  const linhas = S.estadoDoRegistro(1);
  assert.ok(linhas.length > 0);
  for (const l of linhas) {
    assert.match(l.rotulo, /registro em dia|sem registro há \d+ encontro/);
    assert.doesNotMatch(l.rotulo, /acompanhamento|caminhando|quieta/i);
  }
});

test('lerCsv: aspas, ponto e vírgula, BOM e CRLF', () => {
  const { cabecalho, linhas } = G.lerCsv('\ufeffNome;Data\r\n"Silva; Ana";05/02/2024\r\n');
  assert.deepEqual(cabecalho, ['Nome', 'Data']);
  assert.deepEqual(linhas, [['Silva; Ana', '05/02/2024']]);
});

test('chaveDeCrianca: três grafias do mesmo nome geram a mesma chave', () => {
  const k = (n) => G.chaveDeCrianca(n, '2016-03-12');
  assert.equal(k('Ana Clara Souza'), k('ANA  CLARA'));
  assert.equal(k('Ana Clara Souza'), k('ana clara s.'));
  assert.notEqual(k('Ana Clara'), G.chaveDeCrianca('Ana Clara', '2015-03-12'));
  assert.notEqual(k('Ana Clara'), k('Beatriz Clara'));
});

// ---------------------------------------------------------------------------
// Fila offline (F1) — o aceite do pack diz "sem conexão, com sincronização
// confirmada ao voltar a rede". Testado sem navegador, com armazenamento e
// envio injetados.
// ---------------------------------------------------------------------------
function memoria() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), clear: () => m.clear() };
}
const erroDeRede = () => Object.assign(new Error('sem conexão'), { rede: true });

test('fila: falha de REDE enfileira e nada se perde', async () => {
  const store = memoria();
  const f = criarFila({ armazenamento: store, enviar: async () => { throw erroDeRede(); }, agora: () => '2026-08-22T10:00:00Z' });
  const r = await f.enfileirar('/api/chamada', { turma_id: 1 }, 'Chamada');
  assert.equal(r.enviado, false);
  assert.equal(f.tamanho(), 1);
  assert.deepEqual(f.ler()[0].corpo, { turma_id: 1 });
  assert.ok(JSON.parse(store.getItem(CHAVE)).length === 1, 'a fila persiste no armazenamento do aparelho');
});

test('fila: erro de REGRA (4xx) propaga e NÃO entra na fila', async () => {
  const f = criarFila({
    armazenamento: memoria(),
    enviar: async () => { throw Object.assign(new Error('Chamada incompleta.'), { status: 422 }); },
  });
  await assert.rejects(() => f.enfileirar('/api/chamada', {}, 'Chamada'), /Chamada incompleta/);
  assert.equal(f.tamanho(), 0, 'enfileirar um 422 faria o app tentar para sempre o que nunca pode gravar');
});

test('fila: ao voltar a rede, drenar envia tudo e esvazia', async () => {
  const store = memoria();
  let online = false;
  const enviados = [];
  const f = criarFila({
    armazenamento: store,
    enviar: async (c, corpo) => { if (!online) throw erroDeRede(); enviados.push([c, corpo]); },
  });
  await f.enfileirar('/api/chamada', { d: 1 }, 'Chamada');
  await f.enfileirar('/api/folha', { d: 2 }, 'Folha');
  assert.equal(f.tamanho(), 2);

  online = true;
  const r = await f.drenar();
  assert.equal(r.enviados, 2);
  assert.equal(r.restantes, 0);
  assert.equal(f.tamanho(), 0);
  assert.deepEqual(enviados.map(([c]) => c), ['/api/chamada', '/api/folha']);
});

test('fila: item recusado por regra na drenagem sai da fila e é reportado', async () => {
  let modo = 'offline';
  const f = criarFila({
    armazenamento: memoria(),
    enviar: async (c) => {
      if (modo === 'offline') throw erroDeRede();
      if (c === '/api/ruim') throw Object.assign(new Error('Turma inválida.'), { status: 422 });
      throw erroDeRede();                    // o outro continua sem rede
    },
  });
  await f.enfileirar('/api/bom', { a: 1 }, 'Bom');
  await f.enfileirar('/api/ruim', { a: 2 }, 'Ruim');
  assert.equal(f.tamanho(), 2);

  modo = 'online-parcial';
  const r = await f.drenar();
  assert.equal(r.restantes, 1, 'o que falhou por rede continua na fila');
  assert.equal(r.recusados.length, 1, 'o que falhou por regra sai da fila e volta para a tela avisar');
  assert.equal(r.recusados[0].rotulo, 'Ruim');
  assert.equal(f.ler()[0].rotulo, 'Bom');
});

test('fila: drenar com fila vazia não faz nada', async () => {
  const f = criarFila({ armazenamento: memoria(), enviar: async () => { throw new Error('não deveria enviar'); } });
  assert.deepEqual(await f.drenar(), { enviados: 0, restantes: 0, recusados: [] });
});

test('consultar: sobre criança individual, o sistema diz que não sabe', () => {
  const r = R.consultar('a Ana Clara está bem?');
  assert.equal(r.reconhecida, false);
  assert.match(r.resposta, /não sei responder/i);
  assert.ok(r.sugestoes.length >= 4);
  const c = R.consultar('quantas crianças o instituto atende?');
  assert.equal(c.reconhecida, true);
  assert.ok(c.fonte);
  assert.throws(() => R.consultar('  '), (e) => e.status === 422);
});

test('relatório: o revisor barra verbo causal e exige a ressalva', () => {
  assert.equal(D.revisarSobreAlegacao('O programa causou avanço.').status, 'reprovado');
  assert.equal(D.revisarSobreAlegacao(
    'Crianças com maior presença apresentam avanço; fatores externos não foram isolados.').status, 'aprovado');
});

test('revisor: borda de palavra, não substring (achado A-09)', () => {
  // Antes o termo era `gera ` com espaço: "…gera." no fim de frase passava.
  assert.equal(D.revisarSobreAlegacao('O programa gera. Fatores externos não foram isolados.').status, 'reprovado');
  assert.equal(D.revisarSobreAlegacao('Graças ao instituto tudo melhorou; fatores externos não foram isolados.').status, 'reprovado');
  assert.equal(D.revisarSobreAlegacao('Por causa do programa; fatores externos não foram isolados.').status, 'reprovado');
  assert.equal(D.revisarSobreAlegacao('O impacto foi grande; fatores externos não foram isolados.').status, 'reprovado');
  // E não pode gerar falso positivo dentro de outra palavra.
  assert.equal(D.revisarSobreAlegacao(
    'A geração de dados melhorou; fatores externos não foram isolados.').status, 'aprovado');
  assert.equal(D.revisarSobreAlegacao(
    'Houve causalidade reversa? Fatores externos não foram isolados.').status, 'aprovado');
  // O disclaimer do bloco de dose não pode reprovar o próprio relatório.
  assert.equal(D.revisarSobreAlegacao(
    'A leitura é de associação e não estabelece relação causal; fatores externos não foram isolados.').status, 'aprovado');
});

test('revisor: "contribuiu para" é atribuição causal e reprova (achado E-02)', () => {
  const antigo = 'Os dados sugerem que os programas contribuíram para os avanços observados; fatores externos não foram isolados.';
  assert.equal(D.revisarSobreAlegacao(antigo).status, 'reprovado',
    'este era o texto do próprio template, e o revisor o aprovava');
  assert.equal(D.revisarSobreAlegacao(
    'Crianças com maior presença apresentam os avanços descritos. A leitura é de associação: fatores externos não foram isolados.'
  ).status, 'aprovado');
});

test('perímetro: termo acentuado casa (achado SRV-04)', () => {
  const f = D.filtrarPerimetro('A turma desenhou. Ele contou que sofre violência em casa.');
  assert.equal(f.bloqueado, true, '"violência" é a palavra que dá nome à categoria e passava batido');
  assert.match(f.trechos[0].categoria, /violência/);
  assert.match(f.trechos[0].trecho, /violência/, 'o trecho volta com o acento original para a tela');
  assert.doesNotMatch(f.limpo, /violência/);
  for (const t of ['A mãe tem depressão.', 'Sofreu agressão.', 'Está de luto.', 'Foi internado no hospital.'])
    assert.equal(D.filtrarPerimetro(t).bloqueado, true, t);
});

test('ingestão: sentinela de nascimento desconhecido não entra na chave (achado SRV-02)', () => {
  assert.equal(G.chaveDeCrianca('Ana Clara', null), G.chaveDeCrianca('Ana Clara', G.NASCIMENTO_DESCONHECIDO));
  assert.notEqual(G.chaveDeCrianca('Ana Clara', '2016-03-12'), G.chaveDeCrianca('Ana Clara', null));
});

test('coberturaRegistro: turma que parou de registrar continua no painel (achado SRV-05)', () => {
  const turmas = all(`SELECT COUNT(*) AS n FROM turma`)[0].n;
  const c = S.coberturaRegistro({ desde: '2000-01-01' });
  assert.equal(c.turmas.length, turmas, 'o universo são as turmas, não os encontros');
  // Uma turma sem nenhum encontro na janela precisa aparecer com 0, não sumir.
  const vazia = S.coberturaRegistro({ desde: '1990-01-01', ref: '1990-06-01' });
  assert.equal(vazia.turmas.length, turmas);
  assert.equal(vazia.turmas_sem_registro, turmas);
});

test('perímetro: categoria 5 exige nome da turma E estado interno (rodada 2)', () => {
  const nomes = ['Quezia M.', 'Igor M.', 'Ana Clara'];
  // Nome + estado interno na mesma frase: barra.
  const b = D.filtrarPerimetro('A Quezia está muito triste.', nomes);
  assert.equal(b.bloqueado, true);
  assert.equal(b.trechos[0].categoria, 'estado psíquico de criança nomeada');
  // Estado interno SEM nome de criança: passa — é observação de grupo.
  assert.equal(D.filtrarPerimetro('A turma toda estava meio triste hoje.', nomes).bloqueado, false);
  // Nome SEM afirmação de estado interno: passa — é comportamento observado.
  assert.equal(D.filtrarPerimetro('A Ana Clara participou bastante da roda.', nomes).bloqueado, false);
  // Sem a lista de nomes, a categoria 5 não dispara (não há como saber quem é criança).
  assert.equal(D.filtrarPerimetro('A Quezia está muito triste.').bloqueado, false);
});

test('perímetro: "saúde" como ÁREA passa; saúde de criança barra (rodada 2)', () => {
  // Bloquear "saúde" solto quebraria o score de exposição, cuja área é Saúde.
  assert.equal(D.filtrarPerimetro('Fizemos uma roda de conversa sobre saúde.').bloqueado, false);
  assert.equal(D.filtrarPerimetro('A saúde dela não anda boa.').bloqueado, true);
  assert.equal(D.filtrarPerimetro('O pai está na prisão.').bloqueado, true);
  assert.equal(D.filtrarPerimetro('Os conselhos tutelares foram acionados.').bloqueado, true);
  assert.equal(D.filtrarPerimetro('A situação familiar dela é difícil.').bloqueado, true);
});

test('ingestão: sem nascimento, grafias incompatíveis NÃO se fundem (rodada 2)', () => {
  assert.equal(G.grafiasCompativeis('Ana Clara', 'Ana Clara Souza'), true);
  assert.equal(G.grafiasCompativeis('ana clara s.', 'Ana Clara Souza'), true);
  assert.equal(G.grafiasCompativeis('Ana Souza', 'Ana Ferreira'), false);

  const csv = 'nome,data,presenca\nAna Souza,05/03/2024,P\nAna Ferreira,05/03/2024,P';
  const r = G.importarPlanilha({ csv, origem: 't.csv', turmaId: 1, simular: true });
  assert.equal(r.criancas_no_arquivo, 2, 'fundir duas pessoas é pior que duplicar uma');
  assert.equal(r.colisoes.length, 1);
  assert.deepEqual(r.colisoes[0].separados, ['Ana Souza', 'Ana Ferreira']);

  // O aceite de F7 continua valendo: com data, três grafias viram uma criança.
  const comData = ['Nome;Nascimento;Dia;Presença',
    'Ana Clara Souza;12/03/2016;05/02/2024;P', 'ANA  CLARA;12/03/2016;12/02/2024;1',
    'ana clara s.;12/03/2016;19/02/2024;sim'].join('\n');
  const f7 = G.importarPlanilha({ csv: comData, origem: 't.csv', turmaId: 1, simular: true });
  assert.equal(f7.criancas_no_arquivo, 1);
  assert.equal(f7.duplicatas_resolvidas[0].grafias.length, 3);
});

test('carta: a manchete de vínculo obedece ao mínimo de célula (rodada 2)', () => {
  const base = {
    minimo_celula: 5, periodo: { rotulo: 'x' },
    cobertura: { criancas_unicas: 104, matriculas: 128 },
    permanencia: { mais_de_doze_meses: 3, presenca_pct: 78 },
    exposicao: { lacunas: [], aspiracoes_declaradas: 64, areas_com_interesse: 6, areas_cobertas: 5 },
  };
  const pequena = R.redigirCarta(base)[0];
  assert.doesNotMatch(pequena.texto, /3 crianças estão no instituto/);
  assert.match(pequena.texto, /não é publicado neste período/);
  assert.equal(pequena.destaque, '78%');

  const grande = R.redigirCarta({ ...base, permanencia: { mais_de_doze_meses: 57, presenca_pct: 78 } })[0];
  assert.match(grande.texto, /57 crianças estão no instituto/);
  assert.equal(grande.destaque, '57');
});

test('a INTERFACE não escreve à mão o que o revisor barra (rodada 2)', async () => {
  // A correção de E-02 pegou os três redatores do servidor e deixou passar a
  // frase escrita à mão na tela de celebração — a de maior peso do produto.
  // Este teste fecha a classe: nenhuma frase causal literal no front.
  const { readFileSync } = await import('node:fs');
  const front = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const proibidas = [
    /os programas contribuíram/i,
    /contribuíram para os avanços/i,
    /o programa causou/i,
    /graças ao instituto/i,
    /o impacto foi/i,
  ];
  for (const re of proibidas)
    assert.doesNotMatch(front, re, `frase causal escrita à mão em public/app.js: ${re}`);
});

test('relatório: a supressão roda antes da redação e é declarada', () => {
  const fim = D.hoje(), inicio = D.addDias(fim, -180);
  const r = R.gerarRelatorio({ tipo: 'ciclo', inicio, fim });
  assert.equal(r.blocos.length, 7);
  assert.equal(r.revisor_status, 'aprovado');
  assert.equal(r.supressoes.minimo, D.PARAMS.MINIMO_CELULA);
  // Nenhum recorte publicado abaixo do minimo.
  for (const p of r.numeros.cobertura.programas) assert.ok(p.criancas >= D.PARAMS.MINIMO_CELULA);
  for (const a of r.numeros.exposicao.areas) assert.ok(a.criancas >= D.PARAMS.MINIMO_CELULA);
  // Nenhum codigo de crianca no texto.
  assert.doesNotMatch(r.texto, /EBZ-\d{4}/);
  assert.throws(() => R.publicarRelatorio('ciclo', r.periodo, 1), (e) => e.status === 403);  // educadora
  assert.throws(() => R.publicarRelatorio('ciclo', r.periodo, 2), (e) => e.status === 403);  // coordenação

  // Achados E-01 / SRV-01 / SRV-03: a supressão tem que alcançar o TEXTO, não só
  // as tabelas — e o agrupamento não pode somar percentual.
  for (const l of r.numeros.exposicao.lacunas)
    assert.ok(l.criancas >= D.PARAMS.MINIMO_CELULA, `lacuna publicada com ${l.criancas} crianças`);
  for (const x of r.numeros.permanencia.presenca_por_programa)
    assert.ok(x.presenca_pct <= 100, `percentual somado no agrupamento: ${x.presenca_pct}`);
  assert.equal(typeof r.supressoes.lacunas_suprimidas, 'number');
  assert.doesNotMatch(r.texto, /contribu(iu|íram|iram|em|i)\b/i, 'o texto não atribui contribuição ao programa');
  if (!r.supressoes.capa_por_vinculo)
    assert.doesNotMatch(r.blocos[0].texto, /há mais de doze meses/);
});

test('fecharCiclo: executa a retenção declarada e apaga texto legado', () => {
  const ciclo = get(`SELECT * FROM ciclo WHERE status='aberto'`);
  const obs = get(`SELECT id FROM observacao WHERE ciclo_id = ? LIMIT 1`, ciclo.id);
  // Simula um valor legado gravado antes da v2 remover o campo.
  run(`UPDATE observacao SET nota_livre = 'anotação legada' WHERE id = ?`, obs.id);
  assert.throws(() => D.fecharCiclo(ciclo.id, 1), (e) => e.status === 403);   // educadora não fecha

  const r = D.fecharCiclo(ciclo.id, 2, { abrirProximo: true });
  assert.equal(r.ciclo.status, 'fechado');
  assert.equal(r.notas_descartadas, 1);
  assert.equal(r.proximo.status, 'aberto');
  assert.equal(get(`SELECT COUNT(*) n FROM observacao WHERE ciclo_id = ? AND nota_livre IS NOT NULL`, ciclo.id).n, 0);
  assert.throws(() => D.fecharCiclo(ciclo.id, 2), (e) => e.status === 422);
});


// ---------------------------------------------------------------------------
// Etapa A da complementação (25/08/2026) — invariantes das correções.
// ---------------------------------------------------------------------------
test('numerosDoCiclo: o denominador da cobertura só conta programas no escopo (A-10)', () => {
  const ciclo = get(`SELECT * FROM ciclo WHERE status='aberto'`) ??
    all(`SELECT * FROM ciclo ORDER BY ano DESC, ordem DESC LIMIT 1`)[0];
  const n = D.numerosDoCiclo(ciclo.id);
  const dentroDoEscopo = get(
    `SELECT COUNT(DISTINCT m.crianca_id) AS n FROM matricula m
       JOIN programa p ON p.id = m.programa_id
      WHERE m.status='ativa' AND p.no_escopo = 1`).n;
  const comForaDeEscopo = get(
    `SELECT COUNT(DISTINCT crianca_id) AS n FROM matricula WHERE status='ativa'`).n;
  assert.equal(n.ativas, dentroDoEscopo);
  // O seed tem criança só na Vivência terapêutica; se isso mudar, o teste
  // continua válido — só deixa de exercitar a diferença.
  if (comForaDeEscopo > dentroDoEscopo) assert.ok(n.ativas < comForaDeEscopo);
});

test('listarCriancas: escopo de educadora restringe às turmas dela e declara o total (A4/A-13)', () => {
  const tudo = D.listarCriancas({ limite: 500 });
  assert.ok(tudo.total > 0 && tudo.criancas.length <= 500);
  const educadora = get(`SELECT educador_id AS id FROM turma WHERE educador_id IS NOT NULL LIMIT 1`);
  const dela = D.listarCriancas({ educadorId: educadora.id, limite: 500 });
  assert.ok(dela.total < tudo.total, `escopo não restringiu (${dela.total} vs ${tudo.total})`);
  const turmasDela = new Set(all(`SELECT id FROM turma WHERE educador_id = ?`, educadora.id).map(t => t.id));
  for (const c of dela.criancas) {
    const temVinculo = get(
      `SELECT 1 x FROM matricula WHERE crianca_id = ? AND status='ativa' AND turma_id IN
         (SELECT id FROM turma WHERE educador_id = ?)`, c.id, educadora.id);
    assert.ok(temVinculo, `criança ${c.codigo} fora das turmas da educadora ${educadora.id}`);
  }
  assert.ok(turmasDela.size >= 1);
});

test('alertas: escopo de educadora filtra por turma; sem escopo vem tudo (A4)', () => {
  const todos = D.alertas();
  const educadora = get(`SELECT educador_id AS id FROM turma WHERE educador_id IS NOT NULL LIMIT 1`);
  const dela = D.alertas(null, educadora.id);
  assert.ok(dela.length <= todos.length);
  for (const a of dela) {
    const vinculo = get(
      `SELECT 1 x FROM matricula m JOIN turma t ON t.id = m.turma_id
        WHERE m.crianca_id = ? AND m.status='ativa' AND t.educador_id = ?`, a.crianca_id, educadora.id);
    assert.ok(vinculo, `alerta de criança fora da turma da educadora`);
  }
});

// ---------------------------------------------------------------------------
// SROI exploratório (Fase 3) — motor determinístico.
// ---------------------------------------------------------------------------
const SROI = await import('../src/sroi/calculator.js');

test('sroi: 3 cenários, faixa presente e nunca número único', () => {
  const r = SROI.calcular({ criancas: 100, investimento_anual: 180000, proxy_ids: ['violencia-evasao'] });
  assert.equal(r.cenarios.length, 3);
  assert.deepEqual(r.cenarios.map(c => c.cenario), ['conservador', 'base', 'superior']);
  assert.ok(r.faixa_sroi.minimo < r.faixa_sroi.maximo);
  assert.match(r.leitura_obrigatoria, /associação compatível, não causalidade comprovada/);
  assert.ok(r.ressalvas.some(x => /fatores externos não foram isolados/i.test(x)));
  // determinismo: mesma entrada, mesmo resultado
  const r2 = SROI.calcular({ criancas: 100, investimento_anual: 180000, proxy_ids: ['violencia-evasao'] });
  assert.deepEqual(r.faixa_sroi, r2.faixa_sroi);
});

test('sroi: dupla contagem (envelope + componente) é bloqueada', () => {
  assert.throws(
    () => SROI.calcular({ criancas: 100, investimento_anual: 180000, proxy_ids: ['nao-conclusao-total', 'violencia-evasao'] }),
    (e) => e.status === 422 && /Dupla contagem/i.test(e.message));
});

test('sroi: benchmark e referência não entram no cálculo por criança', () => {
  for (const id of ['sroi-vim', 'custo-aluno-infantil', 'ipea-homicidios-bem-estar']) {
    assert.throws(() => SROI.calcular({ criancas: 100, investimento_anual: 180000, proxy_ids: [id] }),
      (e) => e.status === 422);
  }
});

test('sroi: toda proxy usada sai com fonte, ano-base e ressalva', () => {
  const r = SROI.calcular({ criancas: 106, investimento_anual: 200000, proxy_ids: ['renda-remuneracao', 'qualidade-vida', 'violencia-evasao'] });
  for (const p of r.proxies_usadas) {
    assert.ok(p.fonte && p.url && p.ano_base && p.ressalva, `proxy ${p.id} sem rastreabilidade completa`);
  }
  // componentes somados < envelope: coerência do grupo exclusivo
  const soma = r.proxies_usadas.reduce((s, p) => s + p.valor, 0);
  assert.ok(soma <= 372000);
});

test('sroi: parâmetro de cenário fora de 0..1 é recusado', () => {
  assert.throws(() => SROI.calcular({
    criancas: 10, investimento_anual: 1000, proxy_ids: ['violencia-evasao'],
    cenarios: { base: { deadweight: 1.5 } },
  }), (e) => e.status === 422);
});
