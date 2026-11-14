#!/bin/bash
# Compila o app nativo do Simulador Empresarial (uma vez). Dê dois cliques neste arquivo.
cd "$(dirname "$0")"
APP="Simulador Empresarial.app"
LOG="simulador/compilacao.log"
echo "== Simulador Empresarial: compilando o app nativo =="
if ! xcrun --find swiftc >/dev/null 2>&1; then
  echo "As ferramentas de linha de comando da Apple não estão instaladas."
  echo "Vai aparecer uma janela do macOS: clique em Instalar e espere terminar (alguns minutos)."
  echo "Depois dê dois cliques neste arquivo de novo."
  xcode-select --install
  echo "ferramentas ausentes; instalador aberto $(date)" > "$LOG"
  read -p "Pressione Enter para fechar."
  exit 1
fi
OUT="$APP/Contents/MacOS/SimuladorNativo"
rm -f "$OUT"
if xcrun swiftc -O -o "$OUT" nativo/main.swift -framework Cocoa -framework WebKit > "$LOG" 2>&1; then
  echo "compilado com sucesso $(date)" >> "$LOG"
  pkill -f "user-data-dir=$HOME/Library/Application Support/Simulador Enividia/navegador" 2>/dev/null
  pkill -f "Resources/main.js" 2>/dev/null
  echo "Pronto! Abrindo o Simulador Empresarial..."
  open "$APP"
else
  rm -f "$OUT"
  echo "FALHOU $(date)" >> "$LOG"
  echo "A compilação falhou. O erro ficou em $LOG; avise o Claude, que ele consegue ler esse arquivo."
fi
read -p "Pressione Enter para fechar."
