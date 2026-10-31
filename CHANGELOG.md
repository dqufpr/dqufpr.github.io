# Histórico de mudanças

## 2026-10-31 — Migração para a base visual do DQ Digital

### Novo
- Páginas no padrão do portal: `/js/theme-init.js` + `/css/global.css` + `/js/app.js`, com cabeçalho, menu do celular, tema claro/escuro/sistema e rodapé iguais aos do site principal.
- Página inicial do mapa com cartões das categorias (substitui o aviso de manutenção).
- `js/locais.js`: um único script lê a planilha para todas as categorias (antes, um script inline por página), monta a lista sem `innerHTML`, mostra estado de carregamento e de erro.
- Busca na lista de locais (sem diferenciar acentos), com contagem de resultados.
- Cor da categoria mais o nome escrito no mapa completo; número com contraste AA.
- Visualizador do mapa com borda, link para tela cheia e altura adaptada ao celular.
- Content-Security-Policy nas páginas; `.editorconfig`, `_config.yml`, `CHANGELOG.md`.

### Mudado
- `css/style.css` reescrito: só o que é exclusivo do mapa, com os tokens do `global.css`.
- Menu igual ao do portal (Início · Mapa Digital · Sobre · Contato); páginas do mapa (sobre, atualizações, aviso legal) no rodapé.
- `fale-conosco.html` redireciona para o formulário único do portal (`/fale-conosco`).
- Google Analytics só na página inicial do mapa, via `/js/analytics.js`.

### Sem mudança
- Desenhos do mapa (`map/*.html`), capas (`img/`) e a planilha do Google (mesmas abas e colunas).
