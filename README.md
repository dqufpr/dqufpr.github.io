# Mapa Digital

Módulo do DQ Digital com os locais do prédio do Departamento de Química da UFPR, publicado em <https://dqufpr.github.io/mapa/>.

Uma iniciativa da Representação Discente 2022-2023 do PPGQ/UFPR.

## Como o módulo se encaixa no DQ Digital

O portal (`dqufpr/dqufpr.github.io`) fornece a base visual compartilhada. Este repositório só acrescenta o que é exclusivo do mapa.

| Vem do portal (caminho absoluto) | Vem deste repositório (`/mapa/...`) |
|---|---|
| `/js/theme-init.js`, `/css/global.css`, `/js/app.js` | `css/style.css`: visualizador do mapa e lista de locais |
| `/img/icons/sprite.svg`, logotipos, `/fonts/` | `js/locais.js`: carrega os locais da planilha |
| `/fale-conosco` (formulário de contato único) | `map/*.html`: desenhos do mapa (SVG) |
| `/js/analytics.js` (só na página inicial do mapa) | `img/*.svg`: capas das categorias |

O padrão visual (cores, componentes, acessibilidade, CSP) está no [guia de estilos do portal](https://github.com/dqufpr/dqufpr.github.io/blob/main/docs/GUIA-DE-ESTILOS.md) e na vitrine [`/design`](https://dqufpr.github.io/design).

## Estrutura

```
.
├── index.html              Página inicial do mapa: cartões das categorias
├── p/                      Uma página por categoria: mapa + atalhos + lista de locais
│   ├── completo.html
│   ├── sala-de-aula.html
│   ├── sala-de-professor.html
│   ├── laboratorios-de-ensino.html
│   ├── laboratorios-de-pesquisa.html
│   ├── servicos.html
│   └── sbpc.html           Mapa especial da SBPC 2023 (sem lista, fora do menu)
├── map/                    Desenhos do mapa (SVG salvo como .html), abertos num iframe
├── css/style.css           Estilos só do mapa, carregado depois do global.css
├── js/locais.js            Lê a planilha e monta a lista de locais com busca
├── img/                    Capas das categorias (940×280), logotipo e imagem de compartilhamento
├── sobre.html              Sobre o Mapa Digital
├── atualizacao.html        Histórico de atualizações
├── legal.html              Aviso legal
└── fale-conosco.html       Só redireciona para /fale-conosco (links antigos)
```

## De onde vêm os locais

Os locais **não** ficam no HTML. Cada página de categoria lê, no navegador, uma aba da planilha do Google:

- Planilha: `1ym99Rtiw74VlWNmVA2PzIIkSxbZ54mT9XkKgUuASybQ` (compartilhada como "qualquer pessoa com o link pode ver").
- Endereço lido: `https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:json&sheet=<aba>` (consulta pública do Google Visualization, sem Apps Script e sem chave).
- A página diz qual aba ler: `<div class="locais" data-locais="SalaAula">`.

| Página | Aba da planilha |
|---|---|
| `p/completo` | `Completo` |
| `p/sala-de-aula` | `SalaAula` |
| `p/sala-de-professor` | `SalaProf` |
| `p/laboratorios-de-ensino` | `LabEnsino` |
| `p/laboratorios-de-pesquisa` | `labPesquisa` |
| `p/servicos` | `Serv` |

Colunas de cada aba (linha 1 é o cabeçalho; a ordem importa, o nome não):

| Coluna | Campo | Exemplo | Aparece como |
|---|---|---|---|
| A | `id` | `38` | Número no quadrado colorido (o mesmo do desenho) |
| B | `nome` | `Sala de aula - PQ07` | Título do local |
| C | `abrev` | `LQAQ` | Selo com a sigla (omitido se já estiver no nome) |
| D | `local` | `Sala: 95` | Texto ao lado da sigla |
| E | `desc` | `Professor/Química Inorgânica` | Descrição |
| F | `tipo` | `salaaula` | Cor da categoria |

Valores de `tipo`: `salaaula`, `salaprof`, `labensino`, `labpesquisa`, `servico`, `banheiro` (qualquer outro vira "Outros", em cinza).

Para atualizar um local, edite a planilha: a mudança aparece no site na próxima visita, sem commit. A ordem das linhas é a ordem da lista. Linhas sem `id` e sem `nome` são ignoradas.

`js/locais.js` monta cada item com `textContent`, então o conteúdo da planilha nunca é interpretado como HTML. Se a planilha não responder, a página mostra um aviso com link para recarregar.

### Adicionar uma categoria

1. Crie a aba na planilha com as mesmas colunas.
2. Copie uma página de `p/`, troque título, textos, o `src` do iframe e o `data-locais`.
3. Inclua a categoria nos atalhos (`.quick-links`) de todas as páginas de `p/` e um cartão em `index.html`.
4. Se for um `tipo` novo, acrescente-o em `TIPOS` (`js/locais.js`) e crie o token de cor `--loc-*` no `global.css` do portal.

## Segurança (CSP)

As páginas têm Content-Security-Policy por `<meta>`, como o portal. Além do padrão, liberam:

- `connect-src https://docs.google.com`: leitura da planilha;
- `frame-src 'self'`: o mapa em iframe;
- Google Analytics só em `index.html`.

Nada de `style=""` ou `<script>` inline nas páginas: a CSP bloqueia.

## Rodar localmente

Os caminhos começam com `/` e dependem do portal. Coloque esta pasta dentro do repositório do portal como `./mapa/` (sem fazer commit lá) e, na raiz do portal:

```bash
python -m http.server 8000
```

Abra <http://localhost:8000/mapa/index.html>. O `http.server` não resolve endereços sem `.html` (o GitHub Pages resolve), então acrescente `.html` ao navegar.

## Créditos

Representação Discente 2022-2023, Programa de Pós-Graduação em Química (PPGQ), Universidade Federal do Paraná.
