# Histórico de mudanças

## 3.5.0 — 2026-11-15

### Mudado
- **Cabeçalho:** fica compacto ao rolar; sem a linha de apoio da marca (também no rodapé); no celular, só o logo.
- **Menu:** Início · Mapa · Contato ("Sobre" foi para o rodapé), em maiúsculas, sem fundo; a página atual aparece em outra cor (`--nav-ativo`). No celular e no tablet, abre como gaveta pela direita sobre o conteúdo escurecido.
- **Página inicial:** abertura sem sobretítulo, com degradê suave e, ao fundo, a planta do térreo bem transparente com luzes animadas: feixes percorrendo os corredores, uma faixa varrendo os contornos e salas acendendo (`js/hero-planta.js`; parada para quem pediu menos movimento). `img/capa-home.svg` não é mais usado.
- **Fale conosco:** no celular e no tablet, formulário sem cartão (fundo, borda e sombra).
- **Links do desenvolvedor** (Sobre do portal e do mapa, README) com parâmetros UTM (`utm_campaign=dq-digital`).
- Mapa Digital: veja `docs/MAPA-CHANGELOG.md`.
- Guia visual (`/design`), `docs/GUIA-DE-ESTILOS.md` e `docs/MAPA.md` atualizados.

## 3.4.0 — 2026-11-15

### Novo
- **Fale conosco com validação em cada campo:** nome só com letras, e-mail válido, mensagem de 10 a 3000 caracteres (com contador) e sem links. Erros aparecem ao lado do campo, com as mesmas regras do servidor; o envio tem tempo limite e mostra a resposta do servidor (inclusive o aviso de muitos envios seguidos).
- **Fale conosco só pelo Google Apps Script:** saíram o Google Forms anterior, os campos `entry.*` e o domínio `docs.google.com` da CSP de todas as páginas (`form-action 'self'`). Sem JavaScript, a página avisa que ele é necessário para enviar.
- Avisos de privacidade (Sobre e Mapa > Informações legais) atualizados: mensagens e avaliações vão para uma planilha do Google, e o navegador lembra por 30 dias os locais já avaliados.
- **Indicador de carregamento nos botões** (`.btn.is-carregando`, em `css/global.css`): o ícone vira um círculo girando até o servidor responder. Usado no "Enviar mensagem" do Fale conosco e no joinha do mapa.
- **Joinha do mapa:** gira enquanto envia; no sucesso fica verde e pisca. Quem já avaliou vê o voto dado em verde.
- **Nome do site no Google:** o `WebSite` da página inicial ganhou `dqufpr.github.io` como último `alternateName` (alternativa que o Google recomenda quando não usa o nome indicado) e o texto acima do título da página inicial passou a dizer "DQ Digital", para o nome aparecer igual em toda a página. `sitemap.xml` com as datas de 15/11.
- **Gerador do mapa e guias no repositório privado:** `mapa/scripts/gerar_mapa.py` virou `dados/gerar_mapa.py` em `dqufpr/dq-apps-script`, ao lado da planilha. Ele roda lá e escreve `mapa/dados/locais.json` e `mapa/index.html` neste repositório (clone vizinho `DQUFPR` ou `dqufpr.github.io`, ou `--site`). `docs/ANALYTICS.md`, `docs/MAPA-ATUALIZAR-DADOS.md` e `docs/MAPA-PROPOSTA-DADOS.md` foram para `info/` no privado. README, `docs/MAPA.md`, comentários do código e `.gitignore` (sai `planilha.local`) atualizados.
- **Planilha do mapa no repositório privado:** `dados-mapa.xlsx` saiu deste repositório e foi para `dqufpr/dq-apps-script`. O gerador a encontra ao lado deste clone ou pelo caminho informado (`docs/MAPA-ATUALIZAR-DADOS.md`, seção 2).
- **Segurança:** os índices do mapa não têm mais protótipo (`?local=__proto__` deixava o cartão em branco). Revisão do repositório público: sem chaves, senhas ou e-mails pessoais; os e-mails publicados são os institucionais (`@ufpr.br`) da planilha do mapa.
- Documentação: `docs/ANALYTICS.md` (eventos `avaliacao` e `generate_lead`) e `docs/MAPA.md` (Apps Script e CSP) atualizados.
- Joinha do Mapa Digital: o motivo da recusa vindo do servidor (ex.: link no comentário) aparece no cartão.

## 3.3.0 — 2026-11-14

### Novo
- Mapa Digital: busca e cartões de **pessoas** e de **laboratórios e serviços**, a partir de uma planilha reorganizada (abas Salas, Pessoas e Unidades). Detalhes em `docs/MAPA-CHANGELOG.md`.
- **Grade de 12 colunas** para todos os grupos de cartões (`.grid`, `.grid--2`, `.grid--3`, `.grid--4` em `css/global.css`). Cada cartão ocupa uma fração das 12 colunas, e as listas paginadas usam múltiplos de 12.

### Mudado
- **Google Analytics em todas as páginas de conteúdo:** Sobre, Fale conosco, Guia visual, 404 e as páginas Sobre, Atualização e Legal do mapa passaram a contar visitas (antes, só a página inicial e a planta). Os avisos de privacidade foram atualizados. Guia em `docs/ANALYTICS.md`.
- Guia visual (`/design`) e `docs/GUIA-DE-ESTILOS.md` atualizados:
  - a grade de 12 colunas;
  - a sombra dos elementos sobre a planta;
  - o cartão do local no formato "Sala N · categoria";
  - os cartões do painel (sala, pessoa e laboratório);
  - a barra de ferramentas, a barra das entradas e a dica de uso;
  - a organização dos elementos sobre a planta.

