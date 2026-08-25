#!/usr/bin/env bash
# Percurso — início automático no macOS (autonomia de operação).
#
# Registra um LaunchAgent no login do usuário: ligou o computador, o Percurso
# está no ar em http://localhost:3000 — sem Terminal, sem lembrar de nada.
# O agente usa KeepAlive: se o processo cair, o macOS o levanta de novo.
#
#   ai/scripts/instalar-inicio-automatico.sh            (instala e liga agora)
#   ai/scripts/instalar-inicio-automatico.sh --remover  (desfaz tudo)
#
# Só o NÚCLEO entra no início automático (decisão de desenho): a camada de IA
# é opcional e de demonstração — quem quiser, sobe com ai/scripts/start-llama.sh.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
ROTULO="br.org.ebenezer.percurso"
PLIST="$HOME/Library/LaunchAgents/$ROTULO.plist"
NODE_BIN="$(command -v node || true)"

if [ "${1:-}" = "--remover" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Início automático removido. O Percurso volta a ser ligado à mão (node server.js)."
  exit 0
fi

[ -n "$NODE_BIN" ] || { echo "ERRO: node não encontrado. Instale o Node LTS em nodejs.org e rode de novo."; exit 1; }
[ "$(uname)" = "Darwin" ] || { echo "ERRO: este script é para macOS. No Windows, use a pasta Inicializar (docs/MANUAL-DE-INSTALACAO.md)."; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$RAIZ/data"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$ROTULO</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$RAIZ/server.js</string>
  </array>
  <key>WorkingDirectory</key><string>$RAIZ</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>StandardOutPath</key><string>$RAIZ/data/percurso-servico.log</string>
  <key>StandardErrorPath</key><string>$RAIZ/data/percurso-servico.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || launchctl load "$PLIST"

for i in $(seq 1 20); do
  curl -s --max-time 2 http://127.0.0.1:3000/api/sessao >/dev/null && break
  sleep 0.5
done

# Sucesso só se o serviço RESPONDE — "instalado" com o servidor morto seria
# exatamente a falsa segurança que uma organização sem TI não pode ter.
if ! curl -s --max-time 2 http://127.0.0.1:3000/api/sessao >/dev/null; then
  echo "ERRO: o serviço foi registrado mas não respondeu em http://localhost:3000."
  echo "      Veja data/percurso-servico.log (porta ocupada? node removido?)."
  echo "      Para desfazer o registro: $0 --remover"
  exit 1
fi

echo "Pronto. O Percurso está no ar em http://localhost:3000 e volta sozinho a cada login."
echo "Log do serviço: data/percurso-servico.log · Para desfazer: $0 --remover"
