# Mapa Digital

Planta interativa do prédio do Departamento de Química da UFPR, publicada em <https://dqufpr.github.io/mapa/>. Fica na pasta `mapa/` deste repositório (antes era o repositório `dqufpr/mapa`, cujo histórico foi trazido para cá).

Uma iniciativa da Representação Discente 2022-2023 do PPGQ/UFPR.

## Como o mapa se encaixa no DQ Digital

O portal fornece a base visual compartilhada. A pasta `mapa/` só acrescenta o que é exclusivo do mapa.

| Vem do portal (raiz do repositório) | Vem da pasta `mapa/` |
|---|---|
| `/js/theme-init.js`, `/css/global.css`, `/js/app.js` | `css/style.css`: planta, painel e lista de locais |
| `/img/icons/sprite.svg`, logotipos, `/fonts/` | `js/mapa.js`: zoom, giro, andares, entradas, seleção, busca, destaques, lista e compartilhar |
| Cores das categorias (`--loc-*` no `global.css`) | `dados/locais.json`: locais, gerado da planilha |
| `/fale-conosco` (formulário de contato único) | `dados/gerar_mapa.py` (repositório privado): gera os dados e a planta |
| `/js/analytics.js` (só em `mapa/index.html`) | `scripts/gerar_compartilhamento.js`: prévias de compartilhamento |

