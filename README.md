# DQ Digital

Serviços digitais do Departamento de Química da UFPR, publicados em <https://dqufpr.github.io/>.

Uma iniciativa da Representação Discente 2022-2023 do PPGQ/UFPR.

## Como o site é organizado

O DQ Digital é formado por vários repositórios da organização `dqufpr` no GitHub Pages:

| Repositório | Endereço | Papel |
|---|---|---|
| `dqufpr.github.io` (este) | `https://dqufpr.github.io/` | Portal: página inicial, base visual compartilhada (CSS, JS, ícones, fontes), páginas institucionais |
| `mapa` | `https://dqufpr.github.io/mapa/` | Mapa Digital: locais do departamento (salas, laboratórios, serviços) |
| outros módulos | `https://dqufpr.github.io/<nome>/` | Cada nova função ganha um repositório próprio |

O GitHub Pages publica cada repositório da organização como uma subpasta do mesmo domínio. Por isso um módulo carrega a base visual por caminho absoluto: `/css/global.css`, `/js/app.js`.

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
│   ├── pages.css           Estilos só do site principal (início, guia, 404)
│   └── style-dq-global.css LEGADO: ainda usado pelo /mapa/; não usar em páginas novas
├── js/
│   ├── theme-init.js       Aplica o tema no <head>, antes da renderização
│   ├── app.js              Menu de tema, menu do celular, página atual, ano do rodapé
│   └── analytics.js        Google Analytics (só na página inicial)
├── img/                    Logotipos, favicon, capas e selos (compartilhados)
│   └── icons/sprite.svg    Ícones
├── fonts/                  Roboto variável (licença OFL em fonts/License.txt)
├── docs/
│   └── GUIA-DE-ESTILOS.md  Cores, tipografia, componentes e convenções
├── _arquivo/               Arquivos antigos guardados como referência (não publicados)
├── _config.yml             Configuração do Jekyll (GitHub Pages)
├── CHANGELOG.md            Histórico de mudanças
└── PENDENCIAS.md           O que falta fazer
```

## O que o site principal fornece aos módulos

| Arquivo | Como carregar |
|---|---|
| `/js/theme-init.js` | `<script src="/js/theme-init.js"></script>` no `<head>`, sem `defer`, antes do CSS |
| `/css/global.css` | `<link rel="stylesheet" href="/css/global.css">` |
| `/js/app.js` | `<script src="/js/app.js" defer></script>` |
| `/img/icons/sprite.svg` | `<svg class="icon"><use href="/img/icons/sprite.svg#map"></use></svg>` |

Cada módulo pode ter um `css/style.css` próprio, carregado depois do global, só para o que for exclusivo dele, sempre usando os tokens (`var(--…)`).

## Criar um novo módulo

1. Crie um repositório na organização `dqufpr` com o nome que vai aparecer na URL (por exemplo `servicos`).
2. Ative o GitHub Pages na branch `main`.
3. Monte as páginas a partir do modelo da seção 18 do [guia de estilos](docs/GUIA-DE-ESTILOS.md#18-modelo-de-página), copiando cabeçalho e rodapé de `index.html`.
4. Coloque só o que for específico do módulo no `css/style.css` local.
5. Adicione um cartão para o módulo em `index.html` (seção "Serviços") e, se for o caso, um item no menu de todas as páginas.

## Rodar localmente

O site é HTML estático. Na pasta do repositório:

```bash
python -m http.server 8000
```

Abra <http://localhost:8000>. Os caminhos começam com `/`, então sirva a partir da raiz do repositório (abrir o arquivo direto no navegador não carrega os ícones).

Para testar um módulo com a base nova antes de publicar, coloque a pasta do módulo dentro desta (ex.: `./mapa/`) e acesse <http://localhost:8000/mapa/>. Não faça commit dessa pasta.

## Cuidados ao alterar a base visual

- Mudanças em `css/global.css`, `js/app.js` e `img/icons/sprite.svg` valem para todos os módulos assim que são publicadas. Confira o site principal e cada módulo em 360px, 768px e 1280px, nos temas claro e escuro.
- `css/style-dq-global.css` é legado: só o `/mapa/` usa. Não altere; quando o mapa migrar, apague. O passo a passo está no guia de estilos.
- Esse CSS legado referencia imagens do repositório `mapa` (`../mapa/img/...`). Se esse repositório for renomeado, essas capas quebram.

## Créditos

Representação Discente 2022-2023, Programa de Pós-Graduação em Química (PPGQ), Universidade Federal do Paraná.
