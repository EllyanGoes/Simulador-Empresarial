# Simulador Empresarial

Réplica própria do jogo de empresas Tecnomind/SimulWeb (PGGN FDC) para treinar gestores: partidas contra concorrentes automáticos, saves, cronômetro por período, Portal de Notícias, relatórios da empresa e de mercado no mesmo formato do original e exportação no padrão "Todos".

## Estrutura
- `simulador/` — a aplicação web (uma página só).
  - `ui.html` interface · `engine.js` motor de simulação · `bots.js` concorrentes automáticos.
  - `initial_p5.json`, `news.json`, `tips.json` — dados de partida, notícias e explicações.
  - `build.py` gera `index.html` (página completa, funciona offline): `npm install && python3 build.py`.
  - `docs/` — Manual dos Diretores, Glossário e Guia do Usuário.
  - `fit_*.js`, `test_*.js` — calibração e testes do modelo.
- `nativo/main.swift` — janela nativa do macOS (AppKit + WKWebView).
- `Compilar app nativo.command` — compila o Swift para `Simulador Empresarial.app/Contents/MacOS/SimuladorNativo`.
- `Simulador Empresarial.app/` — o pacote do app (o binário compilado não vai para o repositório).

## Como rodar
1. `cd simulador && npm install && python3 build.py`
2. Copie `simulador/index.html` para `Simulador Empresarial.app/Contents/Resources/index.html` (ou abra o `index.html` no navegador).
3. No Mac, dê dois cliques em `Compilar app nativo.command` e abra o `Simulador Empresarial.app`.