O padrão visual (cores, componentes, acessibilidade, CSP) está no [guia de estilos](GUIA-DE-ESTILOS.md) e na vitrine [`/design`](https://dqufpr.github.io/design).

## Estrutura

```
mapa/
├── index.html                A página do mapa (/mapa/): planta interativa, painel e lista de todos os locais
├── sobre.html                Sobre o Mapa Digital
├── atualizacao.html          Histórico de atualizações
├── legal.html                Aviso legal
├── css/style.css             Estilos só do mapa, carregado depois do global.css
├── js/mapa.js                Interações da planta (zoom, giro, andares, entradas, busca, lista, impressão)
├── js/redirecionar.js        Leva /mapa/completo?… para /mapa/?… mantendo a sala e os destaques
├── dados/
│   ├── planta-areas.json     Áreas clicáveis do desenho, cada uma com o número físico da sala (não publicada)
│   ├── planta-base.svg       Paredes, corredores e portas, sem números (não publicada; aberto sozinho, mostra as cores do mapa)
│   └── locais.json           GERADO: salas, pessoas e unidades ligadas entre si (lido pelo navegador)
├── scripts/
│   └── gerar_compartilhamento.js  Gera as prévias por sala, as páginas l/<id>.html e a capa (Node + Playwright)
├── l/<id>.html               GERADO: página de compartilhamento de cada local, com prévia própria; leva a /mapa/?local=<id>
├── img/
│   ├── capa.jpg              GERADO: capa de compartilhamento (1200×630) de /mapa/, Sobre, Legal e Atualizações
│   ├── compartilhar/<id>.jpg GERADO: prévia de cada local (a sala em foco, o resto desfocado)
│   └── favicon.svg, logo.svg Ícones do mapa (os logotipos do portal vêm da raiz)
├── completo.html             Só redireciona: endereço antigo /mapa/completo
├── sala-de-aula.html …       Só redirecionamentos: páginas antigas por categoria
├── p/                        Só redirecionamentos: endereços antigos (/mapa/p/...)
└── fale-conosco.html         Só redireciona para /fale-conosco
```

O guia de atualização dos dados está em [MAPA-ATUALIZAR-DADOS.md](MAPA-ATUALIZAR-DADOS.md) e o histórico em [MAPA-CHANGELOG.md](MAPA-CHANGELOG.md). As páginas do mapa estão no `sitemap.xml` da raiz.

Não apague os redirecionamentos: podem existir QR codes e links impressos com os endereços antigos. Cada página antiga de categoria abre a planta com aquela categoria destacada.

## De onde vêm os locais

Tudo sai da planilha `dados-mapa.xlsx`, guardada no repositório privado `dq-apps-script`. Para mostrar os locais, o site só lê arquivos dele mesmo: não há Google Sheets.

O único envio de dados é o joinha "Estas informações estão corretas?" do cartão, que vai para o Google Apps Script (`js/apps-script.js`; script no repositório privado `dqufpr/dq-apps-script`). Ele grava o voto numa planilha separada, sem mudar o mapa: as correções continuam sendo feitas em `dados-mapa.xlsx`.

A planilha e o gerador ficam no repositório **privado** `dqufpr/dq-apps-script` (`dados/dados-mapa.xlsx` e `dados/gerar_mapa.py`). O gerador roda lá e escreve aqui, com os dois repositórios clonados lado a lado (detalhes em `info/MAPA-ATUALIZAR-DADOS.md`, seção 2, no privado).

```
dados-mapa.xlsx (privado) ┐
dados/planta-areas.json ──┼─ gerar_mapa.py (privado) ─┬─ dados/locais.json  (cartões e busca)
dados/planta-base.svg ────┘                           └─ index.html          (planta + botões de destaque + lista)
```

### A planilha

São três abas de dados. Cada sala, cada pessoa e cada laboratório ou serviço aparece uma vez só, e as abas se ligam pelo número da sala e pelo nome da pessoa. As colunas são encontradas pelo **nome** do cabeçalho; a coluna `n` (numeração) é ignorada, e a ordem das linhas é a ordem no mapa.

| Aba | Colunas | Uma linha por |
|---|---|---|
| `Salas` | Sala · Tipo · Nome · Acesso ou observação | sala (o `Tipo` define a cor) |
| `Pessoas` | Nome · Cargo · Área ou setor · Sala · E-mail · Lattes | professor ou técnico |
| `Unidades` | Nome · Sigla · Tipo · Salas · Coordenação · Descrição · Site | laboratório de pesquisa, laboratório de ensino ou serviço |

- **Salas** e **Coordenação** aceitam vários valores separados por `;`. Os nomes da Coordenação são os da aba `Pessoas`.
- **E-mail:** só o institucional (`@ufpr.br`). **Lattes** e **site** podem ser escritos sem `https://`.
- **Campos vazios** não aparecem no mapa.

O detalhe de cada coluna, os casos comuns e os avisos do script estão em `info/MAPA-ATUALIZAR-DADOS.md`, no repositório privado. A proposta que levou a essa organização está em `info/MAPA-PROPOSTA-DADOS.md`, também lá.

### O que o mapa mostra

- **Cartão da sala:** identificado só pelo número e pela categoria ("Sala 88 · Laboratório de pesquisa"); embaixo, o que funciona nela (unidades) e quem trabalha nela (pessoas).
- **Cartão da pessoa:** cargo e área, sala, e-mail, Lattes e os laboratórios que coordena.
- **Cartão do laboratório ou serviço:** descrição, site, coordenação e todas as salas, marcadas juntas na planta.
- **Busca:** resultados agrupados em Pessoas, Laboratórios e serviços, e Salas. O Enter abre o primeiro, nesta ordem: número de sala exato, pessoa, unidade, sala.
- **"Voltar":** volta ao cartão anterior (ex.: do laboratório para a pessoa que o coordena).

### Atualizar os locais

O passo a passo completo, com os casos comuns, os avisos do script e um checklist, está em **`info/MAPA-ATUALIZAR-DADOS.md`**, no repositório privado. Resumo:


1. Edite `dados/dados-mapa.xlsx` no repositório privado `dq-apps-script`.
2. Na raiz do repositório privado (com este clonado ao lado):
   ```bash
   pip install openpyxl
   ```
   ```bash
   python dados/gerar_mapa.py
   ```
3. Confira os avisos que o script imprimir (sala da planilha sem área na planta, tipo desconhecido) e faça o commit de `mapa/dados/locais.json` e `mapa/index.html` aqui e da planilha no repositório privado.

### A planta

- `dados/planta-base.svg` é o desenho fixo (paredes, corredores, portas).
- `dados/planta-areas.json` lista as áreas clicáveis: `{"local": "45-B", "pontos": [[x, y], …], "rotulo": [x, y]}`. As coordenadas são as do desenho de `planta-base.svg` (`viewBox` `480 600 6460 2760`). A planta publicada usa um `viewBox` maior, `300 470 6810 3050` (`VIEWBOX` em `gerar_mapa.py`), com folga para as entradas e o fundo do 1º andar.
- **Andares:** a faixa de baixo do desenho (abaixo de `CORTE_Y = 2560`) é o 1º andar. Na tela, ela sobe 933,11 unidades e fica sobre o térreo desfocado.
- **Entradas, rampas e escadas:** a posição e a descrição estão em `ENTRADAS` e `ACESSOS`, no `dados/gerar_mapa.py` do repositório privado.
- **Prévias de compartilhamento:** sempre que a planta ou os locais mudarem, rode `node scripts/gerar_compartilhamento.js` (na pasta `mapa/`). O GitHub Actions também roda o script quando há mudança no `main`.
- Se uma sala mudar de número, troque o `local` da área correspondente. Uma sala pode ter mais de uma área (ex.: a 48).

## Endereços da planta

| Endereço | Abre |
|---|---|
| `/mapa/` | A planta inteira |
| `/mapa/?local=45-B` | A planta com a sala 45-B marcada e o painel aberto |
| `/mapa/?pessoa=shirley-nakagaki` | O cartão da pessoa, com a sala dela marcada (o identificador é o nome, sem acentos) |
| `/mapa/?unidade=labioinc` | O cartão do laboratório ou serviço, com todas as salas dele marcadas (identificador: a sigla ou, sem sigla, o nome) |
| `/mapa/?destaque=sala-aula,banheiro` | A planta com essas categorias destacadas |
| `/mapa/?andar=1` | A planta no 1º andar |
| `/mapa/?entrada=principal` | A planta virada para quem chega por essa entrada (`principal`, `A`, `B`, `C`; rampas e escadas também) |
| `/mapa/#local-45-B` | A lista "Todos os locais" na página do cartão 45-B |
| `/mapa/l/45-B` | Página de compartilhamento da sala (prévia própria no WhatsApp e redes), que leva a `/mapa/?local=45-B` |

Categorias para `destaque`: `sala-aula`, `sala-prof`, `lab-ensino`, `lab-pesquisa`, `servico`, `banheiro`. O endereço muda sozinho conforme a pessoa usa a planta, então pode ser copiado e compartilhado.

## Tamanhos de tela

- **Celular e tablet** (até 1023px, ou tablet de toque deitado até 1399px): busca na lupa, planta da altura da tela, barra de entradas e cartão no pé da tela.
- **Computador** (1024px ou mais, com mouse): barra numa linha e painel à direita da planta.
- **Em todos:** sobre a planta, o seletor de andar fica no canto de cima à esquerda e a barra das entradas, embaixo, no meio. A barra de ferramentas (aproximar, afastar, planta inteira, girar, ampliar) fica logo abaixo do seletor no computador e no canto de baixo à direita no celular e no tablet (no topo à direita com o cartão aberto ou o celular deitado). A abertura mostra o trecho da entrada principal na mesma escala (`vistaPadrao` e `tamanhoPadrao` em `js/mapa.js`).

As condições estão no `@media` de `css/style.css` e em `TOQUE` (`js/mapa.js`). Ao mudar uma, mude a outra.

Na página da planta, o zoom da página está desligado (`user-scalable=no` e `touch-action`). Só a planta aproxima, pela pinça e pelos botões.

## Carga sem "pulos"

O `<html>` da planta tem `data-js-class="mapa-js"`. O `/js/theme-init.js` aplica a classe `mapa-js` já no `<head>`, então a página é desenhada direto no layout final, sem esperar o `mapa.js` (que carrega com `defer`). Sem essa classe, a página "pulava" ao terminar de carregar. Sem JavaScript, a classe não é aplicada e a página mostra a versão simples: a planta parada e a lista completa.

## Segurança (CSP)

As páginas têm Content-Security-Policy por `<meta>`, como o portal. Todas liberam o Google Analytics; `mapa/index.html` e `fale-conosco.html` liberam também `script.google.com` e `script.googleusercontent.com` em `connect-src`, para o Apps Script. `form-action` é só `'self'`. Nada de `style=""` ou `<script>` inline: a CSP bloqueia. O painel monta o conteúdo da planilha com `textContent`, então ele nunca é interpretado como HTML. Os índices (`porId`, `porPessoa`, `porUnidade`, `porEntrada`) são objetos sem protótipo: um endereço como `?local=__proto__` não encontra nada.

## Rodar localmente

Na raiz do repositório:

```bash
python -m http.server 8000
```

Abra <http://localhost:8000/mapa/>. O `http.server` não resolve endereços sem `.html` (o GitHub Pages resolve), então acrescente `.html` ao navegar nas outras páginas.

## Créditos

Representação Discente 2022-2023, Programa de Pós-Graduação em Química (PPGQ), Universidade Federal do Paraná.
