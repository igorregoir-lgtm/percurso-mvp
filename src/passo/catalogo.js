// Percurso — o catálogo de sugestões do Passo.
//
// Cada entrada é uma coisa que o Passo pode oferecer a UMA pessoa, em UMA tela,
// QUANDO o estado real acender o gatilho. É escrito à mão de propósito: a
// urgência institucional (`base`) é decisão humana auditável, não saída de
// modelo. O modelo, quando ligado, só REORDENA candidatos e pode encurtar o
// `rotulo` — nunca inventa entrada, nunca escreve número, nunca escolhe ação.
//
// AS SETE REGRAS DE ESCRITA (todas viram teste em scripts/unit-test.mjs):
//  1. `rotulo` NÃO contém dígito. É a trava estrutural que impede número nascido
//     de modelo: o único campo que o modelo pode reescrever é livre de dígito
//     por construção, então nenhum número exibido pode ter vindo dele.
//  2. `texto` nunca interpola nome de criança nem nome de turma. Interpola
//     contagem — e, quando o número é de crianças e cai abaixo do mínimo de
//     célula, usa a variante qualitativa ("algumas crianças").
//  3. Entrada de educadora com tipo 'aprimoramento' tem sujeito ∈ {sistema,
//     turma, instrumento, instituto}. NUNCA a pessoa, nunca o volume de trabalho
//     dela, nunca a velocidade dela.
//  4. Entrada da família cobertura/registro/tempo carrega a moldura do sistema.
//  5. Nenhum `texto`/`rotulo`/`porque` casa LINT_COBRANCA.
//  6. Nenhuma entrada de educadora nasce de coberturaRegistro, tempo de
//     registro, calibração, qualidade do extrator ou taxa de descarte — são as
//     métricas que o próprio produto declara medirem o SISTEMA, não a professora.
//  7. Nenhum texto de nenhum papel contém nome de turma (turma.educador_id é
//     1:1 — nomear a turma é nomear a educadora com outro rótulo).
import { PARAMS } from '../domain.js';

// --------------------------------------------------------------------------
// O lint de cobrança. Sugestão que acusa não é parceria — é chefe.
// --------------------------------------------------------------------------
// DUAS armadilhas que este regex já teve, e por isso ele é assim:
//  1. O `\b` que fechava o grupo ANULAVA duas alternativas. Em "está atrasada"
//     o caractere seguinte é `a` (não há fronteira); em "falta você" a última
//     letra é `ê`, que não é `\w` sem a flag `u`. Resultado: "Você está
//     atrasada com a folha" PASSAVA no lint que existe para barrá-la.
//  2. Sem normalizar acento, "voce esta atrasado" (teclado sem acento, celular
//     com corretor desligado) escapava de todas as alternativas.
// Por isso: comparação sobre texto SEM acento e sem `\b` no fecho.
const semAcento = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const COBRANCA = /(voce\s+(nao|ainda nao|deixou|esqueceu|falhou|precisa|deveria|tem que|esta\s+atrasad)|em atraso|pendencia\s+sua|sua responsabilidade|falta\s+voce|esta\s+devendo|nao deixe acumular|vamos correr|ficou para tras|ficando para tras)/;
export const semCobranca = (t) => !COBRANCA.test(semAcento(t));

// Contagem de crianças abaixo do mínimo de célula vira qualitativa.
const criancas = (n) => n >= PARAMS.MINIMO_CELULA ? `${n} crianças` : 'algumas crianças';
const plural = (n, um, muitos) => n === 1 ? um : muitos.replace('{n}', String(n));

export const SEMPRE = () => true;

