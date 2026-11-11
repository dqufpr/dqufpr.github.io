# DQ Digital

Serviços digitais do Departamento de Química da UFPR, publicados em <https://dqufpr.github.io/>.

Uma iniciativa da Representação Discente 2022-2023 do PPGQ/UFPR.

## Como o site é organizado

Todo o DQ Digital fica neste único repositório. Cada função ocupa uma pasta, publicada como subpasta do domínio:

| Pasta | Endereço | Papel |
|---|---|---|
| raiz | `https://dqufpr.github.io/` | Portal: página inicial, base visual compartilhada (CSS, JS, ícones, fontes), páginas institucionais |
| `mapa/` | `https://dqufpr.github.io/mapa/` | Mapa Digital: planta interativa do prédio (salas, laboratórios, serviços). Documentação em [`docs/MAPA.md`](docs/MAPA.md) |
| novas funções | `https://dqufpr.github.io/<nome>/` | Cada nova função ganha uma pasta própria |

Os antigos repositórios `dqufpr/mapa` e `dqufpr/servicos` não são mais usados: o histórico do mapa foi trazido para a pasta `mapa/`. Os módulos carregam a base visual por caminho absoluto: `/css/global.css`, `/js/app.js`.

## Funcionalidades

- Portal com acesso ao Mapa Digital, atalhos por categoria de local e cartões dos serviços.
- Layout pensado primeiro para o celular, ampliado para tablet (640px) e computador (960px).
- Tema claro, escuro ou "seguir o sistema", aplicado antes da página aparecer (sem piscar).
- Cabeçalho fixo com menu recolhível no celular e marcação automática da página atual.
- Guia visual ao vivo em [`/design`](https://dqufpr.github.io/design) e guia escrito em [`docs/GUIA-DE-ESTILOS.md`](docs/GUIA-DE-ESTILOS.md).
- Acessibilidade: link "pular para o conteúdo", foco visível, áreas de toque de 44px, contraste AA nos dois temas, respeito a `prefers-reduced-motion`.
- Segurança: Content-Security-Policy por `<meta>`, nenhum script ou estilo inline, `rel="noopener noreferrer"` em links externos.

## Estrutura deste repositório

```
.
├── index.html              Página inicial (portal)
├── sobre.html              Sobre o projeto
├── fale-conosco.html       Formulário de contato (envia para um Google Forms)
├── design.html             Guia visual: vitrine dos componentes
├── 404.html                Página de erro
├── css/
│   ├── global.css          Base visual compartilhada com todos os módulos
│   └── pages.css           Estilos só do site principal (início, guia, 404)
├── js/
│   ├── theme-init.js       Aplica o tema no <head>, antes da renderização
│   ├── app.js              Menu de tema, menu do celular, página atual, ano do rodapé
│   └── analytics.js        Google Analytics (página inicial e planta do mapa)
├── img/                    Logotipos, favicon e capas (compartilhados)
│   └── icons/sprite.svg    Ícones
├── fonts/                  Roboto variável (licença OFL em fonts/License.txt)
├── mapa/                   Mapa Digital (/mapa/): planta, dados e redirecionamentos (ver docs/MAPA.md)
├── docs/
│   ├── GUIA-DE-ESTILOS.md  Cores, tipografia, componentes e convenções
│   ├── MAPA.md             Como o Mapa Digital funciona
│   ├── MAPA-ATUALIZAR-DADOS.md  Passo a passo para atualizar os locais do mapa
│   └── MAPA-CHANGELOG.md   Histórico de mudanças do mapa
├── robots.txt              Regras para buscadores (todo o domínio)
├── sitemap.xml             Todas as páginas indexáveis (portal e mapa)
├── _config.yml             Configuração do Jekyll (GitHub Pages)
├── CHANGELOG.md            Histórico de mudanças
└── PENDENCIAS.md           O que falta fazer
```

## O que a raiz fornece aos módulos

| Arquivo | Como carregar |
|---|---|
| `/js/theme-init.js` | `<script src="/js/theme-init.js"></script>` no `<head>`, sem `defer`, antes do CSS |
| `/css/global.css` | `<link rel="stylesheet" href="/css/global.css">` |
| `/js/app.js` | `<script src="/js/app.js" defer></script>` |
| `/img/icons/sprite.svg` | `<svg class="icon"><use href="/img/icons/sprite.svg#map"></use></svg>` |

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

## Cuidados ao alterar a base visual

- Mudanças em `css/global.css`, `js/app.js` e `img/icons/sprite.svg` valem para todos os módulos assim que são publicadas. Confira o site principal e cada módulo em 360px, 768px e 1280px, nos temas claro e escuro.
- Há um só `sitemap.xml`, com as páginas do portal e dos módulos. Ao criar, remover ou mudar uma página, atualize-o (o `<lastmod>` da página alterada). Páginas de redirecionamento levam `noindex` e ficam fora dele.
- Cada página tem `<title>`, `description`, `canonical` e `og:*` próprios no `<head>`. O nome do site para o Google ("DQ Digital") vem do JSON-LD `WebSite` em `index.html` e do `og:site_name`.

## Créditos

Representação Discente 2022-2023, Programa de Pós-Graduação em Química (PPGQ), Universidade Federal do Paraná.
