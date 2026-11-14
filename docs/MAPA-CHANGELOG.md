# Histórico de mudanças do Mapa Digital

## 3.2.0 — 2026-11-14

### Novo
- **E-mail e site:** colunas opcionais `E-mail` (pessoas) e `Site` (laboratórios de pesquisa) na planilha. Aparecem como links no painel da sala e nos detalhes do cartão da lista. O `gerar_mapa.py` avisa e ignora os valores inválidos.
- **Girar a planta:** botão ao lado do zoom gira a planta de 90 em 90 graus, com animação. Os números, os nomes dos andares e os nomes das entradas continuam na horizontal, ao lado do que indicam.
- **Entradas viram o mapa:** ao escolher uma entrada, a planta gira para quem chega por ela ficar olhando para dentro do prédio.
- **Barra de entradas sobre a planta** (tablet e celular): Principal, A, B e C.
  - No celular, a barra fica centralizada. Tocar numa entrada só move o mapa, sem abrir o cartão, e tocar de novo desmarca.
  - A barra não sai na impressão.
- **Copiar o link** no painel da sala, antes de Enviar. A confirmação fica no próprio ícone: o botão fica verde e mostra um visto animado por 2 segundos. O leitor de tela anuncia "Link copiado".
- **Barra de busca fixa no computador:** ao rolar a página, a busca e os destaques ficam no alto e o cabeçalho do site se recolhe.

### Mudado
- **Barra de entradas em todos os tamanhos:** "Entrada · Principal A B C" aparece embaixo da planta também no computador. A dica de uso foi para o canto de baixo à direita.
- **Planta e elementos centralizados na área inteira do mapa:** a abertura, as entradas, a vista "planta inteira", o seletor de andar e a barra das entradas não descontam mais o painel do computador. O painel só é considerado para empurrar uma sala tocada que tenha ficado embaixo dele.
- **Mesma abertura em todos os tamanhos:** a planta abre no trecho da entrada principal, na escala do celular (1550 unidades em 390px de largura livre). Telas maiores mostram mais da planta em volta. Ao escolher uma entrada, o zoom é o mesmo em qualquer tamanho. O botão "Ver a planta inteira" continua mostrando o andar todo.
- **Tablet igual ao celular:** busca recolhida na lupa, destaques numa linha, planta da altura da tela, barra de entradas centralizada e cartão da sala no pé da tela.
  - Vale até 1023px e também para tablets de toque deitados, até 1399px. Computadores com mouse a partir de 1024px mantêm o painel à direita.
  - No tablet, a abertura usa a mesma escala do celular e mostra mais da planta. Deitado, a abertura mostra a planta inteira.
- **Zoom só na planta:** a pinça e o toque duplo não ampliam mais a página do mapa. A planta continua com a própria pinça e os botões + e −. Isso é feito pelo viewport `user-scalable=no`, por `touch-action` e, no Safari do iPhone, pelo bloqueio do `gesturestart` fora da planta.
- **Zoom:** zoom suave pelos botões, pela roda do mouse (com Ctrl) e ao enquadrar uma sala.
- **Celular:**
  - Abre no trecho da entrada principal, com folga para a barra das entradas.
  - As entradas usam o mesmo zoom da abertura.
- **Números das salas:** centralizados na área, sempre em branco e com sombra leve. O número do painel também ficou branco.
- **Botões de entradas, rampas e escadas no painel:** na cor do elemento, sem borda azul. A entrada selecionada tem borda verde.
- **Resultados da busca e itens do painel:** em cartões.
- **Botões de destaque:** a borda não muda mais de espessura ao ligar e desligar, então a linha não pula.
- **Entradas:** a A e a C trocaram de nome. A descrição da principal agora é "Entrada pela frente do prédio principal".
- **Impressão:** "Todos os locais" sai sem bordas.

### Corrigido
- **"Ver na planta" no celular e no tablet:** a sala escolhida na lista aparece no meio da área visível do mapa. Antes, a posição era calculada antes de a página rolar até a planta, e a sala ficava embaixo do cartão do pé da tela.
- **Carga em rede lenta:** a página "pulava" ao terminar de carregar, porque a classe `mapa-js` só era aplicada no fim. Agora o `theme-init.js` a aplica no `<head>`, via `data-js-class`.
- **Nomes dos andares com a planta girada:** ficam alinhados à borda do prédio.

### Removido
- Aviso "Locais em atualização" abaixo da planta.

## 3.1.0 — 2026-11-13

### Novo
- **Andares:** seletor Térreo | 1º andar. A planta abre no térreo; o 1º andar aparece na posição real, sobre o térreo desfocado. Troca de andar sozinha ao escolher um local do outro andar; o seletor mostra quantos resultados há em cada andar; endereço `?andar=1`. Cada local tem o andar (salas 23 a 45-E no 1º andar) no painel, na lista e na busca.
- **Entradas:** principal, A, B e C marcadas na planta, clicáveis, com botões no painel, busca e endereço `?entrada=principal`.
- **Rampas e escadas:** áreas nos dois andares, com pictogramas em círculo (escada; Símbolo Internacional de Acesso sobre a rampa) e a ligação entre os andares registrada.
- **Compartilhar:** WhatsApp, Instagram e Enviar (folha de compartilhar do sistema ou cópia do link). Cada local tem uma página `mapa/l/<id>.html` com prévia própria (`mapa/img/compartilhar/<id>.jpg`: a sala em foco, o resto da planta desfocado). Gerado por `scripts/gerar_compartilhamento.js`, também pelo GitHub Actions.
- **Capa de compartilhamento** (`mapa/img/capa.jpg`, 1200×630) para `/mapa/`, Sobre, Legal e Atualizações.
- **Impressão:** a página inteira (planta com os dois andares e todos os locais) ou só o local escolhido, em folhas deitadas, com tema claro e cores das salas.
- **Lista "Todos os locais":** cards com faixa da cor da categoria, número, tipo, andar, resumo e Detalhes; mesma altura; 9 por página em carrossel; filtros por tipo (os mesmos destaques da planta).

### Mudado
- Tablet e computador: barra numa linha só, planta com a largura e a altura da tela; no computador, painel flutuando à direita; no celular e no tablet, painel no pé da tela.
- Botões de compartilhar só com ícones; "Imprimir" só no computador.
- Modo ampliado cobre a tela toda em todos os tamanhos.
- Sala 14 com contorno retangular (a faixa ao lado é a escada).

### Removido
- Botão Mostrar/Ocultar a lista; bloco "Viu algo desatualizado?" antes do rodapé; seção "Nomes de pessoas" do aviso legal.

## 3.0.0 — 2026-11-08

### Mudado
- O mapa passou para a pasta `mapa/` do repositório `dqufpr.github.io`. A planta fica em `/mapa/` (era `/mapa/completo`, que agora redireciona mantendo a sala e os destaques do endereço).
- `completo.html` virou `index.html`; `scripts/gerar_mapa.py` escreve em `index.html`.
- O `sitemap.xml` e o `_config.yml` próprios saíram: valem os da raiz.

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