// --------------------------------------------------------------------------
// EDUCADORA — 20 entradas.
// O que ela NUNCA recebe: cobertura de registro, tempo de registro, taxa de
// correção do extrator, taxa de descarte, contagem de dias parada.
// --------------------------------------------------------------------------
const EDUCADOR = [
  {
    // `apenasResumo`: alimenta o resumo do dia e NUNCA ocupa vaga de chip. Sem
    // isto, quem voltou depois de um tempo fora via esta linha cravada no slot 1
    // de TODA tela, todo dia — boas-vindas viram cobrança por repetição.
    id: 'edu.retomada', tipo: 'acao', classe: 'pendencia', sujeito: 'sistema',
    nucleo: true, imune: true, apenasResumo: true, base: 90, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.em_lapso,
    rotulo: 'Que bom te ver de volta',
    texto: () => 'As datas em aberto continuam lá, sem pressa — nenhuma expira. Nada se perdeu enquanto você esteve fora.',
    porque: () => 'faz alguns dias desde o último registro',
    acao: 'hoje',
  },
  {
    id: 'edu.chamada_hoje', tipo: 'acao', classe: 'pendencia', sujeito: 'sistema',
    nucleo: true, base: 84, telas: ['#/voz', '#/folha', '#/ciclo', '#/turma', '#/criancas'],
    suprimidoEm: ['#/hoje', '#/chamada'],
    gatilho: (e) => e.dia_letivo && e.chamada_pendente,
    rotulo: 'A chamada de hoje está aberta',
    texto: () => 'Hoje tem encontro e a chamada ainda está em aberto. Um toque por criança, e o registro termina junto com o encontro.',
    porque: () => 'hoje é dia letivo e a chamada não foi salva',
    acao: 'chamada',
  },
  {
    id: 'edu.folha_atrasada', tipo: 'acao', classe: 'pendencia', sujeito: 'sistema',
    nucleo: true, base: 78, telas: ['#/chamada', '#/voz', '#/folha', '#/turma'],
    suprimidoEm: ['#/hoje'],
    gatilho: (e) => e.folhas_atrasadas > 0,
    rotulo: 'Contar como foi um encontro que ficou',
    texto: (e) => plural(e.folhas_atrasadas, 'Um encontro ficou sem folha.', '{n} encontros ficaram sem folha.')
      + ' Dá para contar como foi falando por quarenta segundos — e a data não expira.',
    porque: () => 'há encontro registrado sem folha correspondente',
    acao: 'voz',
  },
  {
    id: 'edu.ciclo_janela', tipo: 'acao', classe: 'pendencia', sujeito: 'sistema',
    nucleo: true, base: 80, telas: ['#/chamada', '#/voz', '#/turma', '#/criancas'],
    suprimidoEm: ['#/hoje', '#/ciclo'],
    gatilho: (e) => e.ciclo_pendentes > 0 && e.ciclo_dias_restantes <= 7,
    rotulo: 'A janela do ciclo está fechando',
    texto: (e) => `Faltam ${plural(e.ciclo_dias_restantes, 'um dia', '{n} dias')} para o fim do ciclo e ainda há `
      + `${plural(e.ciclo_pendentes, 'uma observação', '{n} observações')} para fazer. Dá para ir marcando aos poucos — o rascunho guarda sozinho.`,
    porque: () => 'o ciclo aberto tem observações pendentes e pouco prazo',
    acao: 'ciclo',
  },
  {
    id: 'edu.ciclo_rascunhos', tipo: 'acao', classe: 'pendencia', sujeito: 'sistema',
    nucleo: false, base: 64, telas: ['#/ciclo', '#/observacao'], suprimidoEm: [],
    gatilho: (e) => e.ciclo_rascunhos > 0,
    rotulo: 'Tem observação começada esperando',
    texto: (e) => plural(e.ciclo_rascunhos, 'Uma observação ficou', '{n} observações ficaram')
      + ' em rascunho. Ela reabre exatamente onde parou — não precisa começar de novo.',
    porque: () => 'há observação em rascunho no ciclo aberto',
    acao: 'ciclo',
  },
  {
    id: 'edu.datas_abertas', tipo: 'acao', classe: 'pendencia', sujeito: 'sistema',
    nucleo: false, base: 60, telas: ['#/turma', '#/ciclo', '#/criancas'],
    suprimidoEm: ['#/hoje', '#/chamada'],
    gatilho: (e) => e.datas_abertas > 0 && !e.em_lapso,
    rotulo: 'Há datas de chamada em aberto',
    texto: (e) => plural(e.datas_abertas, 'Uma data de chamada segue', '{n} datas de chamada seguem')
      + ' em aberto. Nenhuma expira: dá para fazer no dia que sobrar tempo, trocando a data no seletor.',
    porque: () => 'há encontro sem chamada salva',
    acao: 'chamada',
  },
  {
    id: 'edu.folha_aberta', tipo: 'acao', classe: 'oferta', sujeito: 'sistema',
    nucleo: false, base: 55, telas: ['#/folha', '#/confirmar'], suprimidoEm: [],
    gatilho: (e) => e.folha_aberta,
    rotulo: 'A folha do dia ainda dá para ajustar',
    texto: () => 'A folha deste encontro está aberta: enquanto o dia não fecha, você pode ajustar o que quiser. O que você confirmar por último é o que vale.',
    porque: () => 'a folha do último encontro está com status aberta',
    acao: 'folha',
  },
  {
    id: 'edu.pauta_indecisa', tipo: 'acao', classe: 'oferta', sujeito: 'instrumento',
    nucleo: false, base: 58, telas: ['#/chamada', '#/turma', '#/ciclo'],
    suprimidoEm: ['#/hoje', '#/pauta'],
    gatilho: (e) => e.pauta_indecisa,
    rotulo: 'A pauta da semana espera sua decisão',
    texto: () => 'Tem sugestão de pauta esperando um aceite ou um descarte. Descartar ajuda tanto quanto aceitar: é assim que a sugestão da próxima semana melhora.',
    porque: () => 'a pauta da semana tem sugestão sem decisão',
    acao: 'pauta',
  },
  {
    id: 'edu.alerta_turma', tipo: 'acao', classe: 'oferta', sujeito: 'instituto',
    nucleo: true, base: 76, telas: ['#/chamada', '#/ciclo', '#/turma', '#/criancas'],
    suprimidoEm: ['#/hoje', '#/alertas'],
    gatilho: (e) => e.alertas_turma > 0,
    rotulo: 'Há alerta de ausência na sua turma',
    // Sem contagem e sem nome de propósito: o sujeito da ação é a coordenação.
    texto: () => 'Há alerta de ausência aberto na sua turma. Quem liga para a família é a coordenação — aqui você só registra que viu.',
    porque: () => 'existe alerta de ausência aberto no seu escopo',
    acao: 'alertas',
  },
  {
    id: 'edu.radar_do_registro', tipo: 'aprimoramento', classe: 'melhoria', sujeito: 'sistema',
    nucleo: true, base: 74, telas: ['#/chamada', '#/hoje'], suprimidoEm: ['#/turma'],
    gatilho: (e) => e.sem_registro_3mais > 0,
    rotulo: 'Alguém pode estar fora do radar',
    texto: (e) => `${criancas(e.sem_registro_3mais)} estão sem registro de presença há três encontros ou mais. `
      + 'Isso fala do REGISTRO, não delas: é assim que alguém some do radar sem ninguém notar. Se o sistema está pedindo demais, o problema é nosso.',
    porque: () => 'há criança sem marcação de presença em três encontros seguidos',
    acao: 'chamada',
  },
  {
    id: 'edu.exposicao_turma', tipo: 'aprimoramento', classe: 'melhoria', sujeito: 'instituto',
    nucleo: false, base: 62, telas: ['#/turma', '#/ciclo', '#/chamada'],
    suprimidoEm: ['#/hoje', '#/pauta'],
    gatilho: (e) => e.exposicao_criancas > 0,
    rotulo: 'Um sonho da turma segue sem atividade',
    texto: (e) => `${criancas(e.exposicao_criancas)} da sua turma declararam interesse numa área que não teve atividade no período. `
      + 'A pauta da semana já traz uma sugestão pronta para essa lacuna.',
    porque: () => 'há área com interesse declarado e nenhuma atividade',
    acao: 'pauta',
  },
  {
    id: 'edu.tranquila', tipo: 'aprimoramento', classe: 'alivio', sujeito: 'turma',
    nucleo: false, base: 68, telas: ['#/hoje', '#/chamada', '#/turma'], suprimidoEm: [],
    gatilho: (e) => e.tranquila,
    rotulo: 'Ninguém sumiu do radar esta semana',
    texto: () => 'Ninguém sumiu do radar esta semana, e nenhum sonho da turma ficou sem atividade. Isso é o seu registro funcionando — não é sorte.',
    porque: () => 'a pauta da semana não encontrou risco nem lacuna',
    acao: 'turma',
  },
  {
    id: 'edu.voz_nunca_usada', tipo: 'pergunta', classe: 'saber', sujeito: 'instrumento',
    nucleo: false, base: 46, telas: ['#/folha', '#/chamada', '#/hoje'], suprimidoEm: ['#/voz'],
    gatilho: (e) => e.folhas_por_voz === 0 && e.folhas_total >= 3,
    rotulo: 'A voz preenche a folha falando. Como?',
    texto: () => 'A voz preenche os mesmos campos da folha: você fala por quarenta segundos sobre o encontro e confere os campos antes de guardar. É atalho, nunca obrigação.',
    porque: () => 'todas as suas folhas foram preenchidas à mão',
    acao: 'voz',
  },
  {
    id: 'edu.pergunta.bloqueio', tipo: 'pergunta', classe: 'saber', sujeito: 'sistema',
    nucleo: false, base: 52, telas: ['#/ciclo', '#/observacao'], suprimidoEm: [],
    gatilho: (e) => (e.bloq_consentimento + e.bloq_convivio) > 0,
    rotulo: 'Por que alguém aparece bloqueado?',
    texto: (e) => 'No ciclo há criança bloqueada para observação por dois motivos possíveis: falta de consentimento do responsável, ou tempo de convívio ainda curto para uma leitura justa. '
      + (e.bloq_consentimento > 0 ? 'O consentimento se resolve com a coordenação.' : 'A janela de convívio se resolve com o tempo.'),
    porque: () => 'há criança bloqueada na agenda do ciclo',
    acao: 'ciclo',
  },
  {
    id: 'edu.duvida.perimetro', tipo: 'duvida', classe: 'saber', sujeito: 'sistema',
    nucleo: true, base: 72, telas: ['#/voz', '#/confirmar', '#/folha'], suprimidoEm: [],
    gatilho: (e) => e.perimetro_na_ultima_folha,
    rotulo: 'Uma parte do relato ficou de fora',
    texto: () => 'No último relato, uma parte não entrou no sistema. Isso é o filtro de proteção funcionando, não erro seu: o trecho não foi gravado em lugar nenhum. Se for situação de proteção, o caminho é a coordenação.',
    porque: () => 'a última folha registrou conteúdo fora do perímetro',
    acao: null,
  },
  {
    id: 'edu.duvida.nivel_menor', tipo: 'duvida', classe: 'saber', sujeito: 'instrumento',
    nucleo: false, base: 44, telas: ['#/observacao'], suprimidoEm: [],
    gatilho: SEMPRE,
    rotulo: 'Na dúvida entre dois níveis, qual marcar?',
    // "se você não viu" casava o lint de cobrança. A frase diz o mesmo sem a
    // construção acusatória — e o lint continua estrito, sem exceção.
    texto: () => 'Marque o menor. A âncora descreve o que se observa: quando o comportamento do nível de cima não aconteceu na sua frente, ele não foi observado — e a rubrica mede o que foi visto.',
    porque: () => 'é a dúvida mais comum de quem está marcando níveis',
    acao: null,
  },
  {
    id: 'edu.duvida.branco_honesto', tipo: 'duvida', classe: 'saber', sujeito: 'instrumento',
    nucleo: false, base: 42, telas: ['#/observacao', '#/ciclo'], suprimidoEm: [],
    gatilho: SEMPRE,
    rotulo: 'Precisa preencher tudo?',
    texto: () => 'Não. Marque só o que você observou — o que não deu para ver fica em branco. Falta de dado é informação honesta, não falha.',
    porque: () => 'é a dúvida mais comum de quem está marcando níveis',
    acao: null,
  },
  {
    id: 'edu.duvida.cronometro', tipo: 'duvida', classe: 'saber', sujeito: 'sistema',
    nucleo: false, base: 40, telas: ['#/chamada'], suprimidoEm: [],
    gatilho: SEMPRE,
    rotulo: 'Para que serve o cronômetro?',
    texto: () => 'Ele mede quanto tempo a chamada leva — a promessa do Percurso é burocracia de no máximo dois minutos. Ele mede o SISTEMA, nunca você: se passar da meta, o problema é nosso, não seu.',
    porque: () => 'é o que mais confunde nesta tela',
    acao: null,
  },
  {
    id: 'edu.duvida.audio', tipo: 'duvida', classe: 'saber', sujeito: 'sistema',
    nucleo: false, base: 48, telas: ['#/voz', '#/confirmar'], suprimidoEm: [],
    gatilho: SEMPRE,
    rotulo: 'O áudio fica gravado em algum lugar?',
    texto: () => 'Não existe gravação de voz no Percurso. O áudio nunca sai do seu aparelho: o navegador transcreve na hora, o texto preenche os campos e morre na confirmação.',
    porque: () => 'é o que mais confunde nesta tela',
    acao: null,
  },
  {
    id: 'edu.duvida.ficha_fechada', tipo: 'duvida', classe: 'saber', sujeito: 'sistema',
    nucleo: false, base: 40, telas: ['#/crianca', '#/criancas'], suprimidoEm: [],
    gatilho: SEMPRE,
    rotulo: 'Por que uma ficha não abre?',
    texto: () => 'A ficha só abre para quem convive com a criança e respeita o consentimento registrado. Se estiver fechada, o caminho é a coordenação — eu não abro a ficha de nenhum caso.',
    porque: () => 'é o que mais confunde nesta tela',
    acao: null,
  },
  // A tela #/hoje é onde ela mais abre o Passo — e é a que já pinta seis
  // cartões. Sem entradas próprias, o painel caía nos chips estáticos de
  // sempre justamente ali. Estas três dizem o que a TELA NÃO diz.
  {
    id: 'edu.duvida.datas_nao_expiram', tipo: 'duvida', classe: 'saber', sujeito: 'sistema',
    nucleo: false, base: 50, telas: ['#/hoje'], suprimidoEm: [],
    gatilho: (e) => e.datas_abertas > 0,
    rotulo: 'O que acontece com data em aberto?',
    texto: () => 'Nada. Data em aberto não expira, não vira pendência e não some: ela fica esperando o dia em que sobrar tempo. O sistema é que se adapta ao encontro, não o contrário.',
    porque: () => 'há data de chamada em aberto',
    acao: null,
  },
  {
    id: 'edu.pergunta.o_que_muda', tipo: 'pergunta', classe: 'saber', sujeito: 'instituto',
    nucleo: false, base: 47, telas: ['#/hoje'], suprimidoEm: [],
    gatilho: (e) => e.folhas_total >= 3,
    rotulo: 'Para onde vai o que eu registro?',
    texto: () => 'O que você registra vira a leitura do ciclo da turma, a pauta de segunda e — em forma agregada, sem nome nenhum — o relatório de quem financia o instituto. Nenhuma criança aparece isolada em nada disso.',
    porque: () => 'é o que costuma faltar explicar sobre o registro',
    acao: 'turma',
  },
  {
    id: 'edu.duvida.privacidade', tipo: 'duvida', classe: 'saber', sujeito: 'sistema',
    nucleo: false, base: 45, telas: ['#/hoje', '#/turma'], suprimidoEm: [],
    gatilho: SEMPRE,
    rotulo: 'Quem enxerga o que eu escrevo?',
    texto: () => 'A coordenação enxerga o agregado da turma e as fichas do escopo dela; a diretoria só vê número agregado, nunca criança. Eu, o Passo, não abro ficha nenhuma — só sei contar quantas coisas estão em aberto, nunca quem.',
    porque: () => 'é a dúvida mais comum de quem começa a registrar',
    acao: null,
  },
];

