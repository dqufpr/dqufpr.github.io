# Histórico de mudanças

## 2.4.1 — 2026-11-08

### Mudado
- O card aberto da lista cresce por cima dos de baixo, sem empurrar a grade, com animação suave da altura e esmaecimento dos detalhes. Um card aberto por vez; clique fora ou Esc fecham.

## 2.4.0 — 2026-11-08

### Mudado
- A abertura da página ("Planta do prédio") saiu em todos os tamanhos de tela; o título continua para leitores de tela e a planta começa logo abaixo do cabeçalho.
- Cards de "Todos os locais" com a mesma altura, mostrando só número, nome e tipo; um clique no card abre os itens, as descrições e "Ver na planta". "Ver na lista" e endereços `#local-…` já abrem o card. Sem JavaScript, os detalhes ficam sempre à mostra.

## 2.3.0 — 2026-11-08

### Mudado
- Planta no celular (até 499px) ocupa quase a tela toda: abertura da página só para leitores de tela, planta de borda a borda e com a altura da tela, um dedo move a planta em qualquer direção.
- Busca recolhida num botão de lupa; destaques numa linha só, rolando para o lado.
- Detalhes da sala e resultados da busca num cartão fixo no pé da tela, com botão de fechar; a planta desliza para a sala não ficar atrás do cartão.
- "Todos os locais" começa recolhida no celular (botão "Mostrar a lista"); "Ver na lista" abre a lista.
- Telas maiores e navegação sem JavaScript continuam como antes.

## 2.2.0 — 2026-10-31

### Mudado
- Cabeçalho com o logo quadrado do Mapa Digital (`img/logo.svg`) e o nome "Mapa Digital"; a marca leva à planta (`/mapa/completo`), e "Início" no menu continua levando ao portal.
- Rodapé com a mesma marca do cabeçalho (logo do Mapa Digital + nome), `© <ano> · Todos os direitos reservados.` com o ano automático, crédito "Representação Discente · PPGQ · UFPR" e aviso de que o site não tem vínculo institucional com a UFPR.

## 2.1.1 — 2026-10-31

### Mudado
- A página da planta usa a largura do portal (`--container`, agora 1440px); a classe `.container--mapa` e o token `--mapa-largura` saíram.
- O aviso "Locais em atualização" passou do topo da página para logo abaixo da planta (some no modo ampliado).

## 2.1.0 — 2026-10-31

### Novo
- Guia de atualização dos dados (`docs/ATUALIZAR-DADOS.md`), com casos comuns, avisos do script e checklist.
- `sitemap.xml` com as páginas do mapa (apontado no `robots.txt` do portal).
- Aviso "Locais em atualização" no topo da planta.
- Favicon próprio do Mapa Digital (`img/favicon.svg`).

### Mudado
- Abertura da página, lista e avisos com a mesma largura da planta; espaço antes do aviso final.
- Número da sala no painel centralizado.
- Meta-descrições revistas; `_config.yml` com título, descrição, endereço e regras de indexação.
- O script avisa com clareza quando falta uma coluna na planilha.

### Removido
- Logotipos próprios sem uso (`img/logo-site-*.svg`): as páginas usam os do portal.

## 2026-10-31 — Planta interativa

### Novo
- `completo.html` é a única página do mapa: planta interativa com zoom, arraste, pinça e Ctrl + roda do mouse, botão Ampliar e painel de detalhes.
- Clique numa sala para ver o que funciona nela; destaque categorias inteiras e combine com a busca (planta e lista filtram juntas).
- Endereços compartilháveis: `?local=45-B` e `?destaque=sala-aula,servico`.
- Salas identificadas pelo número físico (`ID_fisico`); o `ID_digital` deixou de ser usado.
- `dados/locais.xlsx` como fonte; `scripts/gerar_mapa.py` gera `dados/locais.json` e escreve a planta, os botões de destaque e a lista em `completo.html`.
- No celular, a planta começa preenchendo a altura do quadro; um dedo na horizontal move a planta e na vertical rola a página.

### Mudado
- Novas cores das categorias (no `global.css` do portal), distinguíveis com daltonismo.
- Páginas por categoria, `index.html` e `sbpc.html` viraram redirecionamentos para a planta (com a categoria destacada).
- Aviso legal: a lista de locais não depende mais do Google.

### Removido
- Leitura da planilha do Google (gviz) e a dependência de `docs.google.com` na CSP.
- Desenhos antigos `map/*.html` (numerados pelo ID digital) e capas das categorias `img/*.svg`.

## 2026-10-31 — Ajustes da versão 2

### Novo
- Mapa no computador com o maior tamanho que cabe inteiro na altura da tela, sem ficar mais estreito que o texto da página nem mais largo que a janela.
- Botão "Ampliar/Reduzir" no canto do mapa: tela cheia do navegador ou, no iPhone, o mapa fixo sobre a página. Substitui o link que abria o desenho em outra aba.
- Indicadores de carregamento: aviso com ícone girando sobre o mapa e cartões provisórios na lista de locais.
- Linha do tempo na página de atualizações, com o histórico desde dezembro de 2022.

### Mudado
- Endereços sem `/p/`: `/mapa/sala-de-aula` em vez de `/mapa/p/sala-de-aula`. A pasta `p/` guarda só redirecionamentos para os endereços antigos.
- `js/locais.js` virou `js/mapa.js` (lista de locais + aviso de carregamento do mapa).
- Aviso legal reescrito: resumo, caráter não oficial, precisão, responsabilidade, nomes de pessoas e dados de quem visita.

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
