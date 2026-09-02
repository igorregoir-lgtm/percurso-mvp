// Percurso v2 — F7 · ingestao retroativa das planilhas de presenca.
//
// A camada de maior valor do pack v2 e a que menos custa tempo da equipe:
// entrega no dia 1 a serie historica que um sistema novo so teria em 2029.
// Resolve tambem a pergunta "matricula ou crianca?" no ato da importacao.
//
// Deterministica e sem dependencia: o parser e' proprio, a normalizacao e' por
// regra escrita, a deduplicacao e' por chave declarada. Nada aqui usa modelo —
// o que o pack chamava de "pipeline com LLM" vira regra auditavel, porque uma
// deduplicacao errada de crianca e' um erro que ninguem consegue rastrear depois.
import { all, get, run, tx } from './db.js';
import { hoje, agora, erro, recalcularAlertas, proximoCodigoCrianca } from './domain.js';

// --------------------------------------------------------------------------
// Parser de CSV — aspas, delimitador `,` ou `;`, BOM e CRLF.
// --------------------------------------------------------------------------
export function lerCsv(texto) {
  const bruto = String(texto ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (!bruto.trim()) return { cabecalho: [], linhas: [] };
  const primeira = bruto.split('\n')[0];
  const delim = (primeira.split(';').length > primeira.split(',').length) ? ';' : ',';

  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < bruto.length; i++) {
    const c = bruto[i];
    if (aspas) {
      if (c === '"') { if (bruto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === delim) { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else campo += c;
  }
  linha.push(campo);
  if (linha.some(x => x !== '')) linhas.push(linha);
  const cabecalho = (linhas.shift() ?? []).map(h => h.trim());
  return { cabecalho, linhas: linhas.filter(l => l.some(x => (x ?? '').trim() !== '')) };
}

// --------------------------------------------------------------------------
// Normalizacao — as colunas vem escritas de qualquer jeito.
// --------------------------------------------------------------------------
const semAcento = (t) => String(t ?? '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const COLUNAS = {
  nome:       ['nome', 'nome da crianca', 'crianca', 'aluno', 'aluna', 'nome completo', 'estudante', 'participante'],
  nascimento: ['nascimento', 'data de nascimento', 'dt nascimento', 'data nasc', 'nasc', 'dn', 'aniversario'],
  data:       ['data', 'dia', 'data do encontro', 'data encontro', 'dt', 'data da aula'],
  status:     ['presenca', 'presente', 'frequencia', 'status', 'situacao', 'p/f', 'compareceu'],
  turma:      ['turma', 'grupo', 'classe', 'sala'],
};

function mapearColunas(cabecalho) {
  const idx = {};
  cabecalho.forEach((h, i) => {
    const n = semAcento(h).replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
    for (const [campo, apelidos] of Object.entries(COLUNAS)) {
      if (idx[campo] != null) continue;
      if (apelidos.includes(n)) idx[campo] = i;
    }
  });
  return idx;
}

// Colunas de data em planilha "larga" (uma coluna por encontro).
const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$|^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/;
function comoData(v) {
  const t = String(v ?? '').trim();
  const m = t.match(RE_DATA);
  if (!m) return null;
  if (m[1]) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = m[4].padStart(2, '0'), mes = m[5].padStart(2, '0');
  const ano = m[6].length === 2 ? `20${m[6]}` : m[6];
  const iso = `${ano}-${mes}-${d}`;
  return Number(mes) >= 1 && Number(mes) <= 12 && Number(d) >= 1 && Number(d) <= 31 ? iso : null;
}

const PRESENTE = ['p', 'presente', 'presenca', '1', 'sim', 's', 'x', 'ok', 'compareceu', 'v'];
const FALTOU   = ['f', 'falta', 'faltou', 'ausente', 'ausencia', '0', 'nao', 'n', '-', 'a'];
function comoStatus(v) {
  const t = semAcento(v).trim();
  if (!t) return null;
  if (PRESENTE.includes(t)) return 'P';
  if (FALTOU.includes(t)) return 'F';
  return null;
}

/**
 * Chave de deduplicacao de crianca.
 *
 * O nome vem escrito de tres jeitos ("Ana Clara", "ANA  CLARA S.", "ana clara
 * souza"). A chave e' PRIMEIRO NOME + NASCIMENTO: dentro de um instituto do
 * tamanho do Ebenezer, duas criancas com o mesmo primeiro nome e a mesma data
 * de nascimento sao a mesma crianca — e o caso contrario aparece no relatorio
 * como colisao, para conferencia humana.
 */
// Data usada quando a planilha nao traz nascimento. O esquema exige NOT NULL,
// entao a ausencia precisa de um valor — mas ele NAO pode participar da chave,
// senao a mesma crianca importada duas vezes gera 'sem-data|ana' na primeira
// leitura e '1900-01-01|ana' na segunda, e duplica (achado SRV-02).
export const NASCIMENTO_DESCONHECIDO = '1900-01-01';

export function chaveDeCrianca(nome, nascimento) {
  const tokens = semAcento(nome).replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const primeiro = tokens[0] ?? '';
  const nasc = !nascimento || nascimento === NASCIMENTO_DESCONHECIDO ? 'sem-data' : nascimento;
  return `${nasc}|${primeiro}`;
}

const tokens = (nome) => semAcento(nome).replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);

/**
 * Duas grafias podem ser a mesma pessoa?
 *
 * Regra: token a token, o mais curto tem que ser PREFIXO do mais longo.
 *   "Ana Clara"      x "Ana Clara Souza"  -> sim (a mais curta é um começo da outra)
 *   "ana clara s."   x "Ana Clara Souza"  -> sim ("s" é prefixo de "souza")
 *   "Ana Souza"      x "Ana Ferreira"     -> NAO ("souza" não é prefixo de "ferreira")
 *
 * Serve so para a planilha SEM data de nascimento, onde a chave e' fraca. Com
 * data, o primeiro nome mais a data ja resolvem — e e' o caso do aceite de F7.
 */
export function grafiasCompativeis(a, b) {
  const [ta, tb] = [tokens(a), tokens(b)];
  const [curto, longo] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return curto.every((t, i) => longo[i]?.startsWith(t) || t.startsWith(longo[i] ?? ''));
}

const tituloCase = (nome) => String(nome ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  .map(p => p.length <= 2 && p !== 'ana' ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1))
  .join(' ');

// --------------------------------------------------------------------------
// A importacao.
// --------------------------------------------------------------------------
/**
 * @param {object} p
 * @param {string} p.csv          conteudo da planilha
 * @param {string} p.origem       nome do arquivo, so para o log
 * @param {number} p.turmaId      turma de destino quando a planilha nao traz
 * @param {number} p.executadoPor educador que rodou
 * @param {boolean} p.simular     true = nao grava nada, so devolve o relatorio
 */
export function importarPlanilha({ csv, origem = 'planilha.csv', turmaId, executadoPor, simular = false }) {
  const turma = get(`SELECT t.*, p.id AS programa_id FROM turma t JOIN programa p ON p.id = t.programa_id WHERE t.id = ?`, turmaId);
  if (!turma) throw erro(422, 'Escolha a turma de destino da planilha.');

  const { cabecalho, linhas } = lerCsv(csv);
  if (!cabecalho.length) throw erro(422, 'A planilha está vazia.');
  const idx = mapearColunas(cabecalho);
  if (idx.nome == null)
    throw erro(422, `Não encontrei a coluna do nome da criança. Colunas lidas: ${cabecalho.join(', ') || '—'}.`);

  // Colunas de data soltas => planilha larga (uma coluna por encontro).
  const colunasData = cabecalho.map((h, i) => ({ i, iso: comoData(h) })).filter(c => c.iso);
  const formato = colunasData.length ? 'larga' : 'longa';
  if (formato === 'longa' && (idx.data == null || idx.status == null))
    throw erro(422, 'A planilha não tem colunas de data e presença reconhecíveis, nem colunas de data no cabeçalho.');

  // ---- Passo 1: normalizar e deduplicar criancas -------------------------
  const registros = [];       // { chave, nome, nascimento, data, status }
  const descartadas = [];
  for (const [n, l] of linhas.entries()) {
    const nomeBruto = (l[idx.nome] ?? '').trim();
    if (!nomeBruto) { descartadas.push({ linha: n + 2, motivo: 'sem nome' }); continue; }
    const nascimento = idx.nascimento != null ? comoData(l[idx.nascimento]) : null;
    const chave = chaveDeCrianca(nomeBruto, nascimento);

    if (formato === 'larga') {
      let algum = false;
      for (const c of colunasData) {
        const st = comoStatus(l[c.i]);
        if (!st) continue;
        registros.push({ chave, nome: nomeBruto, nascimento, data: c.iso, status: st });
        algum = true;
      }
      if (!algum) descartadas.push({ linha: n + 2, motivo: 'nenhuma marcação de presença legível' });
    } else {
      const data = comoData(l[idx.data]);
      const status = comoStatus(l[idx.status]);
      if (!data) { descartadas.push({ linha: n + 2, motivo: `data ilegível: "${(l[idx.data] ?? '').trim()}"` }); continue; }
      if (!status) { descartadas.push({ linha: n + 2, motivo: `presença ilegível: "${(l[idx.status] ?? '').trim()}"` }); continue; }
      registros.push({ chave, nome: nomeBruto, nascimento, data, status });
    }
  }

  // Agrupa por chave: aqui as tres grafias do mesmo nome viram UMA crianca.
  const porChave = new Map();
  for (const r of registros) {
    if (!porChave.has(r.chave)) porChave.set(r.chave, { chave: r.chave, nascimento: r.nascimento, registros: [] });
    porChave.get(r.chave).registros.push(r);
  }

  // Dentro de cada chave, SEM data de nascimento, quebra em subgrupos de grafias
  // compativeis. Com data, a chave ja e' forte e o grupo fica inteiro.
  // Fundir "Ana Souza" com "Ana Ferreira" seria o erro oposto ao da duplicata —
  // e muito pior, porque junta a presenca de duas pessoas num registro so.
  const grupos = [];
  const colisoes = [];
  for (const bucket of porChave.values()) {
    const subgrupos = [];
    for (const r of bucket.registros) {
      const nome = r.nome.replace(/\s+/g, ' ').trim();
      const alvo = bucket.nascimento
        ? (subgrupos[0] ?? null)
        : subgrupos.find(sg => [...sg.grafias].every(g => grafiasCompativeis(g, nome)));
      if (alvo) { alvo.grafias.add(nome); alvo.registros.push(r); }
      else subgrupos.push({ grafias: new Set([nome]), registros: [r] });
    }
    if (subgrupos.length > 1) {
      colisoes.push({
        primeiro: bucket.chave.split('|')[1],
        separados: subgrupos.map(sg => [...sg.grafias].join(' / ')),
      });
    }
    for (const [i, sg] of subgrupos.entries()) {
      const grafias = [...sg.grafias];
      grupos.push({
        chave: subgrupos.length > 1 ? `${bucket.chave}#${i}` : bucket.chave,
        nascimento: bucket.nascimento,
        grafias,
        registros: sg.registros,
        // Nome canonico: a grafia mais longa, que costuma ser a mais completa.
        nome: tituloCase([...grafias].sort((a, b) => b.length - a.length)[0]),
      });
    }
  }
  const duplicatas = grupos.filter(g => g.grafias.length > 1);

  const relatorio = {
    origem, formato, turma: turma.nome,
    colunas_lidas: cabecalho,
    colunas_reconhecidas: Object.fromEntries(Object.entries(idx).map(([k, v]) => [k, cabecalho[v]])),
    linhas: linhas.length,
    registros: registros.length,
    criancas_no_arquivo: grupos.length,
    duplicatas_resolvidas: duplicatas.map(g => ({ nome: g.nome, grafias: g.grafias })),
    sem_nascimento: grupos.filter(g => !g.nascimento).map(g => g.nome),
    colisoes,
    vinculos_fracos: [],
    descartadas,
    periodo: registros.length
      ? { inicio: registros.map(r => r.data).sort()[0], fim: registros.map(r => r.data).sort().at(-1) }
      : null,
  };

  if (simular) return { simulado: true, ...relatorio, criancas_novas: null, reconhecidas: null, encontros: 0, presencas: 0 };
  if (!executadoPor) throw erro(422, 'Informe quem está executando a importação.');

  // ---- Passo 2: gravar -----------------------------------------------------
  return tx(() => {
    let novas = 0, reconhecidas = 0, encontrosCriados = 0, presencasCriadas = 0;
    const vinculosFracos = [];

    // Duas escalas de casamento, porque a chave tem duas forças:
    //   COM nascimento  -> chave forte (primeiro nome + data). Casa no instituto
    //                      inteiro: duas crianças com o mesmo primeiro nome E a
    //                      mesma data de nascimento são a mesma criança.
    //   SEM nascimento  -> chave fraca (só o primeiro nome). Casar no instituto
    //                      inteiro FUNDIRIA crianças distintas — o erro oposto ao
    //                      da duplicata, e muito pior, porque junta a presença de
    //                      duas pessoas num registro só. Aqui o casamento fica
    //                      restrito a quem JÁ está matriculado na turma de destino,
    //                      e cada vínculo desses é reportado para conferência.
    const chaveada = (linhas) => new Map(linhas.map(c => [chaveDeCrianca(c.nome, c.nascimento), c]));
    const noInstituto = chaveada(all(`SELECT id, nome, nascimento FROM crianca`));
    const naTurma = chaveada(all(
      `SELECT c.id, c.nome, c.nascimento FROM crianca c
         JOIN matricula m ON m.crianca_id = c.id AND m.turma_id = ?`, turma.id));

    for (const g of grupos) {
      const forte = !!g.nascimento;
      // Grupo separado por colisao nao casa com o banco por chave: o sufixo `#i`
      // e' interno ao arquivo, e o nome sozinho nao basta para decidir.
      const separado = g.chave.includes('#');
      const achada = separado ? null
        : forte ? noInstituto.get(g.chave) : naTurma.get(g.chave);
      let criancaId = achada?.id;
      if (criancaId) {
        reconhecidas++;
        if (!forte) vinculosFracos.push({ nome_no_arquivo: g.nome, vinculada_a: achada.nome, motivo: 'sem data de nascimento; casou pelo primeiro nome dentro da turma' });
      }
      else {
        // Sem nascimento na planilha, marca a data como desconhecida em vez de
        // inventar: o relatorio lista essas criancas para conferencia humana.
        const nascimento = g.nascimento ?? NASCIMENTO_DESCONHECIDO;
        // COUNT(*)+1 reemitia um codigo ja usado assim que uma crianca saisse
        // do banco, e `crianca.codigo` e' UNIQUE: a importacao inteira ia ao
        // chao no INSERT. O gerador unico mora no dominio (MAX do sufixo).
        const codigo = proximoCodigoCrianca();
        run(`INSERT INTO crianca (codigo, nome, nascimento, responsavel, ativo, criado_em)
             VALUES (?,?,?,?,1,?)`, codigo, g.nome, nascimento, 'Responsável a confirmar', hoje());
        criancaId = get(`SELECT id FROM crianca WHERE codigo = ?`, codigo).id;
        novas++;
        const registro = { id: criancaId, nome: g.nome, nascimento };
        noInstituto.set(g.chave, registro);
        naTurma.set(g.chave, registro);
      }

      // Permanencia retroativa: a matricula comeca no primeiro encontro visto.
      const datas = g.registros.map(r => r.data).sort();
      const jaMatriculada = get(
        `SELECT id, entrada FROM matricula WHERE crianca_id = ? AND turma_id = ?`, criancaId, turma.id);
      if (!jaMatriculada) {
        run(`INSERT INTO matricula (crianca_id, programa_id, turma_id, entrada, saida, status)
             VALUES (?,?,?,?,NULL,'ativa')`, criancaId, turma.programa_id, turma.id, datas[0]);
      } else if (datas[0] < jaMatriculada.entrada) {
        run(`UPDATE matricula SET entrada = ? WHERE id = ?`, datas[0], jaMatriculada.id);
      }

      for (const r of g.registros) {
        let enc = get(`SELECT id FROM encontro WHERE turma_id = ? AND data = ?`, turma.id, r.data);
        if (!enc) {
          run(`INSERT INTO encontro (turma_id, data, registrado_por, registrado_em, duracao_segundos)
               VALUES (?,?,?,?,NULL)`, turma.id, r.data, executadoPor, agora());
          enc = get(`SELECT id FROM encontro WHERE turma_id = ? AND data = ?`, turma.id, r.data);
          encontrosCriados++;
        }
        const res = run(
          `INSERT INTO presenca (encontro_id, crianca_id, status) VALUES (?,?,?)
             ON CONFLICT(encontro_id, crianca_id) DO NOTHING`, enc.id, criancaId, r.status);
        if (res.changes) presencasCriadas++;
      }
    }

    const completo = { ...relatorio, criancas_novas: novas, reconhecidas,
                       vinculos_fracos: vinculosFracos,
                       encontros: encontrosCriados, presencas: presencasCriadas };
    run(`INSERT INTO importacao (origem, linhas, criancas_novas, reconhecidas, duplicatas,
                                 encontros, presencas, descartadas, relatorio_json, executado_por, executado_em)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        origem, linhas.length, novas, reconhecidas, duplicatas.length,
        encontrosCriados, presencasCriadas, descartadas.length,
        JSON.stringify(completo), executadoPor, agora());
    recalcularAlertas(turma.id);
    return { simulado: false, ...completo };
  });
}

export function importacoes() {
  return all(`SELECT i.*, e.nome AS executado_por_nome FROM importacao i
                LEFT JOIN educador e ON e.id = i.executado_por
               ORDER BY i.executado_em DESC LIMIT 20`)
    .map(i => ({ ...i, relatorio: JSON.parse(i.relatorio_json) }));
}
