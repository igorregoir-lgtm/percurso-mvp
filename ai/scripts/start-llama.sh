#!/usr/bin/env bash
# Percurso — sobe o(s) llama-server local(is) (Fase 0 do plano de IA).
#
# Uso:  ai/scripts/start-llama.sh           (reflexivo: Qwen3 4B em 127.0.0.1:8081)
#       ai/scripts/start-llama.sh --mini    (estruturado: Qwen3 1.7B em 127.0.0.1:8082)
#       ai/scripts/start-llama.sh --ambos   (os dois, em portas separadas)
#
# Sempre em 127.0.0.1 — o modelo NUNCA escuta na rede; quem fala com ele é só o
# Node local. `--parallel 2` casa com a fila de 2 concorrentes do copilot
# (segunda requisição não serializa atrás da primeira).
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
MODELOS="$RAIZ/models"
CTX="${LLAMA_CTX:-16384}"          # 2 slots x 8k por conversa
PARALELO="${LLAMA_PARALLEL:-2}"

command -v llama-server >/dev/null || {
  echo "ERRO: llama-server não encontrado. Instale o llama.cpp (ex.: brew install llama.cpp)."
  exit 1
}

subir() { # $1=arquivo $2=porta $3=rotulo
  local gguf="$MODELOS/$1"
  [ -f "$gguf" ] || { echo "ERRO: $gguf não existe. Rode ai/scripts/setup-model.sh antes."; exit 1; }
  echo "Subindo $3 em http://127.0.0.1:$2 (ctx=$CTX, parallel=$PARALELO)..."
  llama-server -m "$gguf" --host 127.0.0.1 --port "$2" \
    -c "$CTX" --parallel "$PARALELO" -ngl 99 &
  echo "  pid $!"
}

case "${1:-}" in
  --mini)  subir "Qwen3-1.7B-Q8_0.gguf" 8082 "estruturado (Qwen3 1.7B)";;
  --ambos) subir "Qwen3-4B-Instruct-2507-Q4_K_M.gguf" 8081 "reflexivo (Qwen3 4B Instruct 2507)"
           subir "Qwen3-1.7B-Q8_0.gguf" 8082 "estruturado (Qwen3 1.7B)";;
  *)       subir "Qwen3-4B-Instruct-2507-Q4_K_M.gguf" 8081 "reflexivo (Qwen3 4B Instruct 2507)";;
esac

wait
