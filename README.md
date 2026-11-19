# DQ Digital

Serviços digitais do Departamento de Química da UFPR, publicados em <https://dqufpr.github.io/>.

Uma iniciativa da Representação Discente 2022-2023 do PPGQ/UFPR, desenvolvida por [Floriatan Santos Costa](https://floriatan.com.br/?utm_source=github&utm_medium=referral&utm_campaign=dq-digital&utm_content=readme).

> **Licença:** todos os direitos reservados. Você pode consultar e estudar este repositório e criar links para o site. Usar o código, os textos, os dados ou as imagens em outros sites, softwares ou aplicativos exige autorização por escrito. Veja [`LICENSE`](LICENSE).

## Como o site é organizado

Todo o DQ Digital fica neste único repositório. Cada função ocupa uma pasta, publicada como subpasta do domínio:

| Pasta | Endereço | Papel |
|---|---|---|
| raiz | `https://dqufpr.github.io/` | Portal: página inicial, base visual compartilhada (CSS, JS, ícones, fontes), páginas institucionais |
| `mapa/` | `https://dqufpr.github.io/mapa/` | Mapa Digital: planta interativa do prédio (salas, pessoas, laboratórios e serviços). Documentação em [`docs/MAPA.md`](docs/MAPA.md) |
| novas funções | `https://dqufpr.github.io/<nome>/` | Cada nova função ganha uma pasta própria |

Os antigos repositórios `dqufpr/mapa` e `dqufpr/servicos` não são mais usados: o histórico do mapa foi trazido para a pasta `mapa/`. Os módulos carregam a base visual por caminho absoluto: `/css/global.css`, `/js/app.js`.

## Funcionalidades

### Mapa Digital (`/mapa/`)

- **Planta interativa:** térreo e 1º andar, zoom, arrastar e girar a planta. As 101 salas são coloridas por tipo e numeradas como nas portas.
- **Entradas do prédio** (Principal, A, B e C), rampas e escadas. Escolher a entrada vira o mapa para ficar como quem chega por ela.
- **Busca** por número de sala, pessoa, laboratório ou sigla, com resultados agrupados em Pessoas, Laboratórios e serviços, e Salas.
- **Cartões:**
  - **sala:** o que funciona nela e quem trabalha nela;
  - **pessoa:** cargo, sala, e-mail institucional, Lattes e laboratórios que coordena;
  - **laboratório:** descrição, site, coordenação e salas.
- **Compartilhar** sala, pessoa ou laboratório. Cada sala tem uma página de link com imagem de prévia própria.
- **Impressão:** a planta inteira com todos os locais, ou uma sala (a planta do andar dela e os dados).
- **Layout:** o mesmo no celular e no tablet (cartão no pé da tela); no computador, o painel fica ao lado da planta.
- **Dados:** vêm de uma planilha Excel, com as abas Salas, Pessoas e Unidades, guardada no repositório privado `dqufpr/dq-apps-script`. O gerador (`dados/gerar_mapa.py`, também no privado) escreve a planta, a lista e os dados neste repositório. Passo a passo em `info/MAPA-ATUALIZAR-DADOS.md`, no repositório privado.

### Portal e base comum

- Portal com acesso ao Mapa Digital, atalhos por categoria de local e cartões dos serviços.
- Layout pensado primeiro para o celular, ampliado para tablet (640px) e computador (960px).
- Tema claro, escuro ou "seguir o sistema", aplicado antes da página aparecer (sem piscar).
- Layout estável na carga: nada muda de lugar enquanto a página termina de carregar. O CLS medido é 0 em todas as páginas.
- Cabeçalho fixo com menu recolhível no celular e marcação automática da página atual.
- Guia visual ao vivo em [`/design`](https://dqufpr.github.io/design) e guia escrito em [`docs/GUIA-DE-ESTILOS.md`](docs/GUIA-DE-ESTILOS.md).
- Acessibilidade: link "pular para o conteúdo", foco visível, áreas de toque de 44px, contraste AA nos dois temas, respeito a `prefers-reduced-motion`.
- Segurança: Content-Security-Policy por `<meta>`, nenhum script ou estilo inline, `rel="noopener noreferrer"` em links externos.
- HTML sem erros no validador do W3C. A última auditoria completa (14/11/2026) está resumida no `CHANGELOG.md`.

## Estrutura deste repositório

```
.
├── index.html              Página inicial (portal)
├── sobre.html              Sobre o projeto
├── fale-conosco.html       Formulário de contato (envia pelo Google Apps Script, js/apps-script.js)
├── design.html             Guia visual: vitrine dos componentes
├── 404.html                Página de erro
├── css/
│   ├── global.css          Base visual compartilhada com todos os módulos
│   └── pages.css           Estilos só do site principal (início, guia, 404)
├── js/
│   ├── theme-init.js       Aplica o tema (e a classe de data-js-class) no <head>, antes da renderização
│   ├── app.js              Menu de tema, menu do celular, página atual, ano do rodapé
│   ├── analytics.js        Google Analytics 4 (todas as páginas de conteúdo; guia em info/ANALYTICS.md, no repositório privado)
│   └── apps-script.js      Envio para a planilha do Google (joinha do mapa e Fale conosco; o script fica no repositório privado dqufpr/dq-apps-script)
├── img/                    Logotipos, favicon e capas (compartilhados)
│   └── icons/sprite.svg    Ícones
├── fonts/                  Roboto variável (licença OFL em fonts/License.txt)
├── mapa/                   Mapa Digital (/mapa/): planta, dados, scripts e redirecionamentos (ver docs/MAPA.md)
├── servicos/               Só redireciona: endereço antigo /servicos/ leva à página inicial
├── testes/                 Rascunhos de páginas futuras (noindex; não publicados)
├── docs/
│   ├── GUIA-DE-ESTILOS.md  Cores, tipografia, componentes e convenções
│   ├── MAPA.md             Como o Mapa Digital funciona
│   └── MAPA-CHANGELOG.md   Histórico de mudanças do mapa
├── robots.txt              Regras para buscadores (todo o domínio)
├── sitemap.xml             Todas as páginas indexáveis (portal e mapa)
├── .github/workflows/      GitHub Actions: compartilhamento.yml refaz as prévias de compartilhamento do mapa
├── _config.yml             Configuração do Jekyll (GitHub Pages)
├── CHANGELOG.md            Histórico de mudanças
├── PENDENCIAS.md           O que falta fazer
└── LICENSE                 Licença de uso (todos os direitos reservados)
```

## O que a raiz fornece aos módulos

| Arquivo | Como carregar |
|---|---|
| `/js/theme-init.js` | `<script src="/js/theme-init.js"></script>` no `<head>`, sem `defer`, antes do CSS |
| `/css/global.css` | `<link rel="stylesheet" href="/css/global.css">` |
| `/js/app.js` | `<script src="/js/app.js" defer></script>` |
| `/img/icons/sprite.svg` | `<svg class="icon"><use href="/img/icons/sprite.svg#map"></use></svg>` |

Se o módulo tem um layout próprio para quando há JavaScript (por exemplo, uma classe que reorganiza a tela), declare-a em `<html data-js-class="nome-da-classe">`. O `theme-init.js` aplica a classe antes de a página ser desenhada, e assim nada pula quando o script do módulo (com `defer`) termina de carregar. É o que o mapa faz com `mapa-js`.

Cada módulo pode ter um `css/style.css` próprio, carregado depois do global, só para o que for exclusivo dele, sempre usando os tokens (`var(--…)`).

## Criar um novo módulo

1. Crie uma pasta na raiz com o nome que vai aparecer na URL (por exemplo `servicos/`), com um `index.html`.
2. Monte as páginas a partir do modelo da seção 18 do [guia de estilos](docs/GUIA-DE-ESTILOS.md#18-modelo-de-página), copiando cabeçalho e rodapé de `index.html`.
3. Coloque só o que for específico do módulo em `<pasta>/css/style.css`.
4. Adicione as páginas em `sitemap.xml` e, se houver arquivos que não devem ser publicados (fontes, scripts), em `exclude` no `_config.yml`.
5. Adicione um cartão para o módulo em `index.html` (seção "Serviços") e, se for o caso, um item no menu de todas as páginas.

## Rodar localmente

O site é HTML estático. Na pasta do repositório:

```bash
python -m http.server 8000
```

Abra <http://localhost:8000> (portal) ou <http://localhost:8000/mapa/> (mapa). Os caminhos começam com `/`, então sirva a partir da raiz do repositório (abrir o arquivo direto no navegador não carrega os ícones).

## Conferir antes de publicar

Mudanças maiores pedem uma conferência no navegador, com o servidor local ligado:

- **Tamanhos de tela:** abra as páginas alteradas em 360px, 768px e 1280px, nos temas claro e escuro. Não pode haver rolagem para o lado nem texto cortado.
- **Console:** o console do navegador (F12) não pode mostrar erros. Os mais comuns são recurso 404 ou bloqueio da CSP.
- **Mapa:** busque uma sala, toque nela na planta, troque de andar, gire a planta, use as entradas, e confira a paginação e os filtros da lista e a impressão (Ctrl+P).
- **HTML:** passe as páginas alteradas pelo validador do W3C (<https://validator.w3.org/>).

## Cuidados ao alterar a base visual

- Mudanças em `css/global.css`, `js/theme-init.js`, `js/app.js` e `img/icons/sprite.svg` valem para todos os módulos assim que são publicadas. Confira o site principal e cada módulo em 360px, 768px e 1280px, nos temas claro e escuro.
- Há um só `sitemap.xml`, com as páginas do portal e dos módulos. Ao criar, remover ou mudar uma página, atualize-o (o `<lastmod>` da página alterada). Páginas de redirecionamento levam `noindex` e ficam fora dele.
- Cada página tem `<title>`, `description`, `canonical` e `og:*` próprios no `<head>`. O nome do site para o Google ("DQ Digital") vem do JSON-LD `WebSite` em `index.html` e do `og:site_name`.

## Atualizar os dados do mapa

A planilha e o gerador ficam no repositório privado `dqufpr/dq-apps-script`, clonado ao lado deste (pasta `DQ-UFPR-DATA`):

1. Edite `dados/dados-mapa.xlsx` no repositório privado.
2. Lá, rode `python dados/gerar_mapa.py`. Ele escreve `mapa/dados/locais.json` e `mapa/index.html` **neste** repositório, que procura numa pasta vizinha `DQUFPR` ou `dqufpr.github.io` (ou em `--site CAMINHO`).
3. Confira no navegador.
4. Faça o commit da planilha no repositório privado e de `locais.json` e `mapa/index.html` neste.

Depois do push, o GitHub Actions refaz sozinho as imagens de prévia dos links compartilhados. O guia completo, com os casos comuns e os avisos do script, está em `info/MAPA-ATUALIZAR-DADOS.md`, no repositório privado.

## Licença

Copyright © 2022-2026 Representação Discente 2022-2023 do PPGQ/UFPR, responsável pelo DQ Digital. Desenvolvimento: [Floriatan Santos Costa](https://floriatan.com.br/?utm_source=github&utm_medium=referral&utm_campaign=dq-digital&utm_content=readme). **Todos os direitos reservados.**

| Permitido sem pedir | Exige autorização expressa e por escrito |
|---|---|
| Usar o site para se orientar no departamento | Copiar, adaptar ou modificar o conteúdo, no todo ou em parte |
| Ler e estudar o código e o conteúdo do repositório | Usar o código, os dados, a planta ou as imagens em outros sites, softwares ou aplicativos |
| Fazer fork dentro do GitHub (Termos de Serviço do GitHub) | Publicar cópias ou versões modificadas, inclusive como site |
| Criar links e citar trechos curtos, com crédito e link | Extrair os dados do mapa (pessoas, salas) para outros fins |
| Imprimir para uso pessoal ou para orientação no prédio | Usar os nomes "DQ Digital" e "Mapa Digital" ou os logotipos |

**Como pedir autorização:** pelo [formulário de contato](https://dqufpr.github.io/fale-conosco), dizendo o que pretende usar, onde e para quê.

**Conteúdo de terceiros, com licença própria:**
- a fonte Roboto (SIL Open Font License 1.1, em [`fonts/License.txt`](fonts/License.txt));
- as marcas do WhatsApp e do Instagram;
- os nomes e símbolos da UFPR.

O texto completo está em [`LICENSE`](LICENSE).

## Créditos

- **Responsáveis:** Representação Discente 2022-2023, Programa de Pós-Graduação em Química (PPGQ), Universidade Federal do Paraná.
- **Desenvolvimento:** [Floriatan Santos Costa](https://floriatan.com.br/?utm_source=github&utm_medium=referral&utm_campaign=dq-digital&utm_content=readme).
