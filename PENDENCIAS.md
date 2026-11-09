# Pendências

## Prioridade
- [ ] Publicar a página de Serviços: o rascunho está em `testes/servicos/` e substitui o cartão "Serviços digitais" (hoje "Em breve"). Antes, confirmar horários e e-mails reais das secretarias.
- [ ] Conferir se o link do site institucional (`http://www.quimica.ufpr.br/paginas/departamento/`) ainda está ativo e se há versão `https`.
- [ ] Testar o envio do formulário de contato publicado (Google Forms).
- [ ] Criar `site.webmanifest` (nome, cores e ícones) para "Adicionar à tela inicial" no celular abrir o site como aplicativo.
- [ ] Google Search Console: solicitar indexação de `/`, `/fale-conosco` e `/mapa/`; pedir a remoção de `/servicos`; confirmar o envio de `/sitemap.xml`.

## Depois
- [ ] Corrigir na planilha do mapa os conflitos de número de sala (lista em "Mapa Digital", abaixo).
- [ ] Gerar uma imagem de compartilhamento (`og:image`) no visual novo.
- [ ] Avaliar aviso de consentimento para o Google Analytics (LGPD) ou trocar por uma ferramenta de estatísticas sem cookies.
- [ ] Verificação automática no GitHub (GitHub Actions) a cada mudança: links quebrados, HTML válido e sitemap atualizado.
- [ ] Campo de busca na página inicial ("Procure uma sala, laboratório ou professor") que leva ao resultado no mapa.
- [ ] Publicar "Perguntas frequentes" e "Primeiros passos" (rascunhos em `testes/`). O mural de avisos só se houver alguém para atualizá-lo com frequência.
- [ ] Cabeçalho e rodapé são copiados em mais de 100 páginas: criar um gerador simples para mudar o menu ou o rodapé num lugar só.

## Mapa Digital
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
