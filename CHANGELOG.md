# Histórico de mudanças

## 2.1.1 — 2026-10-31

### Mudado
- Largura máxima do conteúdo (`--container`) passou de 1160px para 1440px, no portal e em todos os módulos.

## 2.1.0 — 2026-10-31

### Novo
- `robots.txt` (vale para todo o domínio, inclusive `/mapa/`) e `sitemap.xml`.
- Novo favicon.

### Mudado
- Meta-descrições revistas; `_config.yml` com título, descrição, endereço e regras de indexação.

### Removido
- `css/style-dq-global.css` (legado; o `/mapa/` não usa mais) e as imagens que só ele usava (`img/ext.svg`, `img/new.svg`, `img/nota.svg`).
- Pasta `_arquivo/` (arquivos antigos; continuam no histórico do Git) e `.claude/launch.json`.

## 2026-10-31 — Cores das categorias e planta do mapa

### Mudado
- Novas cores das categorias do Mapa Digital (`--loc-*`): um tom por categoria, distinguíveis com protanopia, deuteranopia e tritanopia. Guia de estilos atualizado.
- Atalhos da página inicial abrem a planta do mapa com a categoria destacada (`/mapa/completo?destaque=…`).

## 2026-10-31 — Reorganização e novo portal

### Novo
- Portal na página inicial (substitui o aviso de manutenção): abertura, cartões de serviços, atalhos por categoria do mapa e faixa de informações.
- Base visual compartilhada `css/global.css`, escrita do zero, mobile-first, com tokens de cor, tipografia, espaço, raio e sombra.
- Tema claro, escuro e "seguir o sistema" (`js/theme-init.js` + `js/app.js`).
- Cabeçalho fixo com menu recolhível no celular, menu de tema e marcação automática da página atual.
- Rodapé novo em colunas, com ano atualizado automaticamente.
- Componentes: botões, cartões, selos, etiquetas de local do mapa, avisos, formulários, listas.
- Ícones em sprite SVG (`img/icons/sprite.svg`) e fonte Roboto servida localmente (`fonts/`).
- Guia visual ao vivo (`design.html`) e guia escrito (`docs/GUIA-DE-ESTILOS.md`).
- Página de erro `404.html`.
- Página "Sobre" com conteúdo; "Fale conosco" com campos acessíveis (mesmo Google Forms).
- Content-Security-Policy nas páginas; Google Analytics movido para `js/analytics.js` (continua só na página inicial).
- `.editorconfig`, `CHANGELOG.md`, `PENDENCIAS.md`.

### Mudado
- `css/style-dq-global.css` marcado como legado: continua publicado, sem alterações de regras, porque o `/mapa/` depende dele.
- `_config.yml` deixa de publicar README, docs e arquivos de projeto.

### Removido (guardado em `_arquivo/`)
- `css/style.css` (só trocava o logotipo do cabeçalho antigo).
- `js/map-label.js` (não era usado por nenhuma página).
- `_includes/` (vazia) e `logs.txt` (substituído por `PENDENCIAS.md`).
