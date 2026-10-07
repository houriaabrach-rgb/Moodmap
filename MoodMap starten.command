#!/bin/zsh
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_BIN="/Users/abrachhouria/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
TOOLS_BIN="/Users/abrachhouria/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback"

if [[ ! -x "$NODE_BIN" ]]; then
  echo "Die von Codex bereitgestellte Node.js-Laufzeit wurde nicht gefunden."
  echo "Öffne das Projekt in Codex und bitte um eine erneute Prüfung der Arbeitsumgebung."
  read -k 1 "?Drücke eine Taste zum Schließen."
  exit 1
fi

if [[ ! -d "$PROJECT_DIR/node_modules" ]]; then
  echo "Die vorbereiteten Programmpakete fehlen."
  echo "Öffne das Projekt in Codex und bitte um die Installation der MoodMap-Abhängigkeiten."
  read -k 1 "?Drücke eine Taste zum Schließen."
  exit 1
fi

export PATH="$(dirname "$NODE_BIN"):$TOOLS_BIN:/usr/bin:/bin"
cd "$PROJECT_DIR"
echo "MoodMap startet. Lass dieses Fenster geöffnet."
exec "$NODE_BIN" scripts/run-framework.mjs dev
