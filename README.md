# DQ Digital

Serviços digitais do Departamento de Química da UFPR, publicados em <https://dqufpr.github.io/>.

Uma iniciativa da Representação Discente 2022-2023 do PPGQ/UFPR.

## Como o site é organizado

O DQ Digital é formado por vários repositórios da organização `dqufpr` no GitHub Pages:

| Repositório | Endereço | Papel |
|---|---|---|
| `dqufpr.github.io` (este) | `https://dqufpr.github.io/` | Site principal: página inicial, estilo global, imagens compartilhadas, páginas institucionais |
| `mapa` | `https://dqufpr.github.io/mapa/` | Mapa Digital: locais do departamento (salas, laboratórios, serviços) |
| outros módulos | `https://dqufpr.github.io/<nome>/` | Cada nova função ganha um repositório próprio |

O GitHub Pages publica cada repositório da organização como uma subpasta do domínio principal. Por isso um módulo pode usar caminhos como `/` (início do site principal) ou `/css/style-dq-global.css`.

### O que o site principal fornece aos módulos

- `css/style-dq-global.css`: layout, cabeçalho, menu, cartões, formulário, componentes do mapa, rodapé e regras responsivas. Os módulos devem carregar este arquivo pela URL absoluta.
- `img/`: logos, favicon, selos (`new.svg`, `ext.svg`, `nota.svg`) e capas usadas pelo CSS global.

Cada módulo pode ter um `css/style.css` local, carregado **depois** do global, só para ajustes próprios.

## Estrutura deste repositório

```
.
├── index.html            Página inicial (hoje exibe aviso de manutenção)
├── sobre.html            Página "Sobre" (sem conteúdo ainda)
├── fale-conosco.html     Formulário de contato (envia para um Google Forms)
├── css/
│   ├── style-dq-global.css   Estilo global, compartilhado com todos os módulos
│   └── style.css             Ajustes locais do site principal (logo do cabeçalho)
├── js/
│   └── map-label.js      Leitura da planilha de locais (não é usado por nenhuma página hoje)
├── img/                  Imagens compartilhadas
├── _config.yml           Configuração do Jekyll (GitHub Pages)
├── _includes/            Vazio (só contém Read.txt)
└── logs.txt              Lista de tarefas pendentes
```

## Esqueleto de uma página

Toda página, no site principal ou em um módulo, segue a mesma marcação:

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Título - DQ DIGITAL - Departamento de Química UFPR</title>
  <link rel="icon" href="https://dqufpr.github.io/img/favicon.svg" type="image/svg+xml">

  <!-- estilo global -->
  <link rel="stylesheet" href="https://dqufpr.github.io/css/style-dq-global.css">
  <!-- estilo local -->
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="pagina">
    <div id="colunas">
      <header id="cabecalho">
        <div id="titulo"><p>Nome do módulo</p></div>
      </header>

      <div id="menu">
        <ul id="menu_dropdown" class="menubar">
          <li class="itemmenubar"><a href="/">INÍCIO</a></li>
          <li class="itemmenubar"><a href="sobre">SOBRE</a></li>
          <li class="itemmenubar"><a href="fale-conosco">CONTATO</a></li>
        </ul>
      </div>

      <div id="coluna">
        <div id="cb" class="esquerda">
          <div id="conteudocoluna" class="principal">
            <div class="container">
              <div id="contentsite">
                <h1>Título</h1>
                <!-- conteúdo -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="rodape">
        <!-- copiar o rodapé de index.html -->
      </div>
    </div>
  </div>
</body>
</html>
```

## Criar um novo módulo

1. Crie um repositório na organização `dqufpr` com o nome que vai aparecer na URL (por exemplo `servicos`).
2. Ative o GitHub Pages na branch `main`.
3. Monte as páginas com o esqueleto acima, carregando o CSS global pela URL absoluta.
4. Coloque só o que for específico do módulo no `css/style.css` local.
5. Adicione um cartão para o módulo na página inicial deste repositório (componente `#homemodel` / `#model`).

## Rodar localmente

O site é HTML estático. Qualquer servidor local serve:

```bash
python3 -m http.server 8000
```

O CSS global vem sempre de `https://dqufpr.github.io/`, então mudanças em `css/style-dq-global.css` só aparecem nos módulos depois de publicadas. Para testar antes, troque temporariamente o `href` pelo caminho local.

## Cuidados ao alterar o CSS global

Qualquer mudança em `css/style-dq-global.css` afeta todos os módulos assim que é publicada. Antes de alterar, confira as páginas do site principal e de cada módulo em largura de celular (até 650px), tablet (651px a 1000px) e desktop.

O CSS global também referencia imagens do repositório `mapa` (`../mapa/img/...`). Se esse repositório for renomeado ou removido, essas capas quebram.

## Pendências conhecidas

- Página inicial em modo de manutenção, sem menu e sem os cartões dos módulos.
- `sobre.html` sem conteúdo e com o título "Mapa Digital" no cabeçalho.
- Cabeçalho, menu e rodapé copiados em cada página de cada repositório.
- Itens de `logs.txt`: novo design, responsividade completa, modo escuro, nova exibição do mapa, atualização da base de dados.

## Créditos

Representação Discente 2022-2023, Programa de Pós-Graduação em Química (PPGQ), Universidade Federal do Paraná.
