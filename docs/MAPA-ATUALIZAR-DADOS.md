# Como atualizar os dados do Mapa Digital

Guia passo a passo para quem mantém o mapa. Ele cobre os casos comuns (trocar a descrição de um laboratório, mudar um professor de sala, incluir um serviço) e como publicar a mudança.

**Resumo:**
1. Edite `mapa/dados/dados-mapa.xlsx`.
2. Rode `python mapa/scripts/gerar_mapa.py`.
3. Confira o resultado.
4. Faça o commit e o push.

O site atualiza sozinho em 1 ou 2 minutos.

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

O arquivo é **`mapa/dados/dados-mapa.xlsx`**. Ele é a única fonte dos dados do mapa e tem três abas de dados. Cada sala, cada pessoa e cada laboratório ou serviço aparece **uma vez só**.

Regras que valem para todas as abas:
- **Colunas pelo nome:** o script encontra cada coluna pelo nome do cabeçalho. Não renomeie os cabeçalhos.
- **Coluna `n`:** é só a numeração das linhas, para organizar. O script ignora essa coluna.
- **Ordem:** a ordem das linhas é a ordem em que aparecem no mapa.
- **Campos vazios:** não aparecem no mapa (e-mail, Lattes, site, descrição).

### Aba `Salas`: uma linha por sala

| Coluna | Obrigatória | Exemplo | O que faz |
|---|---|---|---|
| `Sala` | sim | `45-B` | **Número da sala, igual ao da porta.** Liga a linha à sala desenhada na planta. |
| `Tipo` | sim | `Sala de professores` | Cor da sala na planta (lista de escolha). |
| `Nome` | não | `Banheiro Feminino` | Só quando a sala tem nome próprio: sala de aula, banheiro, auditório. |
| `Acesso ou observação` | não | `Acesso restrito/servidores` | Aparece no cartão da sala. |

Valores de **`Tipo`**: Sala de aula, Sala de professores, Laboratório de ensino, Laboratório de pesquisa, Serviço, Banheiro e Outros (cinza).

### Aba `Pessoas`: professores e técnicos

| Coluna | Obrigatória | Exemplo | O que faz |
|---|---|---|---|
| `Nome` | sim | `Shirley Nakagaki` | Nome completo. É o nome usado na coordenação dos laboratórios. |
| `Cargo` | sim | `Professora` | Professor, Professora, Técnico ou Técnica (lista de escolha). |
| `Área ou setor` | não | `Química Inorgânica` | Área do professor ou setor do técnico. |
| `Sala` | sim | `7` | Sala da pessoa (o número da aba `Salas`). |
| `E-mail` | não | `nome@ufpr.br` | **Só o institucional (`@ufpr.br`).** Publique só com o consentimento da pessoa. |
| `Lattes` | não | `lattes.cnpq.br/1234567890123456` | Endereço do currículo Lattes; o `https://` pode ficar de fora. |

Só entram pessoas com cargo público e sala no departamento (professores e técnicos). Alunos não entram.

### Aba `Unidades`: laboratórios e serviços

| Coluna | Obrigatória | Exemplo | O que faz |
|---|---|---|---|
| `Nome` | sim | `Laboratório de Bioinorgânica` | Nome da unidade. |
| `Sigla` | não | `LaBioInC` | Selo ao lado do nome; também serve para buscar. |
| `Tipo` | sim | `Laboratório de pesquisa` | Laboratório de pesquisa, Laboratório de ensino ou Serviço (lista de escolha). |
| `Salas` | sim | `8; 9` | Uma ou mais salas, separadas por ponto e vírgula. |
| `Coordenação` | não | `Shirley Nakagaki; Jaísa Fernandes Soares` | Um ou mais nomes, separados por ponto e vírgula, **escritos igual à aba `Pessoas`**. |
| `Descrição` | não | `Síntese e caracterização de…` | O que a unidade faz. Nos laboratórios de ensino, uma descrição breve. |
| `Site` | não | `laesb.ufpr.br` | Site do laboratório; o `https://` pode ficar de fora. |

**O que se espera de cada tipo de unidade:**
- **Laboratório de pesquisa:** descrição, site e coordenação.
- **Laboratório de ensino:** uma descrição breve.
- **Serviço:** descrição com horário ou regras de acesso, se houver.