// --------------------------------------------------------------------------
// COORDENAÇÃO — 12 entradas.
// PROIBIDO PARA SEMPRE: qualquer recorte de cobertura/tempo/correção POR
// educadora, e qualquer texto que nomeie a turma (é o mesmo recorte com outro
// rótulo). A tela #/scores já mostra a tabela nominal — lá é legítimo, numa
// tela de gestão lida por uma pessoa, fora de qualquer prompt.
// --------------------------------------------------------------------------
const COORDENACAO = [
  {
    id: 'coo.alerta_parado', tipo: 'acao', classe: 'pendencia', sujeito: 'instituto',
    nucleo: true, base: 88, telas: '*', suprimidoEm: ['#/alertas'],
    gatilho: (e) => e.alertas_parados > 0,
    rotulo: 'Alerta de ausência sem tratativa',
    texto: (e) => plural(e.alertas_parados, 'Um alerta de ausência está aberto', '{n} alertas de ausência estão abertos')
      + ' há mais de uma semana sem tratativa registrada. Cada um é uma família que ainda não recebeu ligação.',
    porque: () => 'há alerta aberto e sem tratativa há mais de sete dias',
    acao: 'alertas',
  },
  {
    id: 'coo.ciclo_vencido', tipo: 'acao', classe: 'pendencia', sujeito: 'sistema',
    nucleo: true, base: 86, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.ciclo_vencido_dias > 0,
    rotulo: 'O ciclo passou da data e segue aberto',
    texto: (e) => `O ciclo passou da data de fim há ${plural(e.ciclo_vencido_dias, 'um dia', '{n} dias')} e continua aberto. `
      + 'Enquanto ele não fecha, a síntese não sai e o relatório do doador fica sem o período.',
    porque: () => 'o ciclo aberto tem data de fim no passado',
    acao: 'sintese',
  },
  {
    id: 'coo.sintese_reprovada', tipo: 'acao', classe: 'pendencia', sujeito: 'instrumento',
    nucleo: true, base: 85, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.sintese_estado === 'rascunho_reprovado',
    rotulo: 'O revisor barrou a síntese',
    texto: () => 'O revisor de sobre-alegação reprovou o rascunho da síntese. Ele barra verbo causal forte e exige a ressalva metodológica — é a linguagem protegendo o instituto antes de o texto sair.',
    porque: () => 'o rascunho da síntese está reprovado pelo revisor',
    acao: 'sintese',
  },
  {
    id: 'coo.sintese_esperando', tipo: 'acao', classe: 'pendencia', sujeito: 'sistema',
    nucleo: true, base: 82, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.sintese_estado === 'rascunho_aprovado',
    rotulo: 'A síntese está pronta para aprovação',
    texto: () => 'O rascunho da síntese passou pelo revisor e espera a aprovação humana. Nenhum texto sai daqui sem alguém assinar embaixo.',
    porque: () => 'há rascunho de síntese aprovado pelo revisor e não aprovado por pessoa',
    acao: 'sintese',
  },
  {
    id: 'coo.consentimento_trava', tipo: 'acao', classe: 'pendencia', sujeito: 'instituto',
    nucleo: true, base: 80, telas: '*', suprimidoEm: ['#/consentimentos'],
    gatilho: (e) => e.consentimentos_bloqueando > 0,
    rotulo: 'Consentimento pendente trava a observação',
    texto: (e) => `${criancas(e.consentimentos_bloqueando)} não podem ser observadas por falta de consentimento ativo do responsável. `
      + 'Enquanto não houver registro, a educadora vê a criança bloqueada e não consegue avançar no ciclo.',
    porque: () => 'há matrícula ativa sem consentimento de rubrica registrado',
    acao: 'consentimentos',
  },
  {
    id: 'coo.turmas_sem_registro', tipo: 'acao', classe: 'oferta', sujeito: 'sistema',
    nucleo: false, base: 70, telas: '*', suprimidoEm: ['#/scores', '#/painel'],
    gatilho: (e) => e.turmas_sem_registro > 0,
    rotulo: 'Uma turma está sem folha completa',
    // Nunca o nome: turma.educador_id é 1:1. O destino (#/scores) mostra a
    // tabela nominal — recorte legítimo numa tela de gestão, fora do prompt.
    texto: (e) => plural(e.turmas_sem_registro, 'Uma turma está', '{n} turmas estão')
      + ' sem nenhuma folha completa no período. Antes de falar com quem registra, vale olhar se o sistema está pedindo mais do que cabe no encontro.',
    porque: () => 'há turma sem folha completa no período',
    acao: 'scores',
  },
  {
    id: 'coo.folhas_abertas', tipo: 'acao', classe: 'oferta', sujeito: 'sistema',
    nucleo: false, base: 56, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.folhas_abertas > 2,
    rotulo: 'Há folhas do dia ainda abertas',
    texto: (e) => `${e.folhas_abertas} folhas seguem abertas, esperando o fechamento do dia. Folha aberta ainda pode ser ajustada — só não entra no fechamento do ciclo.`,
    porque: () => 'há folhas com status aberta',
    acao: 'painel',
  },
  {
    id: 'coo.descarte_alto', tipo: 'aprimoramento', classe: 'melhoria', sujeito: 'instrumento',
    nucleo: false, base: 66, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.descarte_alerta,
    rotulo: 'A sugestão de pauta está sendo descartada',
    texto: (e) => `${e.descarte_pct}% das sugestões de pauta foram descartadas pelas educadoras. `
      + 'Isso é o sistema se autocriticando: acima do limiar, a sugestão costuma estar genérica demais para servir. Vale rever o banco de atividades por dimensão junto com elas.',
    porque: () => 'a taxa de descarte da pauta passou do limiar declarado',
    acao: 'scores',
  },
  {
    id: 'coo.cobertura_do_sistema', tipo: 'aprimoramento', classe: 'melhoria', sujeito: 'sistema',
    nucleo: false, base: 68, telas: ['#/sintese', '#/consentimentos', '#/safras'],
    suprimidoEm: ['#/painel', '#/scores'],
    gatilho: (e) => e.cobertura_alerta,
    rotulo: 'A cobertura do registro está baixa',
    texto: (e) => `A cobertura do registro está em ${e.cobertura_pct}%. Este número mede o SISTEMA, não as educadoras: `
      + 'cobertura baixa quase sempre quer dizer que o registro está pedindo mais do que cabe no encontro. Vale ler antes de fechar o ciclo.',
    porque: () => 'a cobertura do registro está abaixo do esperado',
    acao: 'painel',
  },
  {
    id: 'coo.calibracao', tipo: 'aprimoramento', classe: 'melhoria', sujeito: 'instrumento',
    nucleo: false, base: 64, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.calibracao_divergencias > 0,
    rotulo: 'Há divergência de leitura entre observadoras',
    texto: (e) => plural(e.calibracao_divergencias, 'Uma dimensão apresenta', '{n} dimensões apresentam')
      + ' leitura divergente entre quem observa. Isso é pauta de reunião e melhoria de âncora — nunca ranking de educadora: gente diferente enxerga diferente, e a rubrica existe para aproximar.',
    porque: () => 'a calibração do ciclo encontrou divergência entre observadoras',
    acao: 'painel',
  },
  {
    id: 'coo.pergunta.calibracao', tipo: 'pergunta', classe: 'saber', sujeito: 'instrumento',
    nucleo: false, base: 44, telas: '*', suprimidoEm: [],
    // Só faz sentido com ciclo em jogo — e assim o catálogo fica dentro do teto
    // de entradas SEMPRE, que existe para o painel não virar índice de ajuda.
    gatilho: (e) => e.ciclo_dias_restantes > 0 || e.ciclo_vencido_dias > 0,
    rotulo: 'Para que serve a calibração?',
    texto: () => 'A calibração compara como educadoras diferentes marcam a mesma dimensão. Ela existe para melhorar a âncora da rubrica e virar pauta de reunião — nunca para comparar pessoas.',
    porque: () => 'é o que mais confunde no painel',
    acao: 'painel',
  },
  {
    id: 'coo.duvida.supressao', tipo: 'duvida', classe: 'saber', sujeito: 'sistema',
    nucleo: false, base: 46, telas: '*', suprimidoEm: [],
    gatilho: SEMPRE,
    rotulo: 'Por que um número sumiu de uma tabela?',
    texto: () => `Grupo com menos de ${PARAMS.MINIMO_CELULA} crianças é agrupado ou suprimido antes de qualquer publicação. `
      + 'É proteção contra reidentificação, e o próprio relatório declara quantos recortes foram agrupados.',
    porque: () => 'é a dúvida mais comum sobre os números publicados',
    acao: null,
  },
  // Sem alívio, o painel da Rita só sabia falar do que está quebrado: no caso
  // típico, uma pendência e um aprimoramento — dois itens, ambos problema.
  // Quem faz a varredura precisa poder ouvir que a varredura deu limpo.
  {
    id: 'coo.tranquila', tipo: 'aprimoramento', classe: 'alivio', sujeito: 'instituto',
    nucleo: false, base: 72, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.alertas_parados === 0 && e.ciclo_vencido_dias === 0
      && e.consentimentos_bloqueando === 0 && e.sintese_estado !== 'rascunho_reprovado',
    rotulo: 'A varredura desta semana deu limpo',
    texto: () => 'Nenhum alerta parado sem tratativa, nenhum ciclo vencido, nenhum consentimento travando observação. Está tudo andando — e isso também é resultado do trabalho.',
    porque: () => 'nenhum dos sinais de atenção da coordenação está aceso',
    acao: 'painel',
  },
  {
    id: 'coo.pergunta.risco', tipo: 'pergunta', classe: 'saber', sujeito: 'instituto',
    nucleo: false, base: 50, telas: ['#/painel', '#/scores', '#/safras'], suprimidoEm: [],
    gatilho: (e) => e.alertas_abertos > 0,
    rotulo: 'Como o risco de evasão é calculado?',
    texto: () => 'O risco cruza faltas consecutivas com a própria linha de base da criança — nunca com a média das outras. Ele nomeia para a coordenação agir, e o alerta abre antes de virar evasão.',
    porque: () => 'há alerta de ausência aberto',
    acao: 'scores',
  },
  {
    id: 'coo.pergunta.sintese', tipo: 'pergunta', classe: 'saber', sujeito: 'instrumento',
    nucleo: false, base: 48, telas: ['#/sintese', '#/painel'], suprimidoEm: [],
    gatilho: (e) => e.sintese_estado !== 'inexistente',
    rotulo: 'O que o revisor da síntese verifica?',
    texto: () => 'Ele lê o texto procurando verbo causal forte e a ressalva metodológica. Nada sai daqui dizendo que o instituto causou um resultado — nem quando o número é bom.',
    porque: () => 'há síntese em jogo neste ciclo',
    acao: 'sintese',
  },
  {
    id: 'coo.duvida.escopo', tipo: 'duvida', classe: 'saber', sujeito: 'sistema',
    nucleo: false, base: 44, telas: ['#/criancas', '#/consentimentos'], suprimidoEm: [],
    gatilho: SEMPRE,
    rotulo: 'Por que a educadora não vê tudo?',
    texto: () => 'A educadora enxerga as crianças das turmas dela — o acesso é do educador da criança mais a coordenação. Papel sozinho não abre ficha: é o escopo que cumpre a governança declarada.',
    porque: () => 'é a dúvida mais comum sobre quem vê o quê',
    acao: null,
  },
];

