#!/usr/bin/env bash
# Percurso — setup dos modelos locais (Fase 0 do plano de IA).
# Baixa os GGUF declarados em ai/model-manifest.json para models/ e valida o
# SHA-256 de cada um. Idempotente: arquivo presente com hash correto é pulado.
#
# Uso:  ai/scripts/setup-model.sh            (todos os modelos)
#       ai/scripts/setup-model.sh reflexivo  (só o papel indicado)
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
MANIFEST="$RAIZ/ai/model-manifest.json"
DESTINO="$RAIZ/models"
PAPEL_FILTRO="${1:-}"

command -v node >/dev/null || { echo "ERRO: node não encontrado."; exit 1; }
mkdir -p "$DESTINO"

# O manifest é a fonte de verdade — o shell só executa o que ele declara.
node -e '
  const m = require(process.argv[1]);
  for (const mod of m.modelos) console.log([mod.papel, mod.arquivo, mod.url, mod.sha256].join("\t"));
' "$MANIFEST" | while IFS=$'\t' read -r papel arquivo url sha; do
  if [ -n "$PAPEL_FILTRO" ] && [ "$papel" != "$PAPEL_FILTRO" ]; then continue; fi
  alvo="$DESTINO/$arquivo"
  if [ -f "$alvo" ]; then
    atual=$(shasum -a 256 "$alvo" | cut -d' ' -f1)
    if [ "$atual" = "$sha" ]; then
      echo "OK      $arquivo (hash confere)"
      continue
    fi
    echo "AVISO   $arquivo existe com hash errado — rebaixando"
    rm -f "$alvo"
  fi
  echo "BAIXANDO $arquivo ..."
  curl -L --retry 3 -C - -o "$alvo" "$url"
  atual=$(shasum -a 256 "$alvo" | cut -d' ' -f1)
  if [ "$atual" != "$sha" ]; then
    echo "ERRO    SHA-256 de $arquivo não confere:"
    echo "        esperado: $sha"
    echo "        obtido:   $atual"
    exit 1
  fi
  echo "OK      $arquivo baixado e validado"
done

echo
echo "Modelos prontos em models/. Próximo passo: ai/scripts/start-llama.sh"
