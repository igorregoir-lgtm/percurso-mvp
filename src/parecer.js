// Percurso — parecer profissional-a-profissional (decisão 32).
//
// Campo, 29/08/2026: "a assistente social de lá me manda mensagem pra
// perguntar como que ele tá" — e a resposta hoje é de memória. "Que daí seria
// entre profissionais, que é mais rico ainda." É o destino de maior valor que
// a psicóloga nomeou, e o único caso em que um dado INDIVIDUAL sai da
// organização. Por isso ele sai:
//   - por CÓDIGO, nunca por nome;
//   - só com consentimento específico do responsável ativo para este campo;
//   - com texto determinístico dos indicadores de programa (presença, régua,
//     participação e evolução por indicador em piorou/manteve/evoluiu), sem
//     campo livre, sem conteúdo clínico, sem detalhe de alerta;
//   - passando pelo revisor de sobre-alegação;
//   - e só vale depois da liberação registrada (quem, quando, para quem).
import { all, get, run, tx } from './db.js';
import { agora, dataBR, erro, hoje, consentimentoDe, fichaCrianca, faixaDaRegua, marcarAtividade, PARAMS, PAPEIS_COM_TURMA, revisarSobreAlegacao } from './domain.js';
import { NIVEL_PARA_PLANILHA, evolucao012, ROTULO_EVOLUCAO } from './planilha.js';

const FAIXA_TEXTO = { ok: 'na régua do Instituto (75%)', atencao: 'em faixa de atenção (entre 75% e 80%)',
  abaixo: 'abaixo da régua do Instituto (75%)', sem_base: 'ainda sem base para a régua' };
const RESSALVA = 'A leitura é de associação: fatores externos não foram isolados.';

function textoObrigatorio(v, campo, max = 120) {
  const t = String(v ?? '').trim().replace(/\s+/g, ' ');
  if (!t) throw erro(422, `${campo} é obrigatório.`);
  if (t.length > max) throw erro(422, `${campo} passa de ${max} caracteres.`);
  return t;
}

/** Quem pode gerar/liberar: coordenação, ou quem responde por uma turma ativa da criança. */
function exigeAutoria(criancaId, usuarioId) {
  const u = get(`SELECT * FROM educador WHERE id = ? AND arquivado_em IS NULL`, usuarioId);
  if (!u) throw erro(404, 'Usuário não encontrado.');
  if (u.papel === 'coordenacao') return u;
  if (!PAPEIS_COM_TURMA.has(u.papel))
    throw erro(403, 'Parecer é gerado por quem responde pela criança (professora ou psicóloga da turma) ou pela coordenação.');
  const vinculo = get(`SELECT 1 x FROM matricula m JOIN turma t ON t.id = m.turma_id
                        WHERE m.crianca_id = ? AND m.status='ativa' AND t.educador_id = ?`, criancaId, u.id);
  if (!vinculo) throw erro(403, 'Esta criança é de outra turma. O parecer é de quem responde por ela ou da coordenação.');
  return u;
}

/** Os números do parecer — só indicador de programa. */
export function numerosDoParecer(criancaId) {
  const f = fichaCrianca(criancaId);
  const presencas = get(`SELECT COUNT(*) t, SUM(CASE WHEN status='P' THEN 1 ELSE 0 END) p FROM presenca WHERE crianca_id = ?`, criancaId);
  const pct = presencas.t ? Math.round(((presencas.p ?? 0) / presencas.t) * 100) : null;
  const faixa = faixaDaRegua(pct, presencas.t);
  const evolucoes = f.trajetoria.dimensoes.map(d => {
    const [ant, ult] = [d.niveis.at(-2), d.niveis.at(-1)];
    const e = ant != null && ult != null ? evolucao012(NIVEL_PARA_PLANILHA[ant], NIVEL_PARA_PLANILHA[ult]) : null;
    return { dimensao: d.dimensao, evolucao: e, rotulo: e == null ? 'sem par de ciclos' : ROTULO_EVOLUCAO[e] };
  });
  const primeira = f.matriculas.map(m => m.entrada).sort()[0] ?? null;
  return {
    codigo: f.crianca.codigo,
    programas: [...new Set(f.matriculas.filter(m => m.status === 'ativa').map(m => m.programa))],
    desde: primeira,
    encontros: presencas.t, presentes: presencas.p ?? 0, presenca_pct: pct, faixa,
    ciclos: f.trajetoria.ciclos.map(c => c.nome),
    evolucoes,
    // Só o FATO de haver acompanhamento — nunca o detalhe do alerta.
    em_acompanhamento: !!f.alerta,
  };
}