## 3.2.0 — 2026-11-14

### Novo
- Mapa Digital: girar a planta, entradas que viram o mapa para quem chega, barra de busca fixa no computador, zoom suave, botão de copiar o link e barra de entradas sobre a planta. Detalhes em `docs/MAPA-CHANGELOG.md`.
- `js/theme-init.js` aceita `<html data-js-class="…">`: a classe é aplicada antes de a página ser desenhada. O mapa usa isso para abrir já no layout final.

### Mudado
- Números das salas sempre em branco, com sombra leve; amarelo (`--loc-lab-ensino`) e rosa (`--loc-banheiro`) mais escuros, para o contraste com o branco.
- Novo token `--on-danger`: o botão de perigo (`.btn--danger`) tem texto escuro no tema escuro.
- Guia visual (`/design`) com a seção do Mapa Digital.

### Corrigido
- Auditoria de 14/11 (Chromium em computador, tablet e celular; validador W3C; axe):
  - O `/mapa/` "pulava" ao terminar de carregar em rede lenta (CLS 0,54 no celular). Agora o deslocamento é 0.
  - O contraste do botão de perigo no tema escuro era 2,5:1. Agora passa no nível AA.
  - O painel do mapa é uma `<section>`, não um `<aside>` dentro de `<main>`.
  - O link do PPGQ em `/mapa/sobre` passou para `https`.
  - Nenhum link interno quebrado, nenhum erro de console e HTML sem erros no validador W3C.

## 3.1.0 — 2026-11-13

### Novo
- Mapa Digital: seletor de andar, entradas, rampas e escadas na planta, compartilhamento com prévia por sala, versão para impressão, nova capa de compartilhamento e lista em cards com paginação. Detalhes em `docs/MAPA-CHANGELOG.md`.
- `<meta name="application-name" content="DQ Digital">` nas páginas com `og:site_name`.
- GitHub Actions (`.github/workflows/compartilhamento.yml`): refaz as prévias de compartilhamento do mapa quando os dados mudam.

### Mudado
- Rodapé de todas as páginas: "Este site não tem vínculo institucional com a Universidade Federal do Paraná (UFPR) e não é um canal oficial da universidade nem do Departamento de Química. Seu conteúdo não representa a posição oficial da UFPR nem do Departamento."
- Ícones de WhatsApp e Instagram no sprite (`img/icons/sprite.svg`), a partir de `img/icons/whatsapp.svg` e `instagram.svg`.
- `sitemap.xml` com as datas de 13/11.

## 3.0.1 — 2026-11-09

### Corrigido
- Ícone do site no Google: `favicon.ico` (16, 32 e 48px) na raiz, `img/favicon-192.png` e `apple-touch-icon.png`, listados no `<head>` de todas as páginas junto com o SVG. O Google não usa só o SVG para o ícone dos resultados.
- `/servicos/` (antigo repositório `servicos`, ainda nos resultados do Google) redireciona para a página inicial, com `noindex`.

## 3.0.0 — 2026-11-08

### Mudado
- Repositório único: o Mapa Digital saiu do repositório `dqufpr/mapa` e passou para a pasta `mapa/` deste repositório, com o histórico de commits. Os repositórios `mapa` e `servicos` deixam de ser usados.
- A planta do prédio fica em `/mapa/` (antes `/mapa/completo`). Links do portal, atalhos por categoria e redirecionamentos antigos apontam para o novo endereço; `/mapa/completo` continua funcionando e mantém `?local=`, `?destaque=` e `#local-…`.
- Um só `sitemap.xml` com as páginas do portal e do mapa, datas atualizadas; `robots.txt` aponta só para ele.
- Título da planta para buscadores: "Mapa Digital · Planta do Departamento de Química UFPR".
- Documentação do mapa em `docs/MAPA.md`, `docs/MAPA-ATUALIZAR-DADOS.md` e `docs/MAPA-CHANGELOG.md`; pendências do mapa em `PENDENCIAS.md`.

### Novo
- Dados estruturados (JSON-LD `WebSite`) na página inicial, para o Google mostrar "DQ Digital" como nome do site; `WebPage` com trilha (breadcrumb) na planta.
- `twitter:card` nas páginas do mapa.

### Corrigido
- `404.html` sem `canonical` (a página tem `noindex`).
- `CLAUDE.md`, a planilha, os arquivos da planta e o script do mapa não são mais publicados.

## 2.2.0 — 2026-10-31

### Mudado
- Cabeçalho com o novo logo quadrado (`img/logo.svg`) e o nome "DQ Digital" ao lado; a partir de 640px, linha de apoio "Departamento de Química · UFPR". Componentes `.brand__logo`, `.brand__nome` e `.brand__sub` no `global.css`.
- Item atual do menu sem borda: só fundo destacado e negrito.
- Rodapé (`.brand--rodape`, `.footer-aviso`) com a mesma marca do cabeçalho (logo quadrado + nome), `© <ano> · Todos os direitos reservados.` com o ano automático, crédito "Representação Discente · PPGQ · UFPR" e aviso de que o site não tem vínculo institucional com a UFPR.

### Removido
- Logotipos antigos (`img/logo-site-hv.svg`, `img/logo-site-mobile.svg`, `img/logo-rodape.svg`).

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