// --------------------------------------------------------------------------
// DIRETORIA — 12 entradas. As seis `pergunta` são as INTENCOES de
// relatorio.js: o Passo responde ali mesmo, com número vindo de SQL.
// Nada individual entra aqui — a recusa da decisão 16 segue intocada.
// --------------------------------------------------------------------------
// [codigo, rótulo do chip (≤44, cabe em 375px), pergunta enviada a consultar()]
// O rótulo é curto porque é o que aparece no chip; a consulta é a frase inteira,
// que precisa casar os termos das INTENCOES de relatorio.js.
const PERGUNTAS_DIRETORIA = [
  ['contagem', 'Quantas crianças o instituto atende?', 'Quantas crianças o instituto atende?'],
  ['presenca', 'Como está a presença deste mês?', 'Como está a presença deste mês?'],
  // A consulta NÃO pode começar por "quantas crianças": consultar() casa a
  // primeira intenção da lista e 'contagem' tem o termo 'quantas crianc' —
  // o chip prometia evasão e devolvia o inventário.
  ['evasao', 'Quantas crianças estão em risco de sair?', 'Qual é o risco de evasão hoje?'],
  ['cobertura', 'Como está a cobertura do registro?', 'Como está a cobertura do registro?'],
  ['exposicao', 'Que áreas de sonho estão em aberto?', 'Quais áreas do Laboratório de Sonhos estão em aberto?'],
  ['ciclo', 'Como está o ciclo de observação?', 'Como está o ciclo de observação?'],
];

