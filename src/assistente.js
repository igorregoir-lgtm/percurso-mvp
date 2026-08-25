// Percurso — "Passo", o parceiro de percurso (assistente de navegação e uso).
//
// DOUTRINA PRÓPRIA, além da herdada (plano auditado em revisao/07):
//   1. O Passo responde SÓ sobre o produto. Pergunta reflexivo-pedagógica não
//      vai ao modelo daqui: é redirecionada ao copilot (que tem RAG, 7 blocos
//      e verificador) — e, para a diretoria, à camada agregada (decisão 16).
//   2. Diretoria + nome de criança = recusa determinística. Nada vai ao modelo
//      nem à memória.
//   3. A FALA é mais restrita que a tela: perímetro/recusa saem com fala nula;
//      fala que contenha pseudônimo ou nome do roster é descartada no servidor.
//   4. Ação é um catálogo FECHADO de navegação (enum na gramática) e sempre
//      OFERTA — quem navega é o toque da pessoa, nunca o Passo.
//   5′. DOIS CANAIS, DUAS PERMISSÕES (substitui a doutrina 5 antiga, que dizia
//      "o Passo não enxerga dado nenhum" e virou mentira no instante em que a
//      sugestão passou a nascer de estado real — e limite declarado que virou
//      mentira é pior do que a mudança):
//      · CONVERSA (assistente(), este arquivo) continua CEGA: nada do banco
//        entra no prompt de uma resposta a pergunta. Pergunta sobre um caso
//        específico recebe o limite declarado, nunca um motivo inventado.
//      · SUGESTÃO (src/passo/) enxerga CONTADORES do próprio dia da pessoa —
//        quantos, quantas datas, quantos dias. Nunca um nome, nunca uma ficha,
//        nunca um nível, nunca um escore individual. Conta quantos, nunca quem.
//      A exceção declarada: coordenação e diretoria recebem, no portão 3.5,
//      o número AGREGADO vindo de SQL — verbatim, sem modelo e sem entrar na
//      memória da sessão.
//   6. Fila cheia não é erro: cai no guia determinístico (origem 'guia').
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filtrarPerimetro, erro } from './domain.js';
import { conversar, AI_ENABLED } from './ai-client.js';
import { anonimizarTexto } from './rag/anonimizar.js';
import { comVaga, nomesParaAnonimizar, RECUSAS } from './copilot.js';
import { criarSessoes } from './sessoes.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

// O Passo com modelo herda o gate da PoC (decisão 19); AI_ASSISTENTE=0 desliga
// só ele, mantendo o copilot — kill switch independente.
export const AI_ASSISTENTE = AI_ENABLED &&
  !['0', 'false'].includes(String(process.env.AI_ASSISTENTE ?? '').toLowerCase());

const memoria = criarSessoes();
const MAX_TROCAS = 4;

export function apagarSessaoAssistente(u, sessaoId) {
  memoria.apagar(u, String(sessaoId || ''));
  return { ok: true, aviso: 'Conversa com o Passo apagada. Nada dela foi persistido.' };
}

// ---------------------------------------------------------------------------
// CATÁLOGO DE AÇÕES — fechado, só navegação. O Passo nunca grava nada.
// ---------------------------------------------------------------------------
export const CATALOGO_ACOES = [
  { id: 'hoje', rotulo: 'Hoje', hash: '#/hoje', papeis: ['educador'] },
  { id: 'chamada', rotulo: 'Chamada', hash: '#/chamada', papeis: ['educador'] },
  { id: 'voz', rotulo: 'Contar como foi (voz)', hash: '#/voz', papeis: ['educador'] },
  { id: 'folha', rotulo: 'Folha do dia', hash: '#/folha', papeis: ['educador'] },
  { id: 'pauta', rotulo: 'Pauta de segunda', hash: '#/pauta', papeis: ['educador'] },
  { id: 'ciclo', rotulo: 'Agenda do ciclo', hash: '#/ciclo', papeis: ['educador'] },
  { id: 'turma', rotulo: 'Painel da turma', hash: '#/turma', papeis: ['educador'] },
  { id: 'criancas', rotulo: 'Crianças', hash: '#/criancas', papeis: ['educador', 'coordenacao'] },
  // A entrada de GUIA 'alertas' existia sem par aqui: validarAcao('alertas')
  // devolvia null e a oferta "Ir para Alertas" sumia em silêncio.
  { id: 'alertas', rotulo: 'Alertas de ausência', hash: '#/alertas', papeis: ['educador', 'coordenacao'] },
  { id: 'copilot', rotulo: 'Refletir (copilot)', hash: '#/copilot', papeis: ['educador', 'coordenacao'] },
  { id: 'painel', rotulo: 'Painel da coordenação', hash: '#/painel', papeis: ['coordenacao'] },
  { id: 'scores', rotulo: 'Scores', hash: '#/scores', papeis: ['coordenacao'] },
  { id: 'safras', rotulo: 'Safras', hash: '#/safras', papeis: ['coordenacao'] },
  { id: 'sintese', rotulo: 'Síntese do ciclo', hash: '#/sintese', papeis: ['coordenacao'] },
  { id: 'consentimentos', rotulo: 'Consentimentos', hash: '#/consentimentos', papeis: ['coordenacao'] },
  { id: 'importar', rotulo: 'Importar planilha', hash: '#/importar', papeis: ['coordenacao'] },
  { id: 'relatorio', rotulo: 'Relatório do doador', hash: '#/relatorio', papeis: ['diretoria'] },
  { id: 'impacto', rotulo: 'Impacto (SROI)', hash: '#/impacto', papeis: ['diretoria'] },
  { id: 'consulta', rotulo: 'Perguntar à base', hash: '#/consulta', papeis: ['diretoria'] },
];

