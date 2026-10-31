# Guia de estilos do DQ Digital

Padrão visual e técnico do site principal (`dqufpr.github.io`) e de todos os módulos (`/mapa/`, `/<modulo>/`).
A vitrine ao vivo de cada componente, nos temas claro e escuro, está em **[/design](https://dqufpr.github.io/design)**.

## Sumário

1. [Princípios](#1-princípios)
2. [Arquivos e como carregar](#2-arquivos-e-como-carregar)
3. [Cores](#3-cores)
4. [Tema claro, escuro e sistema](#4-tema-claro-escuro-e-sistema)
5. [Tipografia](#5-tipografia)
6. [Espaçamento, raios e sombras](#6-espaçamento-raios-e-sombras)
7. [Layout e responsividade](#7-layout-e-responsividade)
8. [Cabeçalho e navegação](#8-cabeçalho-e-navegação)
9. [Botões](#9-botões)
10. [Cartões](#10-cartões)
11. [Selos e etiquetas de local](#11-selos-e-etiquetas-de-local)
12. [Avisos](#12-avisos)
13. [Formulários](#13-formulários)
14. [Ícones](#14-ícones)
15. [Rodapé](#15-rodapé)
16. [Acessibilidade](#16-acessibilidade)
17. [Convenções de código](#17-convenções-de-código)
18. [Modelo de página](#18-modelo-de-página)
19. [Checklist antes de publicar](#19-checklist-antes-de-publicar)

---

## 1. Princípios

- **Celular primeiro.** O público consulta o site andando pelo prédio. Cada página é pensada para 360–420px de largura e depois ampliada para tablet e computador.
- **Tokens, não valores soltos.** Cor, tamanho de fonte, espaço, raio e sombra vêm sempre de uma variável CSS (`var(--…)`). Assim o tema escuro e futuras mudanças de identidade funcionam sozinhos.
- **Um só CSS compartilhado.** O visual comum vive em `/css/global.css`. Um módulo só acrescenta o que é exclusivo dele.
- **Sem dependências.** HTML, CSS e JavaScript puros, sem frameworks nem etapa de build. Nenhum arquivo é carregado de CDN, exceto o Google Analytics na página inicial.
- **Acessível por padrão.** Contraste AA, foco visível, áreas de toque de 44px, navegação por teclado.

## 2. Arquivos e como carregar

| Arquivo | Papel | Quem carrega |
|---|---|---|
| `/js/theme-init.js` | Aplica o tema antes de desenhar a página (evita "piscar") | Todas as páginas, no `<head>`, **sem** `defer` |
| `/css/global.css` | Tokens, base, cabeçalho, rodapé e todos os componentes | Todas as páginas e módulos |
| `/css/pages.css` | Estilos só do site principal (página inicial, guia, 404) | Só o site principal |
| `<modulo>/css/style.css` | Ajustes do módulo, carregado **depois** do global | Só o módulo |
| `/js/app.js` | Menu de tema, menu do celular, link ativo, ano do rodapé | Todas as páginas, com `defer` |
| `/img/icons/sprite.svg` | Ícones | Por `<use href>` |
| `/fonts/*.woff2` | Roboto variável (licença em `fonts/License.txt`) | Pelo `global.css` |

Ordem no `<head>`:

```html
<script src="/js/theme-init.js"></script>
<link rel="stylesheet" href="/css/global.css">
<link rel="stylesheet" href="css/style.css">  <!-- só se o módulo tiver ajustes próprios -->
<script src="/js/app.js" defer></script>
```

Use **caminhos absolutos a partir da raiz** (`/css/…`, `/img/…`). Todos os repositórios da organização são publicados no mesmo domínio, então `/css/global.css` funciona em qualquer módulo.

## 3. Cores

Use o token. O código hexadecimal aparece aqui só como referência.

### Marca (fixas nos dois temas)

| Token | Claro | Uso |
|---|---|---|
| `--brand-navy` | `#1d3c69` | Cor institucional: cabeçalho, botão principal |
| `--brand-navy-deep` | `#0b1f3b` | Rodapé |
| `--brand-blue` | `#274e88` | Links |
| `--brand-sky` | `#a7c4d2` | Azul-claro do logotipo; detalhes sobre fundo escuro |
| `--brand-teal` | `#549db3` | Destaques sobre fundo escuro (amostras do guia visual) |
| `--brand-ice` | `#d9e2e9` | Faixas e fundos suaves |

### Semânticas (mudam com o tema)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | `#f4f7fa` | `#0d1520` | Fundo da página |
| `--surface` | `#ffffff` | `#142030` | Cartões, formulários, faixas alternadas |
| `--surface-2` | `#eaf0f5` | `#1b2a3d` | Fundos secundários, cartão inativo, código |
| `--border` | `#d6dfe8` | `#26364b` | Bordas comuns |
| `--border-strong` | `#b7c5d3` | `#3a4d66` | Bordas de campos e destaque |
| `--text` | `#1f2a37` | `#dde5ee` | Texto corrido |
| `--text-muted` | `#556274` | `#a3b1c2` | Texto secundário, descrições |
| `--heading` | `#1a4272` | `#f0f4f9` | Títulos |
| `--link` / `--link-hover` | `#274e88` / `#1d3c69` | `#8cc4dd` / `#b7dcec` | Links |
| `--accent` | `#2b7a93` | `#6cc0d8` | Sobretítulo, ícones de lista, foco |
| `--header-bg` | `#1d3c69` | `#0f2340` | Cabeçalho |
| `--footer-bg` | `#0b1f3b` | `#08121f` | Rodapé |
| `--btn-bg` / `--btn-bg-hover` | `#1d3c69` / `#274e88` | `#2c5a94` / `#366aa9` | Botão principal |

### Estados

| Token | Claro | Escuro | Fundo suave |
|---|---|---|---|
| `--success` | `#1f7a45` | `#5cc48a` | `--success-soft` |
| `--warning` | `#8a5a00` | `#e3b04b` | `--warning-soft` |
| `--danger` | `#b42318` | `#f08378` | `--danger-soft` |
| `--info` | `#1d5f8a` | `#7cb9e6` | `--info-soft` |

### Categorias do Mapa Digital

Um tom por categoria, escolhido para continuar distinguível com os três tipos de daltonismo. Use para identificar o tipo de local, nunca como cor de texto. Sobre `--loc-lab-ensino`, `--loc-banheiro` e `--loc-outros`, que são claras, o texto vai escuro (`--brand-navy-deep`); sobre as demais, branco.

| Token | Cor | Categoria |
|---|---|---|
| `--loc-sala-aula` | `#3d5fa8` | Sala de aula |
| `--loc-sala-prof` | `#2f7d6d` | Sala de professor |
| `--loc-lab-ensino` | `#e0a63a` | Laboratório de ensino |
| `--loc-lab-pesquisa` | `#b4532f` | Laboratório de pesquisa |
| `--loc-servico` | `#5e3a7a` | Serviço |
| `--loc-banheiro` | `#d4709e` | Banheiro |
| `--loc-outros` | `#c9ced6` (escuro: `#5b6676`) | Outros |

### Regras

- Texto sempre com `--text`, `--text-muted` ou `--heading`. Nunca cinza claro sobre branco.
- Contraste mínimo **4,5:1** para texto e **3:1** para ícones e bordas de campos (WCAG 2.1 AA). Todos os pares da tabela já atendem.
- Cor nunca é a única pista: um selo "Inativo" também diz "Inativo"; uma categoria do mapa também tem o nome escrito.
- Cor nova? Crie o token em `global.css` (nos dois temas), documente aqui e mostre em `/design`.

## 4. Tema claro, escuro e sistema

- Três modos: **Claro**, **Escuro** e **Seguir o sistema** (padrão).
- `theme-init.js` lê a escolha salva em `localStorage` (`dq-theme`) e marca o `<html>`:
  - `data-theme-mode="light|dark|system"` — o modo escolhido;
  - `data-theme="dark"` — presente quando as cores escuras estão ativas.
- O CSS escuro fica em um único bloco `[data-theme="dark"] { … }`, que só redefine tokens. **Não** escreva regras escuras espalhadas pelos componentes; se um componente precisa de cor diferente no escuro, crie ou ajuste um token.
- Exceção aceita: imagens fotográficas ou capas claras podem receber um filtro leve no escuro (`[data-theme="dark"] .card__media img`).
- Em "Seguir o sistema", a página acompanha a troca do sistema operacional sem recarregar.
- No JavaScript de um módulo, `window.dqSetTheme('light' | 'dark' | 'system')` troca o tema.

## 5. Tipografia

Fonte: **Roboto variável**, servida pelo próprio site, com pilha de reserva `system-ui, -apple-system, "Segoe UI", Arial, sans-serif`.

| Token | Tamanho | Uso |
|---|---|---|
| `--fs-3xl` | 30 → 44px (`clamp`) | `h1`, peso 800 |
| `--fs-2xl` | 24 → 32px (`clamp`) | `h2`, peso 700 |
| `--fs-xl` | 24px | Destaques pontuais |
| `--fs-lg` | 20px | `h3`, título de cartão |
| `--fs-md` | 18px | `.lead` (abertura de página), botão grande |
| `--fs-base` | 16px | Texto corrido, campos de formulário |
| `--fs-sm` | 14px | Rótulos, rodapé, menu no desktop |
| `--fs-xs` | 12px | Selos, notas |

Pesos: `--fw-regular` 400, `--fw-medium` 500, `--fw-bold` 700, `--fw-black` 800.
Altura de linha: `--lh-base` 1,6 (texto) e `--lh-tight` 1,2 (títulos).

Regras:
- Um único `h1` por página. Não pule níveis (`h2` → `h4`).
- Texto corrido com no máximo ~68 caracteres por linha (`.prose`).
- Nunca use menos de 16px em campos de formulário: o iOS dá zoom automático.
- `.eyebrow` (sobretítulo em maiúsculas) vai acima do `h1` para situar a seção.

## 6. Espaçamento, raios e sombras

**Espaços** (múltiplos de 4px): `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 24 · `--space-6` 32 · `--space-7` 48 · `--space-8` 64.

- Entre elementos de um grupo: `--space-2`/`--space-3`.
- Entre blocos dentro de uma seção: `--space-4`/`--space-5`.
- Entre seções: `--space-7` no celular, `--space-8` no desktop (`.section` já faz isso).

**Raios:** `--radius-sm` 6px (código, itens de menu) · `--radius-md` 10px (botões, campos, avisos) · `--radius-lg` 16px (cartões, formulário) · `--radius-pill` (selos, etiquetas).

**Sombras:** `--shadow-sm` (cartão em repouso) · `--shadow-md` (cartão ao passar o mouse) · `--shadow-lg` (menus suspensos). No escuro as sombras ficam mais densas automaticamente.

## 7. Layout e responsividade

**Mobile-first:** o CSS sem `@media` vale para o celular; telas maiores entram com `min-width`.

| Faixa | Largura | O que muda |
|---|---|---|
| Celular | até 639px | 1 coluna, margem lateral 16px, menu em painel (☰), botões de grupo em largura total |
| Tablet | 640–959px | 2 colunas, margem 24px, logotipo horizontal, menu ainda em painel |
| Desktop | 960px ou mais | 3 colunas, menu em linha no cabeçalho, cabeçalho de 68px |

Não crie pontos de quebra novos sem necessidade. Se precisar, use os mesmos `640px` e `960px`.

Estrutura:

| Classe | Uso |
|---|---|
| `.container` | Largura máxima de 1440px (`--container`) + margem lateral (`--gutter`) |
| `.container--narrow` | Coluna de leitura de 760px (textos, formulários) |
| `.section` | Bloco com respiro vertical |
| `.section--alt` | Faixa com fundo `--surface` e bordas, para alternar blocos |
| `.section-head` | Título + subtítulo de uma seção |
| `.grid.grid--3` | Cartões: 1 → 2 → 3 colunas. Em 2 colunas, um último cartão sozinho ocupa a linha |
| `.grid.grid--2` | 1 → 2 colunas |
| `.stack` | Espaço vertical uniforme entre filhos |
| `.cluster` | Itens em linha que quebram (selos, etiquetas) |

Regras para celular:
- Nada de rolagem horizontal na página. Tabelas largas vão dentro de `.table-scroll`.
- Áreas de toque com no mínimo **44×44px** (`--tap`).
- Imagens com `width` e `height` no HTML (evita saltos) e `loading="lazy"` abaixo da primeira tela.

## 8. Cabeçalho e navegação

Cabeçalho fixo no topo (`position: sticky`), sempre no azul institucional, nos dois temas.

- **Marca:** logo quadrado (`img/logo.svg`, 36px no celular e 40px a partir de 640px) + nome do site (`.brand__nome`) e, a partir de 640px, uma linha de apoio (`.brand__sub`). O texto leva `aria-hidden` e o link, um `aria-label`. O portal mostra "DQ Digital" e leva a `/`; um módulo usa o próprio logo e nome e leva à sua página principal (ex.: "Mapa Digital" → `/mapa/completo`). "Início" no menu continua levando a `/`.
- **Página atual no menu:** fundo destacado e negrito, sem borda.
- **Menu:** `<nav id="site-nav">` com até 5 itens. No celular e tablet abre como painel abaixo do cabeçalho pelo botão ☰ (`[data-menu-toggle]`); no desktop fica em linha.
- **Página atual:** `app.js` marca o item com `aria-current="page"` (inclusive em subpáginas de um módulo, como `/mapa/completo`). O estilo vem do CSS; não marque à mão.
- **Tema:** `<details class="theme-menu">` com três botões `[data-theme-set]`. O ícone do botão mostra o modo atual (sol, lua ou meio círculo).
- `Esc` fecha os menus; clicar fora também.
- Primeiro elemento do `<body>`: link "Pular para o conteúdo" (`.skip-link`) apontando para `<main id="main">`.

Itens do menu do site principal: **Início · Mapa Digital · Sobre · Contato**. Um módulo pode trocar os itens, mas mantém "Início" (`/`) como primeiro.

## 9. Botões

```html
<a class="btn" href="/mapa/">Abrir o mapa</a>
<a class="btn btn--secondary" href="/sobre">Saiba mais</a>
<button class="btn btn--ghost" type="button">Cancelar</button>
```

| Classe | Uso |
|---|---|
| `.btn` | Ação principal. **Um por bloco.** |
| `.btn--secondary` | Ação alternativa (contorno) |
| `.btn--ghost` | Ação de menor peso, sem fundo |
| `.btn--danger` | Ação destrutiva (apagar, cancelar envio) |
| `.btn--sm` / `.btn--lg` | Tamanhos 36px / 52px (padrão 44px) |
| `.btn--block` | Largura total |
| `.btn-group` | Agrupa botões; no celular cada um ocupa a linha inteira |
| `disabled` ou `aria-disabled="true"` | Estado desativado |

Regras:
- Navega para outra página → `<a class="btn">`. Executa algo na página → `<button type="button">`.
- Texto do botão é um verbo que diz o resultado: "Abrir o mapa", "Enviar mensagem". Evite "Clique aqui".
- Ícone opcional à esquerda do texto, com `aria-hidden="true"`.

## 10. Cartões

```html
<article class="card card--link">
  <div class="card__media"><img src="/img/capa.png" alt="" width="940" height="280" loading="lazy"></div>
  <div class="card__body">
    <div class="card__top">
      <h3 class="card__title"><a href="/mapa/">Mapa Digital</a></h3>
      <span class="badge badge--new">Novo</span>
    </div>
    <p class="card__text">Encontre pessoas, locais e serviços.</p>
    <p class="card__footer" aria-hidden="true">Abrir mapa <svg class="icon"><use href="/img/icons/sprite.svg#arrow-right"></use></svg></p>
  </div>
</article>
```

| Parte | Uso |
|---|---|
| `.card` | Contêiner com borda, raio 16px e sombra leve |
| `.card--link` | O link do título cobre o cartão inteiro (um único link por cartão, bom para leitores de tela) |
| `.card--muted` | Serviço indisponível: fundo apagado, sem link |
| `.card__media` | Imagem de capa, proporção 940×280 |
| `.card__icon` | Alternativa à imagem: ícone em quadrado de 44px |
| `.card__top` | Linha com título e selo |
| `.card__footer` | Chamada no pé ("Abrir", "Visitar site"), com `aria-hidden` porque repete o título |

Imagens de capa: 940×280px, PNG/SVG/WebP, informação importante no centro (as bordas podem ser cortadas). Capa decorativa leva `alt=""`.

## 11. Selos e etiquetas de local

```html
<span class="badge badge--new">Novo</span>
<a class="loc-tag loc--lab-ensino" href="/mapa/completo?destaque=lab-ensino">Laboratórios de ensino</a>
```

| Selo | Quando usar |
|---|---|
| `.badge--new` | Serviço lançado há pouco |
| `.badge--ext` | Link para site fora do DQ Digital |
| `.badge--soon` | Serviço planejado |
| `.badge--off` | Serviço ou local desativado |

Etiqueta de local (`.loc-tag` + `.loc--sala-aula`, `.loc--sala-prof`, `.loc--lab-ensino`, `.loc--lab-pesquisa`, `.loc--servico`, `.loc--banheiro`, `.loc--outros`): ponto colorido + nome da categoria. Com `<a>`, vira atalho com área de toque de 44px.

## 12. Avisos

```html
<div class="alert alert--warning">
  <svg class="icon" aria-hidden="true" focusable="false"><use href="/img/icons/sprite.svg#clock"></use></svg>
  <p><strong>Manutenção programada.</strong> Alguns serviços podem ficar fora do ar.</p>
</div>
```

Variações: `.alert` (informação), `.alert--success`, `.alert--warning`, `.alert--danger`. Comece com uma frase curta em **negrito** que resuma o aviso. Para mensagens que aparecem depois de uma ação (ex.: erro ao carregar dados), acrescente `role="status"` (ou `role="alert"` para erros).

## 13. Formulários

```html
<form class="form form-card">
  <div class="field">
    <label class="label" for="email">E-mail <span class="required" aria-hidden="true">*</span></label>
    <input class="input" type="email" id="email" autocomplete="email" required aria-describedby="email-dica">
    <p class="hint" id="email-dica">Usamos só para responder.</p>
  </div>
  <button class="btn btn--block" type="submit">Enviar</button>
</form>
```

- Rótulo visível sempre acima do campo, ligado por `for`/`id`. Placeholder não substitui rótulo.
- Classes: `.input`, `.textarea`, `.select`; texto de ajuda em `.hint`, ligado por `aria-describedby`.
- Use o `type` certo (`email`, `tel`, `number`) e `autocomplete`: o teclado do celular se adapta.
- Obrigatório: atributo `required` + asterisco `.required` com `aria-hidden`, e uma nota "Campos com * são obrigatórios".
- Erro: o navegador marca o campo com borda `--danger` depois que a pessoa interage (`:user-invalid`).
- Botão de envio em largura total no celular (`.btn--block`).
- O formulário de contato envia para um Google Forms: os nomes `entry.*` não podem mudar.

## 14. Ícones

Sprite em `/img/icons/sprite.svg`: traço de 2px, grade 24×24, cor herdada do texto (`currentColor`).

```html
<svg class="icon" aria-hidden="true" focusable="false"><use href="/img/icons/sprite.svg#map"></use></svg>
```

Disponíveis: `map`, `pin`, `flask`, `building`, `mail`, `arrow-right`, `external`, `info`, `check`, `alert`, `clock`, `sun`, `moon`, `contrast`, `menu`, `close`, `expand`, `shrink`.

- Ícone ao lado de texto: `aria-hidden="true"`.
- Botão só com ícone: `aria-label` no botão descrevendo a ação ("Abrir menu").
- Ícone novo: desenhe no mesmo estilo (24×24, traço 2, pontas arredondadas), acrescente um `<symbol>` ao sprite e mostre em `/design`.

## 15. Rodapé

Três colunas no desktop (institucional · Serviços · Projeto), duas no tablet, uma no celular. Linha final com direitos (`© 2023–<ano>`; o ano é atualizado por `app.js` em `[data-year]`) e crédito à Representação Discente. Fundo `--footer-bg` nos dois temas.

## 16. Acessibilidade

- `lang="pt-BR"` no `<html>`.
- Link "Pular para o conteúdo" e `<main id="main" tabindex="-1">`.
- Marcos: um `<header>`, um `<nav aria-label="Navegação principal">`, um `<main>`, um `<footer>`.
- Foco visível em tudo (`:focus-visible`, contorno de 3px). Nunca `outline: none` sem substituto.
- Links que abrem nova aba: `target="_blank" rel="noopener noreferrer"` e aviso para leitores de tela (`<span class="visually-hidden"> (abre em nova aba)</span>`).
- Imagens informativas com `alt` descritivo; decorativas com `alt=""`.
- Respeite `prefers-reduced-motion` (já tratado no `global.css`).
- Teste com teclado (Tab, Shift+Tab, Enter, Esc) e com zoom de 200%.

## 17. Convenções de código

**HTML**
- Indentação de 2 espaços, UTF-8, fim de linha LF (`.editorconfig`).
- Sem `style="…"` e sem `<script>` inline: a política de segurança (CSP) da página bloqueia.
- Classes para estilo, `id` só para âncoras, rótulos e JavaScript.

**CSS**
- Nomes no padrão BEM simplificado: bloco (`.card`), elemento (`.card__title`), variação (`.card--link`).
- Ordem dentro do arquivo: tokens → base → layout → componentes → utilitários → `@media`.
- Mobile-first: escreva o estilo do celular e amplie com `@media (min-width: 640px)` / `(min-width: 960px)`.
- Nada de `!important`, exceto em utilitários e no bloco de movimento reduzido/impressão.
- Novo componente compartilhado → `global.css` (com seção no sumário do arquivo, aqui no guia e em `/design`). Componente de uma página só → `pages.css` ou `style.css` do módulo.

**JavaScript**
- Sem bibliotecas. Funções em IIFE com `'use strict'`; `defer` no carregamento.
- Interações por atributos `data-*` (`data-menu-toggle`, `data-theme-set`, `data-year`), não por classes de estilo.
- `localStorage` sempre dentro de `try/catch` (navegação anônima pode bloquear).

**Commits**
- Mensagem curta no imperativo em português ("Adiciona página de serviços", "Corrige contraste do rodapé").
- Registre mudanças visíveis no `CHANGELOG.md`.

## 18. Modelo de página

Copie de `sobre.html` (página de texto) ou `fale-conosco.html` (formulário). O esqueleto:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Título da página · DQ Digital</title>
  <meta name="description" content="Uma frase sobre a página.">
  <link rel="canonical" href="https://dqufpr.github.io/endereco">
  <meta name="theme-color" content="#1d3c69" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0f2340" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
  <script src="/js/theme-init.js"></script>
  <link rel="stylesheet" href="/css/global.css">
  <script src="/js/app.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Pular para o conteúdo</a>
<header class="site-header">…copiar de index.html…</header>

<main id="main" tabindex="-1">
  <section class="page-hero container">
    <p class="eyebrow">Seção</p>
    <h1>Título da página</h1>
    <p class="lead">Frase de abertura.</p>
  </section>
  <div class="container">
    <!-- conteúdo -->
  </div>
</main>

<footer class="site-footer">…copiar de index.html…</footer>
</body>
</html>
```

Cabeçalho e rodapé são iguais em todas as páginas: ao mudar um, atualize todos (busque por `<header class="site-header">` e `<footer class="site-footer">`).

## 19. Checklist antes de publicar

- [ ] Abre sem rolagem horizontal em 360px, 768px e 1280px.
- [ ] Funciona nos temas claro e escuro (sem texto ilegível, sem cor fixa no HTML).
- [ ] Menu do celular abre, fecha com Esc e marca a página atual.
- [ ] Todos os caminhos de CSS, JS e imagens começam com `/`.
- [ ] `title`, `description` e `canonical` preenchidos.
- [ ] Imagens com `width`, `height` e `alt`.
- [ ] Navegável só pelo teclado, com foco visível.
- [ ] Console do navegador sem erros (inclusive de CSP).
- [ ] `/design` e este guia atualizados se houve componente novo.
