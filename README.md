# Mapa Digital

Módulo do DQ Digital com a planta interativa do prédio do Departamento de Química da UFPR, publicado em <https://dqufpr.github.io/mapa/completo>.

Uma iniciativa da Representação Discente 2022-2023 do PPGQ/UFPR.

## Como o módulo se encaixa no DQ Digital

O portal (`dqufpr/dqufpr.github.io`) fornece a base visual compartilhada. Este repositório só acrescenta o que é exclusivo do mapa.

| Vem do portal (caminho absoluto) | Vem deste repositório (`/mapa/...`) |
|---|---|
| `/js/theme-init.js`, `/css/global.css`, `/js/app.js` | `css/style.css`: planta, painel e lista de locais |
| `/img/icons/sprite.svg`, logotipos, `/fonts/` | `js/mapa.js`: zoom, seleção, busca e destaques |
| Cores das categorias (`--loc-*` no `global.css`) | `dados/locais.json`: locais, gerado da planilha |
| `/fale-conosco` (formulário de contato único) | `scripts/gerar_mapa.py`: gera os dados e a planta |
| `/js/analytics.js` (só em `completo.html`) | |

O padrão visual (cores, componentes, acessibilidade, CSP) está no [guia de estilos do portal](https://github.com/dqufpr/dqufpr.github.io/blob/main/docs/GUIA-DE-ESTILOS.md) e na vitrine [`/design`](https://dqufpr.github.io/design).

## Estrutura

```
.
├── completo.html             A página do mapa: planta interativa, painel e lista de todos os locais
├── sobre.html                Sobre o Mapa Digital
├── atualizacao.html          Histórico de atualizações
├── legal.html                Aviso legal
├── css/style.css             Estilos só do mapa, carregado depois do global.css
├── js/mapa.js                Interações da planta
├── dados/
│   ├── locais.xlsx           FONTE: planilha de locais (editar aqui)
│   ├── planta-areas.json     Áreas clicáveis do desenho, cada uma com o número físico da sala
│   ├── planta-base.svg       Paredes, corredores e portas (sem números)
│   └── locais.json           GERADO: locais agrupados por sala (lido pelo navegador)
├── scripts/gerar_mapa.py     Gera locais.json e atualiza a planta e a lista em completo.html
├── docs/ATUALIZAR-DADOS.md   Guia passo a passo para atualizar os locais
├── sitemap.xml               Páginas para buscadores (o robots.txt fica no portal)
├── img/                      Favicon e imagem de compartilhamento (os logotipos vêm do portal)
├── index.html                Só redireciona para completo.html
├── sala-de-aula.html …       Só redirecionamentos: páginas antigas por categoria
├── p/                        Só redirecionamentos: endereços antigos (/mapa/p/...)
└── fale-conosco.html         Só redireciona para /fale-conosco
```

Não apague os redirecionamentos: podem existir QR codes e links impressos com os endereços antigos. Cada página antiga de categoria abre a planta com aquela categoria destacada.

## De onde vêm os locais

Tudo sai da planilha `dados/locais.xlsx`. Não há mais leitura do Google Sheets nem Apps Script: o site só lê arquivos dele mesmo.

```
dados/locais.xlsx ─┐
dados/planta-areas.json ─┼─ scripts/gerar_mapa.py ─┬─ dados/locais.json  (painel de detalhes)
dados/planta-base.svg ─┘                           └─ completo.html       (planta + botões de destaque + lista)
```

### Colunas da planilha

A primeira linha é o cabeçalho; as colunas são encontradas pelo **nome**, não pela posição.

| Coluna | Exemplo | Uso |
|---|---|---|
| `n` | `139` | Ordem dos itens dentro de uma sala (o primeiro dá nome à sala) |
| `ID_fisico` | `45-B` | **Número da sala, o mesmo da porta.** Liga a linha à área da planta |
| `Nome do Local` | `Secretaria da Pós-graduação em Química` | Nome do item (laboratório, pessoa, serviço) |
| `Sigla` | `PPGQ` | Selo ao lado do nome (omitido se já estiver no nome) |
| `Descrição` | `Acesso mediante reserva prévia` | Texto abaixo do nome |
| `Tipo de local` | `servico` | Categoria e cor |

- `ID_digital` não é mais usado e pode ser apagado da planilha.
- Valores de `Tipo de local`: `salaaula`, `salaprof`, `labensino`, `labpesquisa`, `servico`, `banheiro` (qualquer outro vira "Outros", em cinza).
- Várias linhas com o mesmo `ID_fisico` formam uma sala só (ex.: os professores que dividem uma sala). A cor da sala é a do primeiro item.

### Atualizar os locais

O passo a passo completo, com os casos comuns, os avisos do script e um checklist, está em **[docs/ATUALIZAR-DADOS.md](docs/ATUALIZAR-DADOS.md)**. Resumo:


1. Edite `dados/locais.xlsx`.
2. Na raiz do repositório:
   ```bash
   pip install openpyxl
   ```
   ```bash
   python scripts/gerar_mapa.py
   ```
3. Confira os avisos que o script imprimir (sala da planilha sem área na planta, tipo desconhecido) e faça o commit de `dados/` e `completo.html`.

### A planta

- `dados/planta-base.svg` é o desenho fixo (paredes, corredores, portas).
- `dados/planta-areas.json` lista as áreas clicáveis: `{"local": "45-B", "pontos": [[x, y], …], "rotulo": [x, y]}`. As coordenadas usam o `viewBox` `480 600 6460 2760`.
- Se uma sala mudar de número, troque o `local` da área correspondente. Uma sala pode ter mais de uma área (ex.: a 48).

## Endereços da planta

| Endereço | Abre |
|---|---|
| `/mapa/completo` | A planta inteira |
| `/mapa/completo?local=45-B` | A planta com a sala 45-B marcada e o painel aberto |
| `/mapa/completo?destaque=sala-aula,banheiro` | A planta com essas categorias destacadas |

Categorias para `destaque`: `sala-aula`, `sala-prof`, `lab-ensino`, `lab-pesquisa`, `servico`, `banheiro`. O endereço muda sozinho conforme a pessoa usa a planta, então pode ser copiado e compartilhado.

## Segurança (CSP)

As páginas têm Content-Security-Policy por `<meta>`, como o portal. Só `completo.html` libera o Google Analytics. Nada de `style=""` ou `<script>` inline: a CSP bloqueia. O painel monta o conteúdo da planilha com `textContent`, então ele nunca é interpretado como HTML.

## Rodar localmente

Os caminhos começam com `/` e dependem do portal. Coloque esta pasta dentro do repositório do portal como `./mapa/` (sem fazer commit lá) e, na raiz do portal:

```bash
python -m http.server 8000
```

Abra <http://localhost:8000/mapa/completo.html>. O `http.server` não resolve endereços sem `.html` (o GitHub Pages resolve), então acrescente `.html` ao navegar.

## Créditos

Representação Discente 2022-2023, Programa de Pós-Graduação em Química (PPGQ), Universidade Federal do Paraná.