export const catalogoDoPapel = (papel) => CATALOGO_ACOES.filter(a => a.papeis.includes(papel));

export function validarAcao(id, papel) {
  if (!id) return null;
  return catalogoDoPapel(papel).find(a => a.id === id) ?? null;
}

// `tela` vinda do cliente é DADO NÃO CONFIÁVEL: fora desta lista fechada ela
// vira '' e nunca é interpolada em prompt — um nome de criança digitado na
// barra de endereço não pode virar canal lateral para o modelo, nem injeção
// de instrução em mensagem de sistema.
const ROTAS_CONHECIDAS = new Set([
  ...CATALOGO_ACOES.map(a => a.hash),
  '#/entrar', '#/alertas', '#/confirmar', '#/observacao', '#/crianca',
]);
/** Mesmo conjunto, exportado: é o vocabulário fechado de `tela` no perfil. */
export const ROTAS_CONHECIDAS_PASSO = ROTAS_CONHECIDAS;
export function telaSegura(tela) {
  const rota = String(tela ?? '').split('?')[0];
  if (ROTAS_CONHECIDAS.has(rota)) return rota;
  const m = rota.match(/^(#\/(?:crianca|observacao))\/\d+$/);   // fichas com id numérico
  return m ? m[1] : '';
}

// ---------------------------------------------------------------------------
// GUIA — fonte única de conhecimento do Passo. Dois níveis: a TELA (o que é)
// e as TAREFAS (como fazer), com intenções para o casamento determinístico.
// `naoEnxergo`: o limite declarado — o Passo não vê dado nenhum.
// ---------------------------------------------------------------------------
export const GUIA = [
  {
    id: 'hoje', papeis: ['educador'],
    oQueE: 'A tela Hoje é o ponto de partida da educadora: mostra a chamada do dia, a folha do dia, a agenda do ciclo e o que precisa de atenção nesta semana.',
    chips: ['O que é esta tela?', 'Como faço a chamada?', 'Como conto como foi o encontro?'],
    tarefas: [
      { intencoes: ['retomar', 'fiquei sem registrar', 'dias sem'], resposta: 'Se você ficou dias sem registrar, nada se perdeu: a tela Hoje mostra "Retomar por [data]" — toque nela e as datas em aberto aparecem para completar, sem pressa. Nenhuma expira.', acao: 'hoje' },
    ],
  },
  {
    id: 'chamada', papeis: ['educador'],
    oQueE: 'A Chamada registra a presença da turma em um toque por criança — a meta é terminar em menos de 2 minutos, junto com o encontro.',
    chips: ['Como marco presença e falta?', 'Para que serve o cronômetro?', 'Como marco todos presentes?'],
    tarefas: [
      { intencoes: ['presenca', 'presente', 'marcar presenca', 'como marco'], resposta: 'Na Chamada, cada criança tem dois botões: P de presente e F de falta. Um toque marca; outro toque no mesmo botão desmarca. Quando a turma inteira estiver marcada, toque em Salvar — antes disso nada é gravado.', acao: 'chamada' },
      { intencoes: ['falta', 'faltou', 'ausencia', 'ausente'], resposta: 'Falta é o botão F ao lado do nome. Com duas faltas seguidas, o Percurso abre um alerta de ausência para a coordenação ligar para a família — por isso marcar falta importa tanto quanto marcar presença.', acao: 'chamada' },
      { intencoes: ['todos presentes', 'todo mundo veio', 'turma inteira'], resposta: 'Se a turma inteira veio, toque em "Todos presentes" — marca todo mundo de uma vez — e ajuste só quem faltou. Depois, Salvar.', acao: 'chamada' },
      { intencoes: ['cronometro', 'tempo', 'dois minutos', '2 minutos', 'relogio'], resposta: 'O cronômetro mede quanto tempo a chamada leva — a promessa do Percurso é burocracia de no máximo 2 minutos. Ele mede o SISTEMA, nunca você: se passar da meta, o problema é nosso, não seu.', acao: 'chamada' },
      { intencoes: ['data', 'dia errado', 'trocar data', 'chamada atrasada', 'dia anterior'], resposta: 'Dá para fazer a chamada de um dia que ficou para trás: na tela da Chamada, troque a data no seletor — as datas em aberto não expiram.', acao: 'chamada' },
    ],
  },
  {
    id: 'voz', papeis: ['educador'],
    oQueE: 'Em "Contar como foi", você fala por até 40 segundos sobre o encontro da TURMA e o Percurso transforma a fala em campos — que você confere e confirma antes de qualquer coisa ser gravada.',
    chips: ['Como funciona a captura por voz?', 'O áudio fica gravado?', 'E se eu preferir escrever?'],
    tarefas: [
      { intencoes: ['gravar', 'falar', 'voz', 'microfone', 'audio', 'conto como', 'contar como foi', 'como foi o encontro', 'relato do encontro'], resposta: 'Toque no microfone grande, fale sobre o encontro da turma (atividade, tema, como o grupo esteve) e toque em Terminei. Os campos se preenchem sozinhos para você conferir — nada é gravado antes do seu "Confirmar e guardar".', acao: 'voz' },
      { intencoes: ['audio fica', 'gravacao', 'fica gravado', 'guardado o audio'], resposta: 'O áudio nunca sai do seu aparelho e nunca chega ao servidor: o navegador transcreve na hora, o texto é usado para preencher os campos e morre na confirmação. Não existe gravação de voz no Percurso.', acao: null },
      { intencoes: ['escrever', 'digitar', 'sem falar', 'teclado'], resposta: 'Prefere escrever? Na mesma tela há o campo de texto — ou use "Preencher à mão" na folha do dia. A voz é atalho, nunca obrigação.', acao: 'folha' },
      { intencoes: ['nome de crianca', 'posso falar nome', 'falar da crianca'], resposta: 'Fale da TURMA, não de uma criança. Se algo sensível sobre alguém escapar, o filtro de proteção segura o trecho: ele não vira campo, não é gravado, e a tela orienta o caminho humano (coordenação).', acao: null },
    ],
  },
  {
    id: 'ciclo', papeis: ['educador'],
    oQueE: 'A Agenda do ciclo lista quem já foi observado neste ciclo, quem falta, e quem está bloqueado — sempre com o motivo explícito.',
    chips: ['O que é o ciclo de observação?', 'Por que uma criança aparece bloqueada?'],
    naoEnxergo: 'Eu não abro a ficha de ninguém: eu conto quantas estão bloqueadas, nunca quem. O motivo exato aparece na própria agenda, ao lado do nome.',
    tarefas: [
      { intencoes: ['bloquead', 'nao consigo observar', 'nao deixa observar'], resposta: 'Eu não abro a ficha de ninguém, então não sei o motivo deste caso — mas a Agenda do ciclo mostra o motivo escrito ao lado de cada criança bloqueada. Os dois motivos possíveis são: consentimento do responsável pendente ou revogado, ou a janela mínima de convívio (4 encontros antes de observar — é protocolo, não falha sua). Quer ir até lá ver?', acao: 'ciclo' },
      { intencoes: ['observa', 'rubrica', 'ancora', 'como avalio', 'niveis'], resposta: 'A observação é uma rubrica de 5 dimensões com âncoras de comportamento observável — você marca o que VIU no ciclo, nível 1 a 4, nunca uma interpretação. Na dúvida entre dois níveis, marque o menor. A própria tela tem o guia "Como calibrar o olhar".', acao: 'ciclo' },
    ],
  },
  {
    id: 'pauta', papeis: ['educador'],
    oQueE: 'A Pauta de segunda devolve o que você registrou: três linhas acionáveis sobre a turma e uma sugestão de atividade — que você aceita ou descarta.',
    chips: ['O que é a pauta de segunda?', 'De onde vem a sugestão?'],
    tarefas: [
      { intencoes: ['sugestao', 'atividade sugerida', 'de onde vem'], resposta: 'A sugestão vem de um banco fixo de atividades por dimensão, escolhida pela menor média da turma no ciclo — regra auditável, sem modelo decidindo. Aceitar ou descartar é seu; o descarte também é registrado, para o sistema aprender o que não serve.', acao: 'pauta' },
    ],
  },
  {
    id: 'turma', papeis: ['educador'],
    oQueE: 'O Painel da turma mostra as médias por dimensão entre ciclos, a agenda e o plano da semana — sempre agregado, nunca ranking de crianças.',
    chips: ['O que este painel mostra?'],
    tarefas: [],
  },
  {
    id: 'criancas', papeis: ['educador', 'coordenacao'],
    oQueE: 'A lista de Crianças abre a ficha viva de cada uma: matrículas, presença, trajetória categórica e consentimentos. Educadora vê as crianças das próprias turmas.',
    chips: ['Como encontro uma criança?', 'O que tem na ficha?'],
    naoEnxergo: 'Eu não abro a ficha de ninguém — eu só te levo até a lista.',
    tarefas: [
      { intencoes: ['buscar', 'busca', 'encontrar', 'encontro uma', 'encontro a crianca', 'procur', 'achar', 'acho', 'lista de crianca'], resposta: 'Na tela Crianças, use a busca por nome ou código — a lista mostra as crianças das suas turmas. Toque no nome para abrir a ficha viva.', acao: 'criancas' },
    ],
  },
  {
    id: 'copilot', papeis: ['educador', 'coordenacao'],
    oQueE: 'O Refletir é a sala de reflexão pedagógica: você descreve uma situação da turma e o copilot local devolve perguntas, hipóteses rotuladas, alternativas e contraponto — com fontes do corpus aprovado. A decisão é sempre sua.',
    chips: ['O que é o Refletir?', 'O que ele nunca faz?'],
    tarefas: [
      { intencoes: ['refletir', 'copilot', 'reflexao', 'conversar sobre a turma'], resposta: 'Para refletir sobre uma situação pedagógica, o lugar é o Refletir: descreva a situação (sem nomear criança) e receba perguntas socráticas, hipóteses e alternativas com fontes. Eu sou só o guia do produto — a reflexão de verdade mora lá.', acao: 'copilot' },
    ],
  },
  {
    id: 'painel', papeis: ['coordenacao'],
    oQueE: 'O Painel da coordenação responde "o que o Instituto tem hoje, medido": crianças únicas vs matrículas, cobertura do ciclo, reconciliação de fontes, calibração entre educadoras e alertas.',
    chips: ['O que é a calibração entre educadoras?', 'O que é cobertura?'],
    tarefas: [
      { intencoes: ['calibra', 'divergencia entre educadoras'], resposta: 'A calibração compara, por dimensão, a média de cada educadora com a média geral — onde diverge muito, o convite é calibrar o olhar juntas com as âncoras. É pauta de reunião, nunca avaliação de educadora.', acao: 'painel' },
      { intencoes: ['cobertura', 'quantas observadas'], resposta: 'Cobertura é a fração de crianças ativas (dos programas no escopo) já observadas no ciclo. Ela mede o SISTEMA — onde o dado está furado — não o desempenho de ninguém.', acao: 'painel' },
    ],
  },
  {
    id: 'scores', papeis: ['coordenacao'],
    oQueE: 'Os três scores medem vínculo em risco (evasão), cobertura do registro e exposição às áreas de interesse — nenhum pontua a criança; nascem de regra e fórmula, nunca de modelo.',
    chips: ['O que os scores medem?', 'O score avalia a criança?'],
    tarefas: [
      { intencoes: ['score avalia', 'nota da crianca', 'pontua'], resposta: 'Nenhum score pontua o desenvolvimento de uma criança — isso é decisão de desenho, não limitação. Evasão mede o vínculo em risco; cobertura mede o sistema; exposição mede a oferta de atividades. O escore nunca nasce de modelo.', acao: 'scores' },
    ],
  },
  {
    id: 'safras', papeis: ['coordenacao'],
    oQueE: 'Safras mostram permanência e evasão por grupo de entrada — quanto tempo as crianças ficam, comparável entre períodos.',
    chips: ['O que é uma safra?'],
    tarefas: [],
  },
  {
    id: 'sintese', papeis: ['coordenacao'],
    oQueE: 'A Síntese fecha o ciclo em texto de template fixo com números do banco, passa pelo revisor de sobre-alegação e exige sua aprovação — depois de aprovada, é imutável.',
    chips: ['Como gero a síntese?', 'Por que o revisor barrou?'],
    tarefas: [
      { intencoes: ['revisor barrou', 'reprovad', 'sobre-alegacao', 'verbo causal'], resposta: 'O revisor barra verbos causais fortes ("gerou", "provou") e exige a ressalva de que fatores externos não foram isolados — é a linguagem protegendo o Instituto perante quem financia. O template padrão sempre passa; texto editado à mão é que pode ser barrado.', acao: 'sintese' },
    ],
  },
  {
    id: 'consentimentos', papeis: ['coordenacao'],
    oQueE: 'A tela de Consentimentos registra e revoga o consentimento específico do responsável (LGPD Art. 14) por campo — sem ele, a observação da criança nem abre.',
    chips: ['Como registro um consentimento?', 'O que acontece ao revogar?'],
    tarefas: [
      { intencoes: ['revogar', 'revogacao', 'tirar consentimento'], resposta: 'Revogar bloqueia novas observações da criança na hora, mesmo com histórico existente — o bloqueio é chave estrangeira no banco, não aviso de tela. O destino do histórico é decisão de governança da coordenação.', acao: 'consentimentos' },
    ],
  },
  {
    id: 'importar', papeis: ['coordenacao'],
    oQueE: 'Importar planilha traz o histórico antigo (CSV de qualquer jeito) com deduplicação por nome+nascimento — toda decisão aparece num relatório antes de gravar.',
    chips: ['Como importo uma planilha antiga?'],
    tarefas: [],
  },
  {
    id: 'relatorio', papeis: ['diretoria'],
    oQueE: 'O Relatório do doador tem sete blocos com números do banco, supressão de célula pequena antes da redação e o revisor de sobre-alegação — você gera, revisa e publica.',
    chips: ['Como gero o relatório?', 'O que é a supressão?'],
    tarefas: [
      { intencoes: ['supress', 'celula pequena', 'menos de 5'], resposta: 'Nenhum número publicado sai de um grupo com menos de 5 crianças — grupos pequenos são agrupados e a supressão é declarada no próprio relatório. É proteção de identificação, aplicada antes da redação.', acao: 'relatorio' },
    ],
  },
  {
    id: 'impacto', papeis: ['diretoria'],
    oQueE: 'A tela Impacto monta cenários EXPLORATÓRIOS de SROI: sempre três cenários e uma faixa, premissas com fonte à vista, e a regra de ouro — associação compatível, nunca causalidade comprovada.',
    chips: ['O que estes números significam?', 'Posso usar com doadores?'],
    tarefas: [
      { intencoes: ['usar com doador', 'divulgar', 'publicar impacto'], resposta: 'Os cenários servem para conversa de captação COM as ressalvas à vista — e uso externo exige revisão humana antes (é gate da metodologia). Nunca apresente um número único: a faixa é o dado.', acao: 'impacto' },
    ],
  },
  {
    id: 'consulta', papeis: ['diretoria'],
    oQueE: 'Perguntar à base responde perguntas em linguagem natural sobre a camada agregada — com números vindos do banco; o que ela não reconhece, ela diz que não sabe.',
    chips: ['O que posso perguntar aqui?'],
    tarefas: [],
  },
  // As entradas abaixo ficam DEPOIS de 'criancas' de propósito: guiaDe casa
  // por startsWith e '#/criancas' precisa vencer antes de '#/crianca'.
  {
    id: 'folha', papeis: ['educador'],
    oQueE: 'A Folha do dia é o registro à mão do encontro da TURMA — atividade, área temática, como o grupo esteve e quantos pediram ajuda: os mesmos campos que a voz preenche.',
    chips: ['Como preencho a folha?', 'Posso ajustar depois?', 'Qual a diferença para a voz?'],
    tarefas: [
      { intencoes: ['preench', 'registrar a folha', 'como faco a folha', 'campos'], resposta: 'Escolha a atividade e a área, marque como a turma esteve e quantos pediram ajuda, e guarde. A voz faz o mesmo caminho falando — nenhum dos dois grava nada sem a sua confirmação.', acao: 'folha' },
      { intencoes: ['ajustar', 'corrig', 'editar', 'mudar depois'], resposta: 'Dá para ajustar enquanto o dia não fecha: abra a mesma data e registre de novo — o que você confirmar por último é o que vale.', acao: 'folha' },
      { intencoes: ['diferenca', 'voz ou folha', 'em vez de falar'], resposta: 'Voz e folha preenchem os MESMOS campos: a voz é atalho, a folha é o caminho à mão. A escolha é sua, todo dia.', acao: null },
    ],
  },
  {
    id: 'confirmar', papeis: ['educador'],
    oQueE: 'A tela "O que entendi" mostra os campos extraídos da sua fala para você conferir e ajustar — NADA é gravado antes do seu toque em confirmar, e a transcrição é descartada nesse momento.',
    chips: ['Já foi gravado?', 'Posso corrigir um campo?', 'E se estiver tudo errado?'],
    tarefas: [
      { intencoes: ['ja foi gravado', 'já foi gravado', 'salvou', 'ta gravado', 'está gravado'], resposta: 'Ainda não: esta tela existe exatamente para você conferir antes. Só o seu toque em confirmar grava — e a transcrição morre nesse momento.', acao: null },
      { intencoes: ['corrig', 'ajustar', 'mudar', 'errado', 'errou'], resposta: 'Ajuste qualquer campo à vontade — vale o que você confirmar, não o que a extração sugeriu. Se estiver tudo errado, descarte e conte de novo, ou preencha à mão na folha.', acao: null },
    ],
  },
  {
    id: 'alertas', papeis: ['educador', 'coordenacao'],
    oQueE: 'Os Alertas de ausência disparam com faltas consecutivas na chamada — para agir antes de virar evasão: a coordenação liga para a família e a tratativa fica registrada.',
    chips: ['Quando um alerta dispara?', 'Como trato um alerta?', 'O que é esta tela?'],
    tarefas: [
      { intencoes: ['dispara', 'quando abre', 'faltas seguidas', 'consecutivas', 'por que abriu'], resposta: 'Um alerta abre quando a criança acumula faltas consecutivas na chamada — por isso marcar falta importa tanto quanto marcar presença.', acao: null },
      { intencoes: ['tratar', 'trato', 'resolver', 'encerrar', 'avisar a coordenacao'], resposta: 'Toque no alerta para registrar a tratativa: avisar a coordenação (que faz o contato com a família) ou encerrar quando estiver resolvido.', acao: null },
    ],
  },
  {
    id: 'observacao', papeis: ['educador'],
    oQueE: 'A Observação registra o seu olhar sobre uma criança nas dimensões do ciclo, nível a nível, com as âncoras da rubrica — decisão sua em cada marca; nenhum nível é sugerido por modelo.',
    chips: ['Como marco os níveis?', 'O que é a âncora?', 'Preciso preencher tudo?'],
    tarefas: [
      { intencoes: ['marco os niveis', 'marcar nivel', 'como marco', 'niveis'], resposta: 'Em cada dimensão, toque no nível que melhor descreve o que você VIU — a âncora de cada nível descreve o comportamento observável, para duas educadoras marcarem parecido.', acao: null },
      { intencoes: ['ancora', 'rubrica'], resposta: 'A âncora é a frase que descreve o que se observa em cada nível da rubrica — ela existe para a marcação ser comparável entre educadoras (é a base da calibração).', acao: null },
      { intencoes: ['preencher tudo', 'tudo obrigatorio', 'em branco', 'nao observei', 'não observei'], resposta: 'Marque só o que você observou — o que não deu para ver fica em branco. Falta de dado é informação honesta, não falha.', acao: null },
    ],
  },
  {
    id: 'crianca', papeis: ['educador', 'coordenacao'],
    oQueE: 'A ficha viva mostra o percurso de uma criança — presença, observações e evolução — sempre dentro do escopo das suas turmas e do consentimento registrado.',
    naoEnxergo: 'Eu não abro o conteúdo de nenhuma ficha — só sei explicar o que a tela mostra e por que algo pode estar fechado.',
    chips: ['O que é esta tela?', 'Por que uma ficha não abre?', 'O que significa bloqueada?'],
    tarefas: [
      { intencoes: ['nao abre', 'não abre', 'bloquead', 'sem acesso', 'fechada'], resposta: 'A ficha só abre para quem convive com a criança (escopo de turma) e respeita o consentimento registrado. Se estiver bloqueada, o caminho é a coordenação — eu não abro a ficha de nenhum caso.', acao: null },
    ],
  },
];

// ---------------------------------------------------------------------------
// Casamento determinístico de intenção — o modo guia (e o fallback do modelo).
// ---------------------------------------------------------------------------
const semAcento = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const guiaDe = (tela) => GUIA.find(g => tela && tela.startsWith(`#/${g.id}`)) ?? null;
export const guiaDoPapel = (papel) => GUIA.filter(g => g.papeis.includes(papel));

// Vocabulário do produto — o domínio do Passo. Fora dele, o modelo não responde.
const VOCABULARIO = new Set([
  'percurso', 'tela', 'app', 'aplicativo', 'sistema', 'ajuda', 'passo',
  'chamada', 'presenca', 'presente', 'falta', 'cronometro', 'salvar',
  'folha', 'voz', 'gravar', 'microfone', 'audio', 'ditado', 'terminei',
  'ciclo', 'observacao', 'observar', 'rubrica', 'ancora', 'bloquead',
  'pauta', 'sugestao', 'painel', 'ficha', 'busca',
  'copilot', 'refletir', 'score', 'scores', 'safra', 'safras', 'evasao',
  'sintese', 'revisor', 'consentimento', 'consentimentos', 'importar', 'planilha',
  'relatorio', 'doador', 'supressao', 'impacto', 'sroi', 'cenario', 'consulta',
  'cobertura', 'calibra', 'alerta', 'registro', 'registrar', 'retomar', 'navega',
  'encontro',   // o encontro com a turma — vocabulário central do produto
]);

export function dominioDoProduto(texto) {
  const t = semAcento(texto);
  return [...VOCABULARIO].some(v => t.includes(v));
}

// Pergunta reflexivo-pedagógica tem PRECEDÊNCIA sobre o vocabulário: "como
// lidar com uma criança que bate" menciona palavras do produto, mas é conversa
// para o copilot (com RAG, 7 blocos e verificador) — nunca para o Passo.
const REFLEXIVA = /(como lidar|o que fa[çc]o com|o que fazer com|como agir|como ajudar|se comporta|comportamento|briga|bate\b|morde|birra|agressiv|agitad|dispers|nao participa|não participa|timid|conflito|disciplina)/;
export function pareceReflexiva(texto) {
  return REFLEXIVA.test(semAcento(texto));
}

export function casarIntencao(texto, tela, papel) {
  const t = semAcento(texto);
  const daTela = guiaDe(tela);
  const doPapel = guiaDoPapel(papel);

  // 1. tarefas — primeiro a tela atual, depois as demais do papel.
  // A pontuação é o comprimento da MAIOR intenção casada: "como marco todos
  // presentes?" precisa vencer pela intenção específica ('todos presentes'),
  // não perder para duas genéricas curtas somadas ('presente' + 'como marco').
  const listas = [daTela, ...doPapel.filter(g => g !== daTela)].filter(Boolean);
  let melhor = null;
  for (const g of listas) {
    for (const tarefa of g.tarefas) {
      const casadas = tarefa.intencoes.map(semAcento).filter(i => t.includes(i));
      const pontos = casadas.length ? Math.max(...casadas.map(i => i.length)) : 0;
      if (pontos > 0 && (!melhor || pontos > melhor.pontos)) {
        melhor = { pontos, resposta: tarefa.resposta, acao: validarAcao(tarefa.acao, papel) };
      }
    }
    if (melhor && g === daTela) break; // tarefa da tela atual vence
  }
  if (melhor) return { resposta: melhor.resposta, acao: melhor.acao };

  // 2. "o que é esta tela" / "para que serve"
  if (/(o que e|o que é|que tela|para que serve|pra que serve|onde estou)/.test(t) && daTela) {
    return { resposta: daTela.oQueE, acao: null };
  }

  // 3. intenção de navegação: "ir/abrir/levar/como chego" + nome de tela.
  // Palavras vazias fora do casamento: "como" está no rótulo "Contar como foi
  // (voz)" e fazia TODA frase "como chego …" oferecer a tela errada. E "hoje"
  // — id da primeira tela E palavra de quase toda frase — só vence quando é o
  // ÚNICO candidato ("quero ver a chamada de hoje" tem que oferecer a Chamada).
  if (/(ir para|abrir|abre|leva|me leve|como chego|onde fica|quero ver)/.test(t)) {
    const candidatos = [];
    for (const a of catalogoDoPapel(papel)) {
      const tokens = semAcento(a.rotulo).split(/\s+/).map(p => p.replace(/[()]/g, ''));
      if (tokens.some(p => p.length >= 4 && !PALAVRAS_VAZIAS.has(p) && t.includes(p)) || t.includes(a.id)) {
        candidatos.push(a);
      }
    }
    const a = candidatos.find(c => c.id !== 'hoje') ?? candidatos[0];
    if (a) return { resposta: `${a.rotulo} — posso te levar até lá.`, acao: a };
  }

  // 4. "o que é X" sobre outra tela do papel — mesma regra do "hoje" acima.
  const candidatos = [];
  for (const g of doPapel) {
    const a = validarAcao(g.id, papel);
    const tokens = a ? semAcento(a.rotulo).split(/\s+/).map(p => p.replace(/[()]/g, '')) : [];
    if (a && (t.includes(g.id) || tokens.some(p => p.length >= 5 && !PALAVRAS_VAZIAS.has(p) && t.includes(p)))) {
      candidatos.push({ g, a });
    }
  }
  const esc = candidatos.find(c => c.g.id !== 'hoje') ?? candidatos[0];
  if (esc) return { resposta: esc.g.oQueE, acao: esc.a };
  return null;
}

const PALAVRAS_VAZIAS = new Set(['como', 'para', 'foi', 'com', 'sem', 'por']);

// A fala é mais restrita que a tela: pseudônimo ou nome do roster derruba a
// fala inteira (a resposta de tela permanece). SEM a flag `i` no [A-Z]: com
// ela, "criança na hora" casava e derrubava fala legítima — o pseudônimo é
// sempre "Criança A" (letra maiúscula).
export function limparFala(fala, roster) {
  if (!fala) return null;
  if (/[Cc]rian[çc]as?\s+[A-Z]{1,2}\b/.test(fala)) return null;
  if (anonimizarTexto(fala, roster).substituicoes > 0) return null;
  return fala.length > 220 ? null : fala;
}

const REDIRECIONAMENTO = {
  educador: {
    resposta: 'Essa é uma conversa para a sala de reflexão, não para mim — eu sou o guia do produto. No Refletir, o copilot pensa junto com você: perguntas, hipóteses e alternativas, com fontes. Quer ir até lá?',
    acaoId: 'copilot',
  },
  coordenacao: {
    resposta: 'Essa é uma conversa para a sala de reflexão, não para mim — eu sou o guia do produto. No Refletir, o copilot pensa junto com você: perguntas, hipóteses e alternativas, com fontes. Quer ir até lá?',
    acaoId: 'copilot',
  },
  diretoria: {
    resposta: 'Eu sou o guia do produto e a diretoria trabalha sobre a camada agregada — conversa pedagógica sobre situações de turma é da equipe que convive com as crianças. Posso te ajudar com o relatório, o impacto ou a consulta à base.',
    acaoId: null,
  },
};

let PROMPT_PASSO = null;

// Import tardio de propósito: relatorio.js importa domain/scores/db, e o topo
// deste arquivo é lido por módulos que não querem esse peso. `consultar` lança
// 422 em texto vazio — aqui isso é "não é pergunta agregada", nunca um erro.
let _consultar = null;
function consultarAgregado(pergunta) {
  try {
    if (!_consultar) return null;
    const r = _consultar(pergunta);
    return r?.reconhecida ? r : null;
  } catch { return null; }
}
/** Ligado por src/api.js no boot — evita ciclo de import com relatorio.js. */
export function ligarConsultaAgregada(fn) { _consultar = fn; }

// ---------------------------------------------------------------------------
// O pipeline do Passo.
// ---------------------------------------------------------------------------
export async function assistente(u, { message, session_id, tela }) {
  const texto = String(message ?? '').trim();
  if (!texto) throw erro(422, 'Escreva ou fale sua dúvida.');
  if (texto.length > 500) throw erro(422, 'Pergunta longa demais (máx. 500 caracteres).');
  const sessaoId = String(session_id || randomUUID()).slice(0, 80);
  const roster = nomesParaAnonimizar(u);
  tela = telaSegura(tela);   // fora da lista fechada de rotas → '' (nunca vai a prompt)

  // 1. perímetro no texto ORIGINAL — barrado vira encaminhamento SEM fala.
  const perimetro = filtrarPerimetro(texto, roster);
  const restante = (perimetro.limpo.match(/\S+/g) || []).length;
  if (perimetro.bloqueado && restante < 6) {
    return {
      session_id: sessaoId, origem: 'guia', tipo: 'encaminhamento', fala: null,
      resposta: 'Tem algo aí que não entra no sistema — fale com a coordenação; esse caminho é fora daqui. Nada foi gravado nem enviado a modelo nenhum.',
      trechos: perimetro.trechos, acao: null,
    };
  }

  // Perímetro PARCIAL (sobrou pergunta válida): o resto do pipeline segue,
  // mas os trechos retidos e o caminho humano viajam em TODA resposta —
  // retenção nunca é silenciosa (bloco 6/F5), e a resposta não vira fala.
  const extraPerimetro = perimetro.bloqueado ? {
    trechos_excluidos: perimetro.trechos,
    aviso_perimetro: 'Uma parte do que você contou não entra no sistema — não foi gravada nem enviada a modelo nenhum. Se for situação de proteção, o caminho é a coordenação.',
  } : {};

  // 2. recusas determinísticas (herdadas do copilot) — sem fala.
  for (const r of RECUSAS) {
    if (r.re.test(perimetro.limpo)) {
      return { session_id: sessaoId, origem: 'guia', tipo: 'recusa', fala: null, resposta: r.resposta, acao: null, ...extraPerimetro };
    }
  }

  // 3. diretoria + nome de criança = recusa da decisão 16 — sem modelo, sem memória.
  const anon = anonimizarTexto(perimetro.limpo, roster);
  if (u.papel === 'diretoria' && anon.substituicoes > 0) {
    return {
      session_id: sessaoId, origem: 'guia', tipo: 'recusa', fala: null, acao: null,
      resposta: 'A diretoria trabalha sobre a camada agregada — registro individual de criança não abre neste perfil, nem em conversa comigo. Posso te ajudar com o relatório, o impacto ou a consulta à base.',
      ...extraPerimetro,
    };
  }

  const pergunta = anon.texto;

  // 3.5. PERGUNTA AGREGADA (só coordenação e diretoria — é o mesmo perímetro da
  // rota /api/consulta). Quem pergunta "quantas crianças estão em risco de
  // sair?" quer o NÚMERO, e o número existe em SQL. Antes deste portão, três
  // dessas perguntas caíam em "eu só sei do Percurso" e as outras três
  // devolviam a descrição genérica da tela — o chip prometia dado e entregava
  // texto de ajuda.
  //
  // DUAS TRAVAS, e elas são o motivo de o portão viver aqui e não depois:
  //  · a resposta é o retorno VERBATIM de consultar() — SQL puro. Nenhum modelo
  //    vê, reescreve ou confere este número.
  //  · nada disso entra em `sessao.trocas`. Sem esta linha, o número voltaria ao
  //    prompt do modelo no turno seguinte, pelo histórico — escore chegando ao
  //    modelo pela porta de trás, exatamente o que a doutrina proíbe.
  //  · `fala: null` sempre: contagem agregada não é coisa para o aparelho ler
  //    em voz alta numa sala.
  if (u.papel === 'coordenacao' || u.papel === 'diretoria') {
    const ag = consultarAgregado(pergunta);
    if (ag) {
      const acao = validarAcao('consulta', u.papel);
      return {
        session_id: sessaoId, origem: 'banco', tipo: 'resposta', fala: null,
        resposta: ag.resposta, fonte: ag.fonte, doutrina: ag.doutrina,
        acao: acao ? { id: acao.id, rotulo: acao.rotulo, hash: acao.hash } : null,
        ...extraPerimetro,
      };
    }
  }

  // 4. porta lateral fechada. Dois casos distintos, duas respostas distintas:
  //    (a) pergunta REFLEXIVA (precedência sobre o vocabulário) → o lugar é o
  //        copilot (educador/coordenação) ou a equipe (diretoria);
  //    (b) fora do produto de modo geral → o Passo declara o próprio limite,
  //        SEM empurrar para o copilot (capital da França não é reflexão).
  if (pareceReflexiva(pergunta)) {
    const red = REDIRECIONAMENTO[u.papel] ?? REDIRECIONAMENTO.educador;
    const acao = validarAcao(red.acaoId, u.papel);
    return {
      session_id: sessaoId, origem: 'guia', tipo: 'redirecionamento', fala: null,
      resposta: red.resposta, acao: acao ? { id: acao.id, rotulo: acao.rotulo, hash: acao.hash } : null,
      ...extraPerimetro,
    };
  }
  if (!dominioDoProduto(pergunta) && !casarIntencao(pergunta, tela, u.papel)) {
    return {
      session_id: sessaoId, origem: 'guia', tipo: 'redirecionamento', fala: null, acao: null,
      resposta: 'Eu só sei do Percurso — me pergunte pelas telas e tarefas (por exemplo: "como faço a chamada?" ou "o que é esta tela?").',
      ...extraPerimetro,
    };
  }

  // A sessão só nasce quando há conversa de verdade — pergunta que morre nos
  // portões acima não semeia entrada no Map.
  const sessao = memoria.sessaoDe(u, sessaoId);

  // 5. modo guia determinístico — resposta garantida com ou sem modelo.
  const deterministica = casarIntencao(pergunta, tela, u.papel);
  const respostaGuia = deterministica ?? {
    resposta: (guiaDe(tela)?.oQueE ? `Sobre esta tela: ${guiaDe(tela).oQueE} Se não era isso, me pergunte pela tarefa — por exemplo: "como marco uma falta?".` :
      'Não entendi de que parte do Percurso você fala — me pergunte pela tela ou pela tarefa (por exemplo: "como faço a chamada?").'),
    acao: null,
  };

  const responder = (r, origem) => {
    const acao = r.acao ? { id: r.acao.id, rotulo: r.acao.rotulo, hash: r.acao.hash } : null;
    // `'fala' in r` distingue o guia (sem campo fala — falar a resposta é
    // intencional) do modelo (fala:null é JULGAMENTO de segurança e fica de
    // pé — o ?? antigo o descartava). Perímetro parcial também cala a fala.
    const candidata = 'fala' in r ? r.fala : r.resposta;
    const fala = perimetro.bloqueado ? null : limparFala(candidata, roster);
    sessao.trocas.push({ pergunta, resposta: r.resposta });
    if (sessao.trocas.length > MAX_TROCAS) sessao.trocas.shift();
    return { session_id: sessaoId, origem, tipo: 'resposta', resposta: r.resposta, fala, acao, ...extraPerimetro };
  };

  // 6. com modelo: o Qwen refina dentro do domínio; QUALQUER falha (fora do
  //    ar, timeout, fila cheia, saída ruim) cai no guia — nunca 503 para o Passo.
  if (AI_ASSISTENTE) {
    try {
      PROMPT_PASSO ??= readFileSync(join(RAIZ, 'ai', 'prompts', 'assistente-passo.md'), 'utf8')
        .split('\n---\n').pop().trim();
      const catalogo = catalogoDoPapel(u.papel);
      const guiaCompacto = guiaDoPapel(u.papel).map(g =>
        `[${g.id}] ${g.oQueE}${g.naoEnxergo ? ' LIMITE: ' + g.naoEnxergo : ''}\n` +
        g.tarefas.map(tf => `  - ${tf.resposta}`).join('\n')).join('\n');
      const schema = {
        name: 'assistente_passo',
        schema: {
          type: 'object',
          required: ['resposta', 'fala', 'acao'],
          additionalProperties: false,
          properties: {
            resposta: { type: 'string' },
            fala: { anyOf: [{ type: 'null' }, { type: 'string' }] },
            acao: { anyOf: [{ type: 'null' }, { type: 'string', enum: catalogo.map(a => a.id) }] },
          },
        },
      };
      const historico = sessao.trocas.slice(-MAX_TROCAS).flatMap(tr => [
        { role: 'user', content: tr.pergunta },
        { role: 'assistant', content: tr.resposta },
      ]);
      const { objeto } = await comVaga(() => conversar({
        papel: 'reflexivo', schema, maxTokens: 320,
        mensagens: [
          { role: 'system', content: PROMPT_PASSO },
          { role: 'system', content: `GUIA DO PRODUTO (sua única fonte — não invente nada fora dele):\n${guiaCompacto}\n\nTELA ATUAL da pessoa: ${tela || 'desconhecida'} · PAPEL: ${u.papel}\nAÇÕES possíveis (ids): ${catalogo.map(a => `${a.id}=${a.rotulo}`).join(', ')}` },
          ...historico,
          { role: 'user', content: pergunta },
        ],
      }));
      const acao = validarAcao(objeto.acao, u.papel);
      const resposta = String(objeto.resposta || '').slice(0, 700);
      if (!resposta) throw new Error('resposta vazia');
      return responder({ resposta, fala: objeto.fala, acao }, 'modelo');
    } catch {
      return responder(respostaGuia, 'guia');
    }
  }
  return responder(respostaGuia, 'guia');
}

/** Chips e título para o painel, por tela e papel. */
export function chipsDe(u, tela) {
  const g = guiaDe(telaSegura(tela));
  const chips = (g && g.papeis.includes(u.papel)) ? g.chips : ['O que é esta tela?', 'O que dá para fazer aqui?'];
  return { chips: chips.slice(0, 3), com_modelo: AI_ASSISTENTE };
}
