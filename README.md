# ASSEMBLEIA TABLETOP — ATT

VTT (Virtual TableTop) web para RPG de mesa. Sem build, sem dependências locais — só HTML/CSS/JS + **PixiJS 7** (renderização 2D acelerada por GPU) carregado via CDN.

## Features

- **Mapa**: importe qualquer imagem (PNG/JPG/WebP) do PC.
- **Grid dinâmico**: tamanho em pixels, snap, cor e opacidade ajustáveis.
- **Tokens**: adiciona, arrasta, redimensiona em cells, com imagem própria, borda colorida e **barras de status totalmente personalizáveis** (HP, PE, ou o que quiser).
- **Seleção múltipla**: clique simples, **Shift+clique** ou **caixa de seleção** (drag em área vazia).
- **Paredes** que bloqueiam visão.
- **Portas** com clique para abrir/fechar (botão direito apaga).
- **Sistema de luzes** com raio configurável.
- **Lanterna no token** (atalho `F`).
- **Fog of War híbrido**:
  - **Manual**: pinte revelar/esconder com brush.
  - **Dinâmico**: visão das luzes e tokens com lanterna corta o fog automaticamente, respeitando paredes e portas.
- **Modo Mestre / Jogador** (atalho `L`): no modo Mestre você vê tudo translúcido; no modo Jogador o fog é opaco e só revela onde há luz/lanterna.
- **Cinematics**: importe vídeos do PC e dispare em **Ctrl+1..9**, com overlay em tela cheia.
- **Câmera fluida**: pan com botão do meio (ou Espaço), zoom com a roda.
- **Atalhos de teclado** para todas as ferramentas.

## Como rodar

Como o app usa imagens carregadas pelo navegador, basta abrir `index.html`. Mas como navegadores podem reclamar de algumas APIs em `file://`, **recomendo um servidor local** (qualquer um serve):

```bash
# Opção 1 — Python (já vem no Windows com Python instalado)
python -m http.server 8000
# abre http://localhost:8000

# Opção 2 — Node
npx serve .

# Opção 3 — VSCode: instale a extensão "Live Server" e dê "Open with Live Server" no index.html
```

Pronto. Funciona em qualquer navegador moderno (Chrome, Edge, Firefox).

## Estrutura

```
assembleia-tabletop/
├── index.html          # entrada
├── att.html            # redireciona para index.html
├── css/style.css
├── js/
│   ├── state.js        # estado central + event bus
│   ├── util.js         # utilidades
│   ├── app.js          # PixiJS, câmera, layers
│   ├── grid.js         # grid + import de mapa
│   ├── walls.js        # paredes + portas
│   ├── lights.js       # luzes + cálculo de polígono de visibilidade
│   ├── fog.js          # fog of war (manual + dinâmica)
│   ├── tokens.js       # tokens + barras
│   ├── selection.js    # caixa de seleção
│   ├── tools.js        # despachador de ferramentas
│   ├── cinematics.js   # player de cinematics
│   ├── ui.js           # painel lateral + modal
│   ├── shortcuts.js    # atalhos
│   └── main.js         # bootstrap
└── README.md
```

Cada módulo se registra em `window.ATT.<modulo>`. O estado vive em `ATT.state`. Eventos via `ATT.emit/ATT.on`.

## Como usar (passo a passo)

1. Abra a página. No painel da direita, clique em **Importar imagem do mapa** e escolha um arquivo.
2. Ajuste o **tamanho do grid (px)** para casar com o mapa (exemplo: 70px por casa).
3. Use a ferramenta **Token** (`T`) e clique no mapa para adicionar tokens.
4. **Botão direito num token** abre o editor: nome, imagem, tamanho em cells, **barras** (HP/PE/qualquer outra), borda e lanterna.
5. Ferramenta **Parede** (`W`): clique 2x para desenhar um segmento. **Porta** (`D`) idem; clique sobre uma porta no modo Selecionar para abrir/fechar.
6. Ferramenta **Luz** (`G`): clique para colocar luzes pontuais.
7. Tecle `L` para alternar entre **Mestre** (vê tudo) e **Jogador** (com fog).
8. Selecione um token e tecle `F` para alternar **lanterna**.
9. Use **Revelar (R)** / **Esconder (H)** para pintar manualmente o fog.
10. Em **Cinematics**, importe vídeos. **Ctrl+1..9** dispara o respectivo vídeo. **Esc** fecha.

## Atalhos

| Tecla | Ação |
|-|-|
| `V` | Selecionar |
| `Espaço` (segurar) | Mover câmera |
| `T` / `W` / `D` / `G` | Token / Parede / Porta / Luz |
| `R` / `H` | Pintar revelar / esconder fog |
| `F` | Alternar lanterna no token selecionado |
| `L` | Alternar Mestre/Jogador |
| `Del` / `Backspace` | Apagar tokens selecionados |
| `Esc` | Cancela construção / fecha cinematic |
| `Ctrl+1..9` | Dispara cinematic correspondente |
| Roda do mouse | Zoom |
| Botão do meio | Pan |
| Shift+clique | Adiciona/remove da seleção |
| Drag em área vazia | Caixa de seleção |
| Botão direito num token | Abre editor |
| Botão direito numa parede/porta/luz | Apaga |

## Próximos passos sugeridos

Se quiser ir além, dá para evoluir nas seguintes direções:

- **Multiplayer real-time**: trocar `ATT.state` por um stream sincronizado via WebSocket (ex.: PartyKit, Supabase Realtime, ou um servidor Node + ws). Cada `ATT.emit` vira uma mensagem.
- **Visão por token**: além do "modo Mestre/Jogador" global, atribuir uma visão por jogador (cada token enxerga o seu pedaço; o resto fica em fog).
- **Salvar/Carregar cena**: serializar `ATT.state` em JSON e oferecer download/upload.
- **Camadas (layers)** de mapa: piso, móveis, GM-only.
- **Medição** (régua) com snap em cells e suporte a cones/quadrados/círculos para áreas de efeito.
- **Dados (dice roller)** com macros por token.
- **Initiative tracker** lateral.

A arquitetura está pronta para isso: cada feature nova é um novo módulo em `js/` que se registra no `window.ATT` e escuta os eventos do estado.

## Notas técnicas

- O **fog of war** usa duas `RenderTexture`: uma para revelações persistentes (pintadas pelo mestre) e outra para a composição final (preto + buracos por revelações + buracos por polígonos de visão dinâmica). Tudo via `BLEND_MODES.ERASE`, que é GPU-acelerado.
- O **polígono de visibilidade** é calculado por raycasting nos endpoints das paredes (3 raios por endpoint para capturar o "shadow casting" correto), depois ordenado por ângulo. Roda em CPU porque a quantidade de paredes é tipicamente baixa (< algumas centenas).
- A **câmera** é apenas um `Container` com `scale` e `position`; zoom é centrado no cursor.
- Os **tokens** usam um `Container` por token, com `Sprite` (com máscara circular) para a imagem, `Graphics` para borda e barras, e `Text` para nome.
- Imagens e vídeos importados nunca saem do navegador (tudo via `FileReader` / `URL.createObjectURL`).
