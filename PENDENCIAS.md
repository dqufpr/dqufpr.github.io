# Pendências

## Prioridade
- [ ] Publicar a página de Serviços: o rascunho está em `testes/servicos/` e substitui o cartão "Serviços digitais" (hoje "Em breve"). Antes, confirmar horários e e-mails reais das secretarias.
- [ ] Conferir se o link do site institucional (`http://www.quimica.ufpr.br/paginas/departamento/`) ainda está ativo e se há versão `https`.
- [ ] Testar o envio do formulário de contato publicado (Google Forms).
- [ ] Criar `site.webmanifest` (nome, cores e ícones) para "Adicionar à tela inicial" no celular abrir o site como aplicativo.
- [ ] Google Search Console: solicitar indexação de `/`, `/fale-conosco` e `/mapa/`; pedir a remoção de `/servicos`; confirmar o envio de `/sitemap.xml`.

## Depois
- [ ] Corrigir na planilha do mapa os conflitos de número de sala (lista em "Mapa Digital", abaixo).
- [ ] Avaliar aviso de consentimento para o Google Analytics (LGPD) ou trocar por uma ferramenta de estatísticas sem cookies.
- [ ] Verificação automática no GitHub (GitHub Actions) a cada mudança: links quebrados, HTML válido e sitemap atualizado.
- [ ] Campo de busca na página inicial ("Procure uma sala, laboratório ou professor") que leva ao resultado no mapa.
- [ ] Publicar "Perguntas frequentes" e "Primeiros passos" (rascunhos em `testes/`). O mural de avisos só se houver alguém para atualizá-lo com frequência.
- [ ] Cabeçalho e rodapé são copiados em mais de 100 páginas: criar um gerador simples para mudar o menu ou o rodapé num lugar só.

## Mapa Digital
### Da auditoria de 14/11 (aguardam aprovação)
- [ ] **Celular:** com o cartão da sala aberto, o cartão cobre parte dos botões da planta (o "ver a planta inteira" fica cortado e o "girar" some). Esconder ou reposicionar esses botões enquanto o cartão está aberto.
- [ ] **Computador:** ao escolher uma sala pequena, o zoom fica perto demais e não mostra as salas vizinhas. Limitar a aproximação máxima.
- [ ] **Endereço com sala inexistente** (`?local=999`): hoje é ignorado sem aviso. Mostrar "Sala não encontrada" e limpar o endereço.
- [ ] Testar o mapa no Safari de um iPhone real. A auditoria usou só o Chromium.

### Cores das categorias (a decidir)
A paleta atual tem três problemas, medidos em 14/11:
- **Contraste:** o mostarda dos laboratórios de ensino (`#a87516`) tem 4,0:1 com o número branco, abaixo do mínimo de 4,5:1.
- **Daltonismo:** no daltonismo verde-vermelho, as salas de professores e os banheiros quase se confundem.
- **Escadas:** o mostarda se parece com o amarelo das escadas na planta.

Propostas, na ordem `sala-aula`, `sala-prof`, `lab-ensino`, `lab-pesquisa`, `servico`, `banheiro`. As cores ficam nos tokens `--loc-*` de `css/global.css`.

| Opção | Cores | Contraste mín. | Separação no daltonismo |
|---|---|---|---|
| Atual | `#3d5fa8` `#2f7d6d` `#a87516` `#b4532f` `#5e3a7a` `#c0457f` | 4,0 | 5 |
| 1 · Atual ajustada (recomendada) | `#4263ad` `#17544a` `#8a6b10` `#933a1a` `#552f72` `#bd4a85` | 4,7 | 9 |
| 2 · Acessível | `#1f6fb0` `#0e4f42` `#7a6a2e` `#7a3410` `#3f3d6b` `#a24f86` | 5,3 | 9 a 11 |
| 3 · Sóbria | `#4a6a9c` `#2c5a4e` `#85703a` `#8a4433` `#4f4270` `#a55a82` | 4,8 | 7 |

- [ ] **Escolher uma opção e aplicar.** Atualizar os tokens, conferir os destaques, a lista, a impressão e o guia visual (`/design`), e gerar de novo as prévias de compartilhamento (`mapa/scripts/gerar_compartilhamento.js`).

### A fazer
- [ ] Corrigir na planilha os conflitos de número de sala e rodar `mapa/scripts/gerar_mapa.py` de novo:
  - Sala 49: mesmo número no Laboratório de Química Orgânica e na Sala de aula PQ 7.
  - Sala 59: mesmo número no Banheiro Privativo e no Laboratório de Extensão em Química.
  - GAQQ: estava na área da sala 92, mas o `ID_fisico` é 97 (hoje aparece na 97).
  - Lab-RMN: aparece nas salas 6 ("Em implementação") e 72.
- [ ] Corrigir erros de digitação na planilha: "reverva", "Gradução", "Golçalves", "Sintese" e "George" (sem sobrenome).

### Ideias

#### QR codes nas portas
Gerar uma folha para imprimir com o QR code de cada sala, apontando para a página dela (`/mapa/l/45-B`), para colar nas portas ou no saguão.

#### Versão em inglês
Mapa e páginas principais em inglês, para visitantes e estudantes estrangeiros.

#### Compartilhar um local
Botão no card da sala para enviar o local a outra pessoa.
- **WhatsApp:** link com o nome da sala e o endereço dela (`/mapa/?local=45-B`).
- **Instagram:** o Instagram não tem link de compartilhamento para sites. O caminho é o compartilhamento nativo do celular (Web Share API) ou baixar uma imagem para postar.
- **Stories:** gerar uma imagem do card no formato vertical (1080×1920), com o número da sala, o nome, a cor da categoria e a posição na planta.

#### Melhorar a versão para celular
Aproveitar mais a tela no celular, com a planta como foco.
- Planta ocupando 100% do fundo da tela.
- Busca e destaques em elementos flutuantes sobre a planta.
- Card do local selecionado fixo na parte de baixo da tela.
- A definir: como chegar à lista "Todos os locais" e ao rodapé com a planta ocupando a tela inteira, e como rolar a página sem ficar preso na planta.