**No mapa:**
- Cada pessoa e cada laboratório tem um cartão próprio.
- O cartão da pessoa mostra o cargo, a sala, o e-mail, o Lattes e os laboratórios que ela coordena.
- O cartão do laboratório mostra a descrição, o site, a coordenação (tocar num nome abre a pessoa) e as salas.
- O cartão da sala mostra o que funciona nela e quem trabalha nela.

**Regras importantes**

- **Um nome, um jeito de escrever.** Na `Coordenação`, use o nome exatamente como está na aba `Pessoas`. Acentos e maiúsculas não importam, mas abreviações sim: "Jaísa Soares" não encontra "Jaísa Fernandes Soares". Se o coordenador não estiver em `Pessoas`, o nome aparece no cartão, mas sem link.
- **O número da sala é o da porta**, com letras maiúsculas: `45-A`, não `45-a`.
- **Não quebre linha dentro da célula.** O script limpa os espaços nas pontas, mas não corrige erros de digitação.

## 3. Casos comuns

### Professor mudou de sala
Na aba `Pessoas`, troque a `Sala` da pessoa. O cartão da sala antiga e o da nova se ajustam sozinhos.

### Pessoa saiu do departamento
Apague a linha da pessoa em `Pessoas`. Se ela coordenava algum laboratório, tire o nome da `Coordenação` desse laboratório. O script avisa se esquecer.

### Novo professor ou técnico
Inclua uma linha em `Pessoas`, com nome, cargo, área e sala.

### Laboratório mudou de descrição, site ou coordenação
Edite a linha do laboratório em `Unidades`. Como cada laboratório aparece uma vez só, a mudança vale para todas as salas dele.

### Laboratório ganhou ou perdeu uma sala
Na coluna `Salas` da unidade, acrescente ou tire o número (ex.: `8; 9; 10`). Confira o `Tipo` da sala na aba `Salas`.

### Novo laboratório ou serviço
Inclua uma linha em `Unidades`. Se a sala é nova no cadastro, inclua também a linha dela em `Salas`.

### A sala mudou de uso (ex.: virou sala de aula)
Na aba `Salas`, troque o `Tipo`. A cor na planta muda sozinha.

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

1. lê as abas `Salas`, `Pessoas` e `Unidades` de `mapa/dados/dados-mapa.xlsx`;
2. confere as ligações (salas que existem, nomes da coordenação, e-mails, endereços);
3. gera `mapa/dados/locais.json`, que o navegador usa para os cartões e a busca;
4. reescreve, em `mapa/index.html`, a planta, os botões "Destacar na planta" (com as contagens) e a lista "Todos os locais".

Saída esperada (os números mudam conforme a planilha):

```
101 salas, 59 pessoas e 57 unidades (planta com 104 áreas)
  Salas de aula: 6
  Salas de professores: 22
  ...
```

