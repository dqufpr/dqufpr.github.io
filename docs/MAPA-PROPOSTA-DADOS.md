# Proposta: nova organização dos dados do Mapa Digital

Situação: proposta para discutir (14/11/2026). Nada disto foi implementado ainda.

## 1. Como os dados estão hoje

A planilha `mapa/dados/locais.xlsx` tem **uma aba só**. Cada linha é "uma coisa dentro de uma sala": uma pessoa, um laboratório, um serviço, uma sala de aula ou um banheiro.

| Tipo | Linhas |
|---|---|
| Professores (`salaprof`) | 54 |
| Laboratórios de pesquisa | 41 |
| Serviços | 22 |
| Laboratórios de ensino | 12 |
| Banheiros | 8 |
| Salas de aula | 7 |
| **Total** | **144 linhas em 101 salas** |

Funciona, mas a planilha mistura **espaços** (salas, laboratórios) e **pessoas** na mesma lista. Isso cria cinco problemas:

1. **Laboratório repetido.** Dos 32 laboratórios de pesquisa, 7 ocupam mais de uma sala e aparecem em várias linhas iguais (ex.: LaBioInC nas salas 8 e 9; um laboratório nas salas 46, 47 e 49). Para mudar a descrição, é preciso mudar todas as linhas, e é fácil esquecer uma.
2. **Responsável como texto solto.** O coordenador do laboratório está escrito na coluna `Descrição` ("Fábio Souza Nunes, Jaísa Soares e Shirley Nakagaki"). Das 42 pessoas citadas assim:
   - 20 estão escritas igual ao cadastro de professores;
   - 10 estão escritas de outro jeito ("Jaísa Soares" × "Jaísa Fernandes Soares"; "Tatiana R. Simões");
   - 12 nem estão cadastradas como professores.
   
   Por isso, buscar uma pessoa nem sempre encontra os laboratórios dela, e o mapa não consegue ligar "professora" a "laboratório que ela coordena".
3. **A coluna `Descrição` serve para tudo.** Ela guarda área do professor ("Professor/Química Inorgânica"), responsáveis, regras de acesso ("Acesso restrito/servidores") e textos genéricos ("Laboratório de Ensino").
4. **Siglas sem sentido para quem lê.** Os 8 banheiros têm a sigla "BW".
5. **Conflitos de número.** As salas 49 e 59 têm usos misturados (laboratório e sala de aula; laboratório e banheiro). Esses conflitos já estão listados no `PENDENCIAS.md`.

## 2. Proposta: três abas, cada uma com um tipo de coisa

A mesma planilha Excel, com três abas. Cada laboratório e cada pessoa aparece **uma vez só**. As ligações são feitas pelo nome, e o script avisa quando um nome não bate.

### Aba `Salas`: os espaços físicos (uma linha por sala)

| Sala | Tipo | Nome | Acesso / observação |
|---|---|---|---|
| 7 | Sala de professores | | |
| 8 | Laboratório de pesquisa | | |
| 24 | Sala de aula | Sala de Aula da Pós-Graduação em Química | |
| 4 | Banheiro | Banheiro privativo | Acesso restrito a servidores |

- `Tipo` define a cor na planta. O `Nome` só é preenchido quando a sala tem nome próprio (sala de aula, auditório, banheiro).
- O andar vem da planta, não precisa ser preenchido.

### Aba `Pessoas`: uma linha por pessoa

| Nome | Cargo | Área | Sala | E-mail | Página |
|---|---|---|---|---|---|
| Shirley Nakagaki | Professora | Química Inorgânica | 7 | | |
| Fernanda G. D. Pinheiro | Secretária | Pós-Graduação | 45-B | | |

- `Cargo` e `Área` substituem o "Professor/Química Inorgânica" escrito na `Descrição`.
- `Página` é opcional: currículo Lattes ou página pessoal.
- Quem não tem sala fixa, mas coordena um laboratório, entra com a coluna `Sala` vazia.

### Aba `Unidades`: laboratórios, serviços e setores (uma linha por unidade)

