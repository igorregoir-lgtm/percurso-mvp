// Percurso — stub do llama-server para testes SEM modelo (CI e máquina sem GGUF).
//
// Imita as duas rotas que o src/ai-client.js usa (/health e /v1/chat/completions)
// com respostas canônicas deterministicas. O que ele devolve é controlado pelo
// CONTEÚDO da última mensagem do usuário:
//   contém "__stub_invalido__"  → devolve texto que NÃO é JSON (testa saida_invalida)
//   contém "__stub_trava__"     → nunca responde (testa timeout/abort)
//   contém "__stub_500__"       → HTTP 500 (testa causa http)
//   pedido com json_schema "extracao_*"        → extração canônica dos catálogos
//   pedido com json_schema (demais)            → resposta reflexiva canônica de 7 blocos
//   sem schema                                 → texto curto fixo
//
// Uso:   node scripts/ai-stub.mjs           (porta 8099; AI_URL_REFLEXIVO=http://127.0.0.1:8099)
//        PORTA=8081 node scripts/ai-stub.mjs
import { createServer } from 'node:http';

const PORTA = Number(process.env.PORTA) || 8099;

// Resposta reflexiva canônica — respeita o contrato de 7 blocos do copilot,
// citando a fonte de id "stub-1" (o teste injeta um trecho com esse id).
const REFLEXIVA = {
  entendi: 'Você descreveu uma situação de turma e pediu caminhos para agir.',
  perguntas: ['O que muda no comportamento quando a atividade é em dupla?', 'Em que momento do dia isso acontece mais?'],
  hipoteses: [
    { rotulo: 'possível', texto: 'A agitação pode estar ligada à transição entre atividades.' },
    { rotulo: 'a investigar', texto: 'Pode haver relação com o horário próximo ao fim do encontro.' },
  ],
  alternativas: [
    { acao: 'Combinar um sinal de transição com a turma.', limites: 'Exige constância por algumas semanas.' },
    { acao: 'Encurtar a atividade e fechar com roda breve.', limites: 'Reduz o tempo de conteúdo.' },
    { acao: 'Alternar dupla e grupo grande na mesma tarde.', limites: 'Pede planejamento prévio.' },
  ],
  contraponto: 'Antes de mudar a rotina inteira, vale observar se o padrão se repete em dois encontros.',
  fontes: [{ id: 'stub-1', trecho_usado: 'trecho de teste' }],
  proximo_passo: 'Testar o sinal de transição no próximo encontro e anotar o que mudou.',
  escalonamento: null,
};

const EXTRACAO = {
  atividade: 'roda', area_tematica: 'saude', marcadores_turma: ['colaborou', 'participou'],
  pediram_ajuda: 3, faltas_mencionadas: [], confianca: 0.9, conteudo_excluido: false,
};

const servidor = createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', stub: true }));
  }
  if (req.url === '/v1/chat/completions' && req.method === 'POST') {
    let corpo = '';
    for await (const c of req) corpo += c;
    let pedido = {};
    try { pedido = JSON.parse(corpo); } catch {}
    const ultima = [...(pedido.messages || [])].reverse().find(m => m.role === 'user')?.content || '';

    if (ultima.includes('__stub_trava__')) return; // nunca responde
    if (ultima.includes('__stub_500__')) { res.writeHead(500); return res.end('erro'); }

    let conteudo;
    if (ultima.includes('__stub_invalido__')) conteudo = 'isto não é JSON {';
    else if (pedido.response_format?.json_schema) {
      const js = pedido.response_format.json_schema;
      const nome = js.name || '';
      if (nome.startsWith('extracao')) conteudo = JSON.stringify(EXTRACAO);
      else if (nome.startsWith('assistente')) {
        // Assistente: devolve a PRIMEIRA ação do enum RECEBIDO no pedido — o
        // teste controla o enum e pode verificar o descarte de ação inválida.
        const enumAcao = js.schema?.properties?.acao?.anyOf?.find(x => x.enum)?.enum ?? [];
        conteudo = JSON.stringify({
          resposta: 'Resposta canônica do Passo pelo stub: esta tela mostra o essencial do dia.',
          fala: ultima.includes('__stub_fala_pseudonimo__') ? 'Sobre a Criança A: tudo certo.'
              : ultima.includes('__stub_fala_nula__') ? null
              : 'Esta tela mostra o essencial do dia.',
          acao: ultima.includes('__stub_sem_acao__') ? null : (enumAcao[0] ?? null),
        });
      }
      else conteudo = JSON.stringify(REFLEXIVA);
    } else conteudo = 'Resposta curta do stub em português.';

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      model: 'stub', choices: [{ message: { role: 'assistant', content: conteudo }, finish_reason: 'stop' }],
    }));
  }
  res.writeHead(404); res.end();
});

servidor.listen(PORTA, '127.0.0.1', () =>
  console.log(`ai-stub no ar em http://127.0.0.1:${PORTA} (health + chat/completions)`));
