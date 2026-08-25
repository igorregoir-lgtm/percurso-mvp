// Percurso — sessões de conversa em memória (compartilhado por copilot e Passo).
//
// UMA política para os dois chats: RAM apenas, TTL, chave por usuário+sessão,
// apagável. Nada persiste — a doutrina "memória só de sessão" mora aqui.
// Dois limites, não um: TTL (vida) e teto de QUANTIDADE (um cliente que mande
// um session_id novo a cada pedido não acumula RAM por uma hora).
export function criarSessoes(ttlMs = 60 * 60 * 1000, maxSessoes = 400) {
  const sessoes = new Map(); // `${educadorId}:${sessaoId}` → { trocas: [], tocadaEm }

  function sessaoDe(u, sessaoId) {
    const chave = `${u.id}:${sessaoId}`;
    const agora = Date.now();
    for (const [k, s] of sessoes) if (agora - s.tocadaEm > ttlMs) sessoes.delete(k);
    if (!sessoes.has(chave)) {
      // Teto cheio: a sessão inserida há mais tempo cede a vaga.
      if (sessoes.size >= maxSessoes) sessoes.delete(sessoes.keys().next().value);
      sessoes.set(chave, { trocas: [], tocadaEm: agora });
    }
    const s = sessoes.get(chave);
    s.tocadaEm = agora;
    return s;
  }

  // Lookup PURO — não cria entrada, não renova TTL. É o que prévia/doação
  // precisam: consultar uma sessão não pode estender a vida dela nem semear
  // uma entrada vazia no Map.
  function obter(u, sessaoId) {
    const s = sessoes.get(`${u.id}:${sessaoId}`);
    return (!s || Date.now() - s.tocadaEm > ttlMs) ? null : s;
  }

  function apagar(u, sessaoId) {
    sessoes.delete(`${u.id}:${sessaoId}`);
  }

  return { sessaoDe, obter, apagar };
}