Linhas começando com `aviso:` pedem atenção: veja a [seção 7](#7-avisos-do-script-e-como-resolver).

As imagens de prévia dos links compartilhados são refeitas sozinhas pelo GitHub, depois do push.

## 5. Conferir antes de publicar

O jeito mais seguro é abrir o site no seu computador:

1. Na raiz do repositório, rode `python -m http.server 8000`.
2. Abra <http://localhost:8000/mapa/>.

Confira:

- **a sala:** a sala que você mudou aparece com o nome e a cor certos (clique nela na planta);
- **a busca:** busque o nome da pessoa ou do laboratório; o cartão mostra o que você preencheu;
- **a coordenação:** no cartão do laboratório, os nomes da coordenação abrem o cartão da pessoa.

## 6. Publicar

Faça o commit dos três arquivos que mudaram:

- `mapa/dados/dados-mapa.xlsx`
- `mapa/dados/locais.json`
- `mapa/index.html`

No GitHub Desktop: escreva um resumo (ex.: "Atualiza a coordenação do LAESB"), clique em **Commit to main** e depois em **Push origin**. Pela linha de comando:

```bash
git add mapa/dados/dados-mapa.xlsx mapa/dados/locais.json mapa/index.html
```

```bash
git commit -m "Atualiza a coordenação do LAESB"
```

```bash
git push
```

Em 1 ou 2 minutos a mudança aparece em <https://dqufpr.github.io/mapa/>. Se não aparecer, recarregue com Ctrl+F5.

Registre mudanças grandes (muitas salas de uma vez, nova categoria) na página [`mapa/atualizacao.html`](../mapa/atualizacao.html), no início do ano corrente.

## 7. Avisos do script e como resolver

| Aviso | O que significa | O que fazer |
|---|---|---|
| `'X' (coordenação de 'Y') não está na aba Pessoas` | O nome na `Coordenação` não bate com nenhuma pessoa. Ele aparece no cartão, mas sem link. | Escreva o nome igual à aba `Pessoas`, ou inclua a pessoa lá (se for professor ou técnico). |
| `sala X de 'Y' não está na aba Salas` | A unidade ou a pessoa aponta para uma sala que não existe. | Confira o número (ex.: `45B` em vez de `45-B`) ou inclua a sala em `Salas`. |
| `a sala X não existe no desenho da planta` | A sala está em `Salas`, mas não no desenho. Aparece só na lista. | Confira o número. Se for uma sala nova, veja a seção 8. |
| `a sala X está desenhada na planta, mas não está na aba Salas` | Falta a linha da sala. Ela aparece em cinza. | Inclua a sala em `Salas`. |
| `a sala X não tem nome, pessoas nem unidades` | A sala existe, mas nada está ligado a ela. | Normal para sala vazia. Se não for, ligue uma pessoa ou unidade a ela. |
| `e-mail 'x' ignorado (só o institucional, @ufpr.br)` | O e-mail não é `@ufpr.br`. | Use o e-mail institucional. |
| `Lattes 'x' inválido` / `site 'x' inválido` | O endereço não parece válido. | Corrija o endereço. Enquanto isso, ele não aparece. |
| `tipo 'x' desconhecido` | O `Tipo` está escrito diferente da lista. | Escolha um valor da lista de escolha da célula. |
| `'X' aparece mais de uma vez` | Sala ou pessoa repetida. | Apague a linha repetida. |
| `falta a aba ...` / `falta a coluna ...` | Uma aba ou um cabeçalho foi renomeado ou apagado. | Restaure o nome exato (seção 2). |
| `Instale o openpyxl` | Falta a biblioteca que lê o Excel. | `pip install openpyxl` |
| `PermissionError` | A planilha pode estar aberta no Excel. | Feche o Excel e rode de novo. |

## 8. Quando a sala não existe no desenho

O desenho da planta fica em dois arquivos:

- `mapa/dados/planta-base.svg`: paredes, corredores e portas. Não tem números.
- `mapa/dados/planta-areas.json`: as áreas clicáveis. Cada uma tem o número da sala (`local`), os cantos do polígono (`pontos`) e a posição do número (`rotulo`):

```json
{"local": "45-B", "pontos": [[5288.8, 3020.1], [5414.9, 3020.1], [5414.9, 3273.3], [5288.8, 3273.3]], "rotulo": [5352, 3147]}
```

**Mudou só o número de uma sala existente:** em `planta-areas.json`, troque o `local` da área pelo número novo (Ctrl+F pelo número antigo). Depois troque o número na planilha, nas três abas, e rode o script.

**Uma sala foi dividida em duas:** é preciso desenhar duas áreas no lugar de uma. As coordenadas usam o mesmo sistema do desenho (`viewBox` `480 600 6460 2760`). Abra `planta-base.svg` num editor vetorial (Inkscape, Illustrator), meça os cantos das novas salas e substitua a área antiga por duas novas no JSON. Se não tiver experiência com isso, abra uma *issue* no repositório descrevendo a mudança.

**Sala nova (obra, anexo):** o desenho-base também precisa mudar. Abra uma *issue* com uma foto ou croqui.

## 9. Checklist

- [ ] Fiz *Pull* antes de começar.
- [ ] Editei `mapa/dados/dados-mapa.xlsx` seguindo as regras da seção 2.
- [ ] Rodei `python mapa/scripts/gerar_mapa.py` e não sobrou nenhum `aviso:` inesperado.
- [ ] Conferi a sala, a pessoa ou o laboratório alterado no mapa (seção 5).
- [ ] Fiz commit de `dados-mapa.xlsx`, `locais.json` e `mapa/index.html` juntos.
- [ ] Fiz *Push* e conferi o site publicado.
