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
const { get, run, closeDb } = await import('../src/db.js');

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
  const r = D.revisarSobreAlegacao(
    `Os dados sugerem que os programas contribuíram para os avanços observados; fatores externos não foram isolados.`);
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
test('salvarObservacao: conteúdo clínico nunca chega ao banco, nem com forcarLimpeza', () => {
  const ciclo = get(`SELECT id FROM ciclo WHERE status='aberto'`);
  const alvo = get(
    `SELECT co.crianca_id FROM consentimento co
       JOIN presenca p ON p.crianca_id = co.crianca_id
      WHERE co.campo='rubrica_socioemocional' AND co.status='ativo'
        AND co.crianca_id IN (SELECT crianca_id FROM consentimento WHERE campo='campo_livre' AND status='ativo')
        AND co.crianca_id NOT IN (SELECT crianca_id FROM observacao WHERE ciclo_id = ${ciclo.id})
      GROUP BY co.crianca_id HAVING SUM(p.status='P') >= 4 LIMIT 1`);
  assert.ok(alvo, 'seed precisa ter criança observável sem observação no ciclo aberto');
  const dims = D.rubrica();
  const itens = dims.map(d => ({ dimensao_id: d.id, nivel: 3 }));
  const nota = 'Participou da roda. Está tomando remédio controlado. Ajudou a colega.';

  // Sem confirmação: 409 e nada é gravado.
  assert.throws(
    () => D.salvarObservacao({ cicloId: ciclo.id, criancaId: alvo.crianca_id, educadorId: 1, itens, notaLivre: nota, concluir: true }),
    (e) => e.status === 409 && e.extra.filtro.bloqueado);
  assert.equal(get(`SELECT COUNT(*) n FROM observacao WHERE ciclo_id=? AND crianca_id=?`, ciclo.id, alvo.crianca_id).n, 0);

  // Com confirmação: grava SEM o trecho.
  const r = D.salvarObservacao({ cicloId: ciclo.id, criancaId: alvo.crianca_id, educadorId: 1, itens, notaLivre: nota, concluir: true, forcarLimpeza: true });
  assert.equal(r.status, 'concluida');
  assert.equal(r.trechos_descartados, 1);
  const gravada = get(`SELECT nota_livre FROM observacao WHERE ciclo_id=? AND crianca_id=?`, ciclo.id, alvo.crianca_id);
  assert.doesNotMatch(gravada.nota_livre, /rem[eé]dio/i);
  assert.match(gravada.nota_livre, /roda/i);
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
