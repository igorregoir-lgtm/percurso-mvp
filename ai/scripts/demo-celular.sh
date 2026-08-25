#!/usr/bin/env bash
# Percurso — demo no celular: sobe TUDO (modelo local + app + túnel HTTPS) e
# imprime a URL pública temporária com QR code para abrir no aparelho.
#
#   ai/scripts/demo-celular.sh            (com IA ligada — o padrão da demo)
#   AI_ENABLED=0 ai/scripts/demo-celular.sh   (sem IA; não sobe o modelo)
#
# ⚠ FERRAMENTA DE DEMONSTRAÇÃO, NÃO DE OPERAÇÃO (decisão técnica nº 25):
#   - a URL é pública e efêmera (morre com este script; muda a cada execução);
#   - o MVP não tem autenticação — qualquer pessoa com a URL escolhe um perfil;
#   - tolerável APENAS porque todos os dados são sintéticos.
# O bind do app continua 127.0.0.1: só o túnel alcança o processo; nada abre na
# rede local. O modelo continua em 127.0.0.1 e só o Node fala com ele.
#
# Requisitos de máquina: cloudflared e qrencode (brew install cloudflared qrencode).
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
IA="${AI_ENABLED:-1}"
PORTA="${PORTA:-3000}"
SCRATCH="$(mktemp -d /tmp/percurso-demo.XXXXXX)"
PIDS=()

command -v cloudflared >/dev/null || { echo "ERRO: cloudflared não encontrado (brew install cloudflared)."; exit 1; }
command -v qrencode   >/dev/null || { echo "AVISO: qrencode não encontrado — sem QR, só a URL."; }
command -v node       >/dev/null || { echo "ERRO: node não encontrado."; exit 1; }

limpar() {
  echo
  echo "Encerrando a demo (túnel morre junto — a URL deixa de existir)…"
  # Mata filhos E netos: alguns PIDs são de wrappers (start-llama.sh) cujos
  # processos reais (llama-server) são netos — kill no pai não os alcança.
  for pid in "${PIDS[@]:-}"; do
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  rm -rf "$SCRATCH"
}
trap limpar EXIT INT TERM

# Porta ocupada = outra instância (demo anterior? início automático?) — subir
# por cima exporia O SERVIDOR ERRADO numa URL pública. Erro claro, não corrida.
if lsof -tiTCP:"$PORTA" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERRO: a porta $PORTA já está em uso — outra instância do Percurso está no ar."
  echo "      Encerre-a antes (demo anterior? LaunchAgent do início automático?)"
  echo "      ou rode com outra porta: PORTA=3010 $0"
  exit 1
fi

# ---- 1. modelo local (se a IA estiver ligada e ninguém tiver subido antes) ---
if [ "$IA" = "1" ]; then
  if ! curl -s --max-time 2 http://127.0.0.1:8081/health | grep -q ok; then
    echo "Subindo o modelo local (Qwen3 4B em 127.0.0.1:8081)…"
    "$RAIZ/ai/scripts/start-llama.sh" > "$SCRATCH/llama.log" 2>&1 &
    PIDS+=($!)
    for i in $(seq 1 120); do
      curl -s --max-time 2 http://127.0.0.1:8081/health | grep -q ok && break
      sleep 1
      [ "$i" = "120" ] && { echo "ERRO: modelo não subiu (veja $SCRATCH/llama.log)."; exit 1; }
    done
    echo "  modelo pronto."
  else
    echo "Modelo local já está no ar em 127.0.0.1:8081 — reaproveitando."
  fi
fi

# ---- 2. o Percurso (bind 127.0.0.1 — só o túnel alcança) --------------------
echo "Subindo o Percurso em 127.0.0.1:$PORTA (AI_ENABLED=$IA)…"
# HOST explícito vence o "PORT implica 0.0.0.0" do server.js — o bind fica local.
# Sem subshell: $! precisa ser o PID do PRÓPRIO node para o cleanup alcançá-lo.
cd "$RAIZ"
AI_ENABLED="$IA" HOST=127.0.0.1 PORT="$PORTA" node server.js > "$SCRATCH/server.log" 2>&1 &
PIDS+=($!)
for i in $(seq 1 30); do
  curl -s --max-time 2 "http://127.0.0.1:$PORTA/api/sessao" >/dev/null && break
  sleep 0.5
  [ "$i" = "30" ] && { echo "ERRO: app não subiu (veja $SCRATCH/server.log)."; exit 1; }
done
echo "  app pronto."

# ---- 3. túnel HTTPS temporário ----------------------------------------------
echo "Abrindo o túnel HTTPS (cloudflared quick tunnel)…"
cloudflared tunnel --url "http://127.0.0.1:$PORTA" --no-autoupdate > "$SCRATCH/tunel.log" 2>&1 &
PIDS+=($!)
URL=""
for i in $(seq 1 60); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$SCRATCH/tunel.log" | head -1 || true)
  [ -n "$URL" ] && break
  sleep 1
done
[ -n "$URL" ] || { echo "ERRO: túnel não devolveu URL (veja $SCRATCH/tunel.log)."; exit 1; }

# ---- 4. manter o Mac acordado enquanto a demo durar -------------------------
caffeinate -dims &
PIDS+=($!)

clear 2>/dev/null || true
echo "════════════════════════════════════════════════════════════════"
echo
echo "  PERCURSO NO CELULAR — aponte a câmera para o QR ou digite:"
echo
echo "  $URL"
echo
command -v qrencode >/dev/null && qrencode -t ANSIUTF8 -m 2 "$URL"
echo
echo "  📱 Instalar como app:"
echo "     iPhone (Safari): Compartilhar → Adicionar à Tela de Início"
echo "     Android (Chrome): menu ⋮ → Instalar app (ou o prompt que aparecer)"
echo
echo "  🎙  A voz funciona no celular (HTTPS ✓). Entre como Maria e toque em"
echo "     Hoje → Contar como foi. O copilot está em Refletir$( [ "$IA" = "1" ] && echo " (IA ligada)" || echo " (IA DESLIGADA nesta execução)")."
echo
echo "  ⚠  URL pública e efêmera, sem senha, dados 100% sintéticos."
echo "     Feche com Ctrl+C — o túnel morre e a URL deixa de existir."
echo
echo "════════════════════════════════════════════════════════════════"
echo "Logs: $SCRATCH  ·  Ctrl+C encerra tudo."
wait
