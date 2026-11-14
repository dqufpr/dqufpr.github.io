# Google Analytics do DQ Digital

Propriedade GA4 `G-0HMX2K2MHE`. O código fica em `js/analytics.js` e é carregado em todas as páginas de conteúdo: portal, Sobre, Fale conosco, Guia visual, 404 e as páginas do mapa. As páginas de redirecionamento (`mapa/l/`, `mapa/p/`, endereços antigos) não o carregam: elas levam a uma página que já conta a visita.

## 1. O que o mapa envia

Além das visitas às páginas, o mapa envia três eventos, no padrão recomendado pelo GA4:

| Evento | Quando | Parâmetros |
|---|---|---|
| `select_content` | Um cartão é aberto: pela planta, pela busca, pela lista ou por um link compartilhado | `content_type`: `sala`, `pessoa`, `laboratorio_pesquisa`, `laboratorio_ensino` ou `servico`<br>`content_id`: o identificador (ex.: `laesb`, `92`)<br>`nome`: o nome legível (ex.: "LAESB · Laboratório de Espectrometria…") |
| `share` | Um botão de compartilhar é tocado | `method`: `whatsapp`, `instagram`, `copiar` ou `enviar`<br>`content_type`: `sala`, `pessoa` ou `unidade`<br>`item_id`: o identificador |
| `search` | Um termo é buscado (conta quando a digitação para por 1,5 s, com 2 letras ou mais) | `search_term`: o termo, em minúsculas |

O mesmo cartão redesenhado não conta duas vezes seguidas.

Os cliques nos sites dos laboratórios são contados pela **medição otimizada** do GA4: evento `click`, com `link_domain` e `link_url`. Esses links também levam parâmetros UTM, para o Analytics do laboratório saber que o acesso veio do Mapa Digital (ver `MAPA-ATUALIZAR-DADOS.md`).

## 2. Configurar uma vez, no Google Analytics

Os parâmetros só viram colunas nos relatórios depois de registrados. **O registro não vale para trás:** os dados aparecem a partir do dia em que a dimensão é criada, então faça isso logo.

1. **Administrador › Exibição de dados › Definições personalizadas › Criar dimensões personalizadas.** Crie quatro dimensões, todas com escopo **Evento**:

   | Nome da dimensão | Parâmetro do evento |
   |---|---|
   | Nome do conteúdo | `nome` |
   | Tipo de conteúdo | `content_type` |
   | ID do conteúdo | `content_id` |
   | Forma de compartilhar | `method` |

2. **Administrador › Coleta e modificação de dados › Fluxos de dados › (o fluxo do site) › Medição otimizada:**
   - deixe ligados **Cliques de saída** e **Pesquisa no site**;
   - em **Visualizações de página › Mostrar configurações avançadas**, desligue **"Mudanças de página com base em eventos do histórico do navegador"**. O mapa atualiza o endereço a cada cartão aberto e, com essa opção ligada, cada cartão contaria como uma visita nova à página.

## 3. Ver o que é mais acessado

**Laboratórios, salas e pessoas mais vistos:**

1. **Explorar › Exploração livre.**
2. Em **Dimensões**, adicione *Nome do conteúdo*, *Tipo de conteúdo* e *Nome do evento*. Em **Métricas**, adicione *Contagem de eventos* e *Total de usuários*.
3. Arraste *Nome do conteúdo* para **Linhas** e as duas métricas para **Valores**.
4. Em **Filtros**, ponha *Nome do evento* exatamente igual a `select_content`.
5. Para só laboratórios, acrescente o filtro *Tipo de conteúdo* contém `laboratorio`.

Salve a exploração com um nome (ex.: "Mapa: mais vistos") para abrir de novo depois.

**Sites de laboratório mais visitados a partir do mapa:** a mesma exploração, com *Domínio do link* nas linhas e o filtro *Nome do evento* = `click`.

**O que as pessoas buscam:** *Relatórios › Engajamento › Eventos › search*, ou uma exploração com a dimensão *Termo de pesquisa*. Termos que não acham nada mostram o que falta na planilha.

**Compartilhamentos:** a mesma exploração, com *Forma de compartilhar* e *Nome do conteúdo* nas linhas e o filtro *Nome do evento* = `share`.

**Um painel pronto, para mostrar à equipe ou à coordenação:** o Looker Studio (<https://lookerstudio.google.com/>) lê a propriedade do GA4 e monta tabelas e gráficos que se atualizam sozinhos.

## 4. Privacidade

- Os números são agregados. O site não envia nome, e-mail nem nada que identifique quem acessa.
- Os nomes enviados (salas, laboratórios, pessoas) são os mesmos que já estão públicos no mapa.
- O aviso de estatísticas está em `sobre.html` (Privacidade) e em `mapa/legal.html`.