| Nome | Sigla | Tipo | Salas | Responsáveis | Descrição | Site |
|---|---|---|---|---|---|---|
| Laboratório de Bioinorgânica | LaBioInC | Laboratório de pesquisa | 8; 9 | Fábio Souza Nunes; Jaísa Fernandes Soares; Shirley Nakagaki | (o que o laboratório faz) | |
| Laboratório Multiusuário de RMN | Lab-RMN | Laboratório de pesquisa | 6; 72 | | Análises avançadas por RMN… | |
| Secretaria da Pós-graduação em Química | PPGQ | Serviço | 45-B | Fernanda G. D. Pinheiro; Marcelo Câmara | Horário de atendimento… | |

- `Salas` aceita várias salas: o laboratório que ocupa as salas 46, 47 e 49 vira **uma linha**.
- `Responsáveis` usa os nomes da aba `Pessoas`. O script avisa se um nome não for encontrado. Fica impossível "Jaísa Soares" e "Jaísa Fernandes Soares" virarem duas pessoas.
- `Descrição` passa a ser só o que a unidade é ou faz.

### Facilidades na planilha

- **Listas de escolha** nas colunas `Tipo`, `Sala` e `Cargo`: a célula mostra as opções válidas e não aceita erro de digitação.
- **Aba `Leia-me`** com as instruções curtas e um exemplo de cada tipo.

## 3. O que melhora para quem usa o mapa

| Hoje | Com a proposta |
|---|---|
| A busca acha uma pessoa só pelo texto escrito na sala | **Cartão da pessoa:** nome, cargo e área, sala (com "ver na planta"), laboratórios que coordena, e-mail e página |
| O cartão da sala lista os itens soltos | **Cartão da sala:** quem trabalha nela e o que funciona nela, separados |
| O laboratório aparece igual em cada sala que ocupa | **Cartão do laboratório:** descrição, site, responsáveis (tocar num nome abre o cartão da pessoa) e todas as salas destacadas juntas na planta |
| Resultados da busca numa lista única | **Resultados agrupados:** Pessoas, Laboratórios e serviços, Salas |
| Links só de sala (`?local=45-B`) | Links também de pessoa e de laboratório (`?pessoa=shirley-nakagaki`, `?unidade=labioinc`) para compartilhar |

O desenho da planta, as cores, as entradas e o resto da interface continuam como estão.

## 4. O que melhora para quem mantém os dados

- **Um lugar para cada informação:** um professor muda de sala → muda uma célula na aba `Pessoas`. O laboratório muda de descrição → uma célula na aba `Unidades`.
- **Avisos do script mais úteis:**
  - responsável que não está em `Pessoas`;
  - sala que não existe na planta;
  - pessoa ou laboratório repetido;
  - sala com tipos misturados.
- **Menos erro de digitação**, com as listas de escolha.

## 5. Como fazer a mudança (em etapas)

1. **Converter a planilha atual automaticamente.** Um script monta as três abas a partir da aba atual:
   - linhas de professores → `Pessoas`, com "Professor/Química Inorgânica" separado em Cargo e Área;
   - laboratórios repetidos → uma linha em `Unidades`, com as salas juntas;
   - nomes na `Descrição` → `Responsáveis`, quando o nome bater com uma pessoa cadastrada.
   
   O que não der para decidir sozinho (as 10 grafias diferentes e as 12 pessoas não cadastradas) vai para uma **lista de revisão** para você conferir.
2. **Revisão dos dados** por você. É a única etapa manual.
3. **Gerador** (`gerar_mapa.py`) lendo as três abas, com os avisos novos. O site continua igual até aqui.
4. **Interface:** cartões de pessoa e de laboratório, busca agrupada e os links novos.
5. **Documentação** (`MAPA-ATUALIZAR-DADOS.md`) refeita para as três abas.

As etapas 1 e 3 não mudam nada no site e podem ser feitas e conferidas antes da etapa 4.

## 6. Decisões em aberto

- **Quem entra em `Pessoas`:** só professores e servidores com sala, ou também técnicos de laboratório? Alunos ficam de fora, por privacidade.
- **Página pessoal:** currículo Lattes, página do departamento ou nenhuma?
- **E-mail:** publicar só com o consentimento da pessoa e de preferência o institucional. A coluna fica, mas vazia até haver consentimento.
- **Laboratórios de ensino:** mantêm "Laboratório de Ensino" como descrição ou ganham uma descrição própria (disciplinas atendidas, por exemplo)?
- **Planilha ou Google Sheets:** a planilha Excel no repositório continua funcionando. Uma planilha no Google permitiria que mais pessoas editassem, mas o site passaria a depender de um serviço externo. Recomendo manter o Excel.
