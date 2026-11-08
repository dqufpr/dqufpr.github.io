# Pendências

## Prioridade
- [ ] Conferir se o link do site institucional (`http://www.quimica.ufpr.br/paginas/departamento/`) ainda está ativo e se há versão `https`.
- [ ] Testar o envio do formulário de contato publicado (Google Forms).

## Depois
- [ ] Corrigir na planilha do mapa os conflitos de número de sala (lista em "Mapa Digital", abaixo).
- [ ] Definir o conteúdo do cartão "Serviços digitais" (hoje "Em breve").
- [ ] Gerar uma imagem de compartilhamento (`og:image`) no visual novo.
- [ ] Avaliar aviso de consentimento para o Google Analytics (LGPD).
- [ ] Cabeçalho e rodapé ainda são copiados em cada página: avaliar um gerador simples se o número de páginas crescer.

## Mapa Digital
### A fazer
- [ ] Corrigir na planilha os conflitos de número de sala e rodar `scripts/gerar_mapa.py` de novo:
  - Sala 49: mesmo número no Laboratório de Química Orgânica e na Sala de aula PQ 7.
  - Sala 59: mesmo número no Banheiro Privativo e no Laboratório de Extensão em Química.
  - GAQQ: estava na área da sala 92, mas o `ID_fisico` é 97 (hoje aparece na 97).
  - Lab-RMN: aparece nas salas 6 ("Em implementação") e 72.
- [ ] Corrigir erros de digitação na planilha: "reverva", "Gradução", "Golçalves", "Sintese" e "George" (sem sobrenome).

### Ideias

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