export function redigirParecer(n, destinatario) {
  const linhas = [
    `PARECER DE ACOMPANHAMENTO — Instituto Ebenézer`,
    `Para: ${destinatario}`,
    `Criança: código ${n.codigo} (sem identificação nominal neste documento).`,
    `Programas em que participa: ${n.programas.join(', ') || '—'}${n.desde ? `, desde ${dataBR(n.desde)}` : ''}.`,
    '',
    `1. Presença: ${n.presentes} de ${n.encontros} encontros (${n.presenca_pct == null ? 'sem registro' : n.presenca_pct + '%'}) — ${FAIXA_TEXTO[n.faixa]}.`,
    n.ciclos.length >= 2
      ? `2. Evolução observada entre ${n.ciclos.at(-2)} e ${n.ciclos.at(-1)}, por indicador do programa: ` +
        n.evolucoes.map(e => `${e.dimensao}: ${e.rotulo}`).join('; ') + '.'
      : `2. Evolução por indicador: ainda não há dois ciclos de observação para comparar.`,
    `3. Acompanhamento: ${n.em_acompanhamento ? 'há acompanhamento aberto pela equipe do programa; o detalhe é tratado diretamente entre as equipes.' : 'nenhum acompanhamento aberto no momento.'}`,
    `4. O que este parecer não contém: conteúdo de atendimento psicológico, diagnóstico ou qualquer registro clínico — esses não são registrados neste sistema.`,
    '',
    RESSALVA,
  ];
  return linhas.join('\n');
}

export function gerarParecer({ criancaId, destinatario, usuarioId }) {
  const u = exigeAutoria(criancaId, usuarioId);
  const dest = textoObrigatorio(destinatario, 'O destinatário (profissional e serviço parceiro)');
  const cons = consentimentoDe(criancaId, 'parecer_profissional');
  if (cons.status !== 'ativo')
    throw erro(403, 'Sem consentimento específico do responsável para compartilhar com profissional parceiro, o parecer não é gerado. A coordenação registra o consentimento na tela de Consentimentos.',
      { motivo: 'consentimento', campo: 'parecer_profissional' });
  const n = numerosDoParecer(criancaId);
  const texto = redigirParecer(n, dest);
  const revisor = revisarSobreAlegacao(texto);
  if (revisor.status !== 'aprovado')
    throw erro(500, `O template do parecer reprovou no revisor: ${revisor.notas.join(' ')}`);
  return tx(() => {
    const id = Number(run(
      `INSERT INTO parecer (crianca_id, destinatario, texto, numeros_json, revisor_status, status, gerado_por, gerado_em)
       VALUES (?,?,?,?,?,'rascunho',?,?)`, criancaId, dest, texto, JSON.stringify(n), revisor.status, u.id, agora()).lastInsertRowid);
    marcarAtividade(u.id, 'parecer');
    return parecerDe(id);
  });
}

export function parecerDe(id) {
  const p = get(`SELECT p.*, g.apelido AS gerado_por_nome, l.apelido AS liberado_por_nome
                   FROM parecer p JOIN educador g ON g.id = p.gerado_por
                   LEFT JOIN educador l ON l.id = p.liberado_por WHERE p.id = ?`, id);
  if (!p) throw erro(404, 'Parecer não encontrado.');
  return { ...p, numeros: JSON.parse(p.numeros_json), numeros_json: undefined };
}

export function liberarParecer(id, usuarioId) {
  const p = parecerDe(id);
  const u = exigeAutoria(p.crianca_id, usuarioId);
  if (p.status === 'liberado') throw erro(409, 'Este parecer já foi liberado.');
  // O consentimento tem que estar de pé NA LIBERAÇÃO, não só na geração.
  if (consentimentoDe(p.crianca_id, 'parecer_profissional').status !== 'ativo')
    throw erro(403, 'O consentimento para compartilhar foi revogado ou está pendente — o parecer não sai.', { motivo: 'consentimento' });
  run(`UPDATE parecer SET status='liberado', liberado_por=?, liberado_em=? WHERE id=?`, u.id, agora(), id);
  marcarAtividade(u.id, 'parecer_liberado');
  return parecerDe(id);
}

export function pareceresDe(criancaId) {
  return all(`SELECT p.id, p.destinatario, p.status, p.gerado_em, p.liberado_em, g.apelido AS gerado_por_nome, l.apelido AS liberado_por_nome
                FROM parecer p JOIN educador g ON g.id = p.gerado_por LEFT JOIN educador l ON l.id = p.liberado_por
               WHERE p.crianca_id = ? ORDER BY p.gerado_em DESC`, criancaId);
}