const DIRETORIA = [
  {
    id: 'dir.revisor_barrou', tipo: 'acao', classe: 'pendencia', sujeito: 'instrumento',
    nucleo: true, base: 88, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.relatorio_estado === 'rascunho' && e.revisor_status === 'reprovado',
    rotulo: 'O revisor barrou o rascunho',
    texto: () => 'O revisor de sobre-alegação barrou o rascunho do relatório. Ele recusa verbo causal forte e exige a ressalva metodológica — é a linguagem protegendo o instituto perante quem financia.',
    porque: () => 'o rascunho do relatório está reprovado pelo revisor',
    acao: 'relatorio',
  },
  {
    id: 'dir.rascunho_pronto', tipo: 'acao', classe: 'pendencia', sujeito: 'sistema',
    nucleo: true, base: 84, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.relatorio_estado === 'rascunho' && e.revisor_status === 'aprovado',
    rotulo: 'Há rascunho aprovado esperando publicação',
    texto: () => 'O rascunho do relatório passou pelo revisor e espera a sua publicação. Só a diretoria publica — e publicado não é sobrescrito por acidente.',
    porque: () => 'há rascunho aprovado pelo revisor e não publicado',
    acao: 'relatorio',
  },
  {
    id: 'dir.periodo_descoberto', tipo: 'acao', classe: 'oferta', sujeito: 'sistema',
    nucleo: false, base: 72, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.periodos_sem_relatorio > 0 && e.relatorio_estado === 'sem_relatorio',
    rotulo: 'Um período ainda não tem relatório',
    texto: (e) => plural(e.periodos_sem_relatorio, 'Um período sugerido ainda não tem', '{n} períodos sugeridos ainda não têm')
      + ' relatório gerado. O rascunho leva um toque, e ele já sai revisado.',
    porque: () => 'há período sugerido sem relatório gerado',
    acao: 'relatorio',
  },
  {
    id: 'dir.sem_publicacao', tipo: 'acao', classe: 'oferta', sujeito: 'instituto',
    nucleo: false, base: 60, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.dias_desde_publicacao > 120,
    rotulo: 'Faz tempo desde a última publicação',
    texto: (e) => `A última publicação para quem financia foi há ${e.dias_desde_publicacao} dias. `
      + 'Prestação de contas com intervalo curto é o que mantém a confiança de quem doa.',
    porque: () => 'passou muito tempo desde o último relatório publicado',
    acao: 'relatorio',
  },
  {
    id: 'dir.custo_ausente', tipo: 'aprimoramento', classe: 'melhoria', sujeito: 'instrumento',
    nucleo: false, base: 62, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.relatorio_estado !== 'sem_relatorio' && !e.custo_informado,
    rotulo: 'O relatório está sem o custo do período',
    texto: () => 'Sem o custo preenchido, o bloco de método publica só os denominadores. É o número que o doador pergunta primeiro — e as duas contas saem sempre juntas, por criança e por matrícula.',
    porque: () => 'o relatório mais recente não tem custo informado',
    acao: 'relatorio',
  },
  {
    id: 'dir.dose_nao_publicavel', tipo: 'aprimoramento', classe: 'melhoria', sujeito: 'instituto',
    nucleo: false, base: 54, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.relatorio_estado !== 'sem_relatorio' && !e.dose_publicavel,
    rotulo: 'A comparação de presença ficou de fora',
    texto: (e) => `A comparação entre quem vem mais e quem vem menos não foi publicada: um dos grupos tem menos de ${PARAMS.MINIMO_CELULA} crianças e o número apontaria para elas. `
      + 'Não publicar é a decisão certa — e o relatório diz isso ao leitor.',
    porque: () => 'o bloco de dose não passou no mínimo de célula',
    acao: 'relatorio',
  },
  {
    id: 'dir.duvida.sroi_faixa', tipo: 'duvida', classe: 'saber', sujeito: 'instrumento',
    nucleo: false, base: 50, telas: ['#/impacto'], suprimidoEm: [],
    gatilho: SEMPRE,
    rotulo: 'Por que o impacto sai como faixa?',
    texto: () => 'O impacto sai em três cenários e uma faixa porque toda proxy carrega incerteza. Número único de SROI não é publicável: a faixa é o dado honesto, e cada proxy declara fonte, ano-base e ressalva.',
    porque: () => 'é o que mais confunde nesta tela',
    acao: null,
  },
  {
    id: 'dir.duvida.individual', tipo: 'duvida', classe: 'saber', sujeito: 'sistema',
    nucleo: false, base: 48, telas: '*', suprimidoEm: [],
    gatilho: SEMPRE,
    rotulo: 'Por que não vejo criança por criança?',
    texto: () => 'A diretoria trabalha sobre a camada agregada por decisão de desenho: quem presta contas não precisa de acesso individual, e doar não pode virar caminho até a criança. É proteção, não limitação de perfil.',
    porque: () => 'é a dúvida mais comum deste perfil',
    acao: null,
  },
  {
    id: 'dir.tranquila', tipo: 'aprimoramento', classe: 'alivio', sujeito: 'instituto',
    nucleo: false, base: 70, telas: '*', suprimidoEm: [],
    gatilho: (e) => e.relatorio_estado === 'publicado' && e.periodos_sem_relatorio === 0
      && e.dias_desde_publicacao >= 0 && e.dias_desde_publicacao <= 120,
    rotulo: 'A prestação de contas está em dia',
    texto: () => 'O período mais recente já foi publicado e nenhum período sugerido ficou descoberto. Quem financia tem o que ler, e o texto passou pelo revisor antes de sair.',
    porque: () => 'não há período descoberto nem rascunho parado',
    acao: 'relatorio',
  },
  ...PERGUNTAS_DIRETORIA.map(([codigo, rotulo, consulta], i) => ({
    id: `dir.pergunta.${codigo}`, tipo: 'pergunta', classe: 'saber', sujeito: 'instituto',
    nucleo: false, base: 45 + i, telas: '*', suprimidoEm: [],
    // Rotativa: a mesma pergunta todo dia vira papel de parede.
    gatilho: (e, ctx) => ctx?.diaDoAno == null ? i === 0 : (ctx.diaDoAno % PERGUNTAS_DIRETORIA.length) === i,
    rotulo,
    texto: () => consulta,
    porque: () => 'esta é uma pergunta que eu respondo com número vindo do banco',
    acao: 'consulta',
    consulta,   // o painel responde ali mesmo, via R.consultar() — SQL puro
  })),
];

export const CATALOGO = [...EDUCADOR, ...COORDENACAO, ...DIRETORIA];

export const IDS_CATALOGO = new Set(CATALOGO.map(c => c.id));

export const doPapel = (papel) => CATALOGO.filter(c =>
  c.id.startsWith(papel === 'coordenacao' ? 'coo.' : papel === 'diretoria' ? 'dir.' : 'edu.'));

export const TIPOS = ['acao', 'pergunta', 'aprimoramento', 'duvida'];
export const CLASSES = ['pendencia', 'oferta', 'melhoria', 'alivio', 'saber'];
