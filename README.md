# Simulador Empresarial

Réplica própria do jogo de empresas Tecnomind/SimulWeb (PGGN FDC) para treinar gestores: partidas contra concorrentes automáticos, saves, cronômetro por período, Portal de Notícias, relatórios da empresa e de mercado no mesmo formato do original e exportação no padrão "Todos".

## Por que praticar com este simulador
- **Errar sem custo.** Teste preços, produção, compras e financiamento antes de decidir no jogo oficial, sem afetar o resultado da sua equipe.
- **Ver o efeito na hora.** Cada decisão recalcula DRE, balanço, caixa, custos e ranking ao clicar em Aplicar, para entender causa e efeito.
- **Competir de verdade.** Concorrentes automáticos com estilos diferentes (volume, premium, inovador, agressivo, conservador) reagem ao mercado.
- **Treinar sob pressão.** Cronômetro por período e notícias que mexem no mercado, como nas rodadas do curso.
- **Mesma linguagem do jogo.** Relatórios, indicadores, fórmulas e explicações no mesmo formato do SimulWeb.
- **Aprender gestão integrada.** Marketing, produção, RH, compras e finanças conectados: uma decisão numa área aparece no resultado das outras.
- **Repetir e comparar.** Vários saves, partidas de 2 a 6 empresas e a Análise Comparativa (planejado × realizado) para avaliar suas escolhas.

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

## Casos de Finanças

Na tela de jogos salvos, o botão **Casos de Finanças** abre um modo de treino com empresas fictícias sorteadas: reclassificação do balanço pelo modelo dinâmico, ST, NCG, CDG, tipo de estrutura financeira, ciclo financeiro, um problema de prazo de estocagem e o EVA por quatro caminhos. Há também o tipo **Fluxo de caixa de projeto**: um novo negócio tributado pelo Simples Nacional, com investimento, capital de giro, resultado anual, valor residual, fluxo do Ano 0 ao fim do horizonte, VPL, TIR, paybacks simples e descontado, índice de lucratividade e decisão. O caso 1 desse tipo reproduz o exercício da loja de calçados. Há ainda a versão **Lucro Real**, com impostos sobre a receita, depreciação linear, IR/CS de 34% e a depreciação somada de volta ao fluxo; o caso 1 dela é a fábrica de ração da NUTRI MAIS. Cada caso vale 75 pontos, tem correção na hora e fica no histórico do jogador. Os casos podem ser baixados em Excel (.xlsx), no mesmo formato das planilhas da disciplina, preenchidos no Excel e importados de volta para correção. O código está em `simulador/cases.js`.
