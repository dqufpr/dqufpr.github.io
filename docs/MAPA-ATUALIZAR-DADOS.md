# Como atualizar os dados do Mapa Digital

Guia passo a passo para quem mantém o mapa: trocar o nome de um laboratório, mudar um professor de sala, incluir um serviço novo e publicar a mudança.

**Resumo:** edite `mapa/dados/locais.xlsx` → rode `python mapa/scripts/gerar_mapa.py` → confira → faça o commit e o push. O site atualiza sozinho em 1 ou 2 minutos.

## Sumário

1. [O que você precisa](#1-o-que-você-precisa)
2. [Entenda a planilha](#2-entenda-a-planilha)
3. [Casos comuns](#3-casos-comuns)
4. [Gerar os dados do site](#4-gerar-os-dados-do-site)
5. [Conferir antes de publicar](#5-conferir-antes-de-publicar)
6. [Publicar](#6-publicar)
7. [Avisos do script e como resolver](#7-avisos-do-script-e-como-resolver)
8. [Quando a sala não existe no desenho](#8-quando-a-sala-não-existe-no-desenho)
9. [Checklist](#9-checklist)

---

## 1. O que você precisa

| Ferramenta | Para quê | Onde conseguir |
|---|---|---|
| Excel ou LibreOffice Calc | Editar a planilha | Qualquer editor que salve `.xlsx` |
| Python 3 | Rodar o script que gera os dados | <https://www.python.org/downloads/> (no Windows, marque "Add Python to PATH" ao instalar) |
| Biblioteca `openpyxl` | O script usa para ler a planilha | Uma vez só: `pip install openpyxl` |
| Git ou GitHub Desktop | Publicar a mudança | <https://desktop.github.com/> é o caminho mais simples |
| Acesso ao repositório | Permissão de escrita em `dqufpr/dqufpr.github.io` | Peça a quem administra a organização `dqufpr` |

Baixe o repositório uma vez (GitHub Desktop: *File → Clone repository → dqufpr/dqufpr.github.io*). Antes de cada atualização, traga as mudanças mais recentes (*Fetch origin / Pull*).

## 2. Entenda a planilha

O arquivo é **`mapa/dados/locais.xlsx`**. É a única fonte dos locais: o site não lê mais o Google Sheets. Cada **linha** é um item que aparece numa sala: um laboratório, um professor, um serviço.

| Coluna | Obrigatória | Exemplo | O que faz |
|---|---|---|---|
| `n` | sim | `139` | Ordem dentro da sala. O item de **menor `n`** dá nome à sala na planta e na lista. |
| `ID_fisico` | sim | `45-B` | **Número da sala, igual ao da porta.** É o que liga a linha à sala desenhada. |
| `Nome do Local` | sim | `Secretaria da Pós-graduação em Química` | Nome do item. Linhas sem nome são ignoradas. |
| `Sigla` | não | `PPGQ` | Aparece num selo ao lado do nome (some se já estiver no nome). |
| `Descrição` | não | `Acesso mediante reserva prévia` | Texto abaixo do nome: responsável, horário, restrições. |
| `Tipo de local` | sim | `servico` | Categoria e cor da sala. |
| `E-mail` | não | `fulano@ufpr.br` | Para pessoas (professores, secretarias). Vira um link que abre o programa de e-mail. |
| `Site` | não | `www.quimica.ufpr.br/lab` | Para laboratórios de pesquisa. Pode ser escrito sem `https://`. Abre em nova aba. |
| `ID_digital` | **não usar** | | Coluna antiga. É ignorada e pode ser apagada. |

Valores aceitos em **`Tipo de local`** (escreva exatamente assim, sem acento e sem espaço):

| Valor | Categoria no site |
|---|---|
| `salaaula` | Sala de aula |
| `salaprof` | Sala de professores |
| `labensino` | Laboratório de ensino |
| `labpesquisa` | Laboratório de pesquisa |
| `servico` | Serviço |
| `banheiro` | Banheiro |

Qualquer outro valor vira "Outros", em cinza, e o script avisa.

**Regras importantes**

- **Uma sala, várias linhas.** Professores que dividem a sala 23 são quatro linhas com `ID_fisico` = `23`. A planta mostra uma sala só, com os quatro nomes.
- **A cor da sala vem do primeiro item** (menor `n`). Se a sala tem um laboratório e um professor, deixe o laboratório com o `n` menor.
- **Não use o mesmo `ID_fisico` para salas diferentes.** Se duas portas têm o mesmo número, diferencie (ex.: `49-A` e `49-B`) e ajuste o desenho (seção 8).
- **Não deixe espaços sobrando** nem quebre linha dentro da célula. O script limpa espaços nas pontas, mas não corrige erros de digitação.
- **Use letras maiúsculas iguais às da porta** no `ID_fisico`: `45-A`, não `45-a`.

## 3. Casos comuns

### Trocar o nome, a sigla ou a descrição
Edite a célula e siga para a [seção 4](#4-gerar-os-dados-do-site).

### Incluir o e-mail de uma pessoa ou o site de um laboratório
Preencha a coluna `E-mail` ou `Site` na **linha da pessoa ou do laboratório**, não na da sala. Cada linha tem o próprio contato. O e-mail e o site aparecem no painel da sala e nos detalhes do cartão da lista.

Use de preferência o e-mail institucional e só publique o e-mail de quem concordou com isso.

### Professor mudou de sala
Na linha do professor, troque o `ID_fisico` pelo número da sala nova.

### Pessoa ou laboratório saiu
Apague a linha inteira (não só o conteúdo das células).

### Novo laboratório ou serviço numa sala que já existe
Crie uma linha com o `ID_fisico` da sala, o nome, a categoria e um `n` que ainda não exista (use o maior `n` da planilha + 1).

### A sala mudou de uso (ex.: virou sala de aula)
Atualize o `Tipo de local` de todas as linhas daquela sala. A cor muda sozinha.

### Sala nova, que não aparece no desenho
Veja a [seção 8](#8-quando-a-sala-não-existe-no-desenho).

## 4. Gerar os dados do site

Salve a planilha e feche o Excel (com o arquivo aberto, o Windows pode bloquear a leitura). Depois abra um terminal **na pasta do repositório** (GitHub Desktop: *Repository → Open in Command Prompt*) e rode:

```bash
python mapa/scripts/gerar_mapa.py
```

Se aparecer "Instale o openpyxl", rode uma vez:

```bash
pip install openpyxl
```

O script:

1. lê `mapa/dados/locais.xlsx`;
2. gera `mapa/dados/locais.json`, que o navegador usa para o painel de detalhes;
3. reescreve, em `mapa/index.html`, a planta, os botões "Destacar na planta" (com as contagens) e a lista "Todos os locais".

Saída esperada (os números mudam conforme a planilha):

```
144 linhas da planilha → 101 locais em 104 áreas da planta
  Salas de aula: 7
  Salas de professores: 22
  ...
```

Linhas começando com `aviso:` pedem atenção: veja a [seção 7](#7-avisos-do-script-e-como-resolver).

## 5. Conferir antes de publicar

O jeito mais seguro é abrir o site no seu computador. O portal e o mapa ficam no mesmo repositório, então basta:

1. Na raiz do repositório, rode `python -m http.server 8000`.
2. Abra <http://localhost:8000/mapa/>.

Confira:

- a sala que você mudou aparece com o nome e a cor certos (clique nela na planta);
- a busca encontra o que você incluiu;
- os números dos botões "Destacar na planta" fazem sentido.

Se não der para testar localmente, ao menos abra `mapa/index.html` num editor de texto e procure (Ctrl+F) pelo nome que você mudou.

## 6. Publicar

Faça o commit dos três arquivos que mudaram:

- `mapa/dados/locais.xlsx`
- `mapa/dados/locais.json`
- `mapa/index.html`

No GitHub Desktop: escreva um resumo (ex.: "Atualiza salas dos professores de Química Orgânica"), clique em **Commit to main** e depois em **Push origin**. Pela linha de comando:

```bash
git add mapa/dados/locais.xlsx mapa/dados/locais.json mapa/index.html
```

```bash
git commit -m "Atualiza salas dos professores de Química Orgânica"
```

```bash
git push
```

Em 1 ou 2 minutos a mudança aparece em <https://dqufpr.github.io/mapa/>. Se não aparecer, recarregue com Ctrl+F5.

Registre mudanças grandes (muitas salas de uma vez, nova categoria) na página [`mapa/atualizacao.html`](../mapa/atualizacao.html), no início do ano corrente.

## 7. Avisos do script e como resolver

| Aviso | O que significa | O que fazer |
|---|---|---|
| `o local X está na planilha, mas não tem área na planta` | O número `X` não existe no desenho. A sala aparece só na lista, não na planta. | Confira se o número está certo (ex.: `45B` em vez de `45-B`). Se for uma sala nova, veja a seção 8. |
| `a área X da planta não tem linhas na planilha` | A sala existe no desenho, mas ninguém está nela. Aparece em cinza, como "Sem informações". | Normal para sala vazia. Se não for, inclua as linhas na planilha. |
| `linha N: e-mail 'x' inválido, ignorado` | O e-mail da linha N não tem o formato `nome@dominio.br`. | Corrija o e-mail. Enquanto isso, a linha aparece sem e-mail. |
| `linha N: site 'x' inválido, ignorado` | O site da linha N não parece um endereço (ex.: tem espaços ou não tem domínio). | Corrija o endereço. Enquanto isso, a linha aparece sem site. |
| `linha N: tipo 'x' desconhecido` | O `Tipo de local` da linha N está escrito diferente da tabela da seção 2. | Corrija para um dos valores aceitos. |
| `Instale o openpyxl` | Falta a biblioteca que lê o Excel. | `pip install openpyxl` |
| `falta a coluna ...` | Uma coluna obrigatória foi renomeada ou apagada. | Restaure o nome exato do cabeçalho (seção 2). |
| `PermissionError` | A planilha pode estar aberta no Excel. | Feche o Excel e rode de novo. |

## 8. Quando a sala não existe no desenho

O desenho da planta fica em dois arquivos:

- `mapa/dados/planta-base.svg`: paredes, corredores e portas. Não tem números.
- `mapa/dados/planta-areas.json`: as áreas clicáveis. Cada uma tem o número da sala (`local`), os cantos do polígono (`pontos`) e a posição do número (`rotulo`):

```json
{"local": "45-B", "pontos": [[5288.8, 3020.1], [5414.9, 3020.1], [5414.9, 3273.3], [5288.8, 3273.3]], "rotulo": [5352, 3147]}
```

**Mudou só o número de uma sala existente:** em `planta-areas.json`, troque o `local` da área pelo número novo (Ctrl+F pelo número antigo) e atualize a planilha. Rode o script.

**Uma sala foi dividida em duas:** é preciso desenhar duas áreas no lugar de uma. As coordenadas usam o mesmo sistema do desenho (`viewBox` `480 600 6460 2760`). Abra `planta-base.svg` num editor vetorial (Inkscape, Illustrator), meça os cantos das novas salas e substitua a área antiga por duas novas no JSON. Se não tiver experiência com isso, abra uma *issue* no repositório descrevendo a mudança.

**Sala nova (obra, anexo):** o desenho-base também precisa mudar. Abra uma *issue* com uma foto ou croqui.

## 9. Checklist

- [ ] Fiz *Pull* antes de começar.
- [ ] Editei `mapa/dados/locais.xlsx` seguindo as regras da seção 2.
- [ ] Rodei `python mapa/scripts/gerar_mapa.py` e não sobrou nenhum `aviso:` inesperado.
- [ ] Conferi a sala alterada na planta (seção 5).
- [ ] Fiz commit de `locais.xlsx`, `locais.json` e `mapa/index.html` juntos.
- [ ] Fiz *Push* e conferi o site publicado.
