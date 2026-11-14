"""Gera as páginas de teste em testes/ a partir do cabeçalho e rodapé de sobre.html."""
import pathlib, re, sys

RAIZ = pathlib.Path(sys.argv[1])
base = (RAIZ / "sobre.html").read_text()
header = base[base.index('<a class="skip-link"'):base.index('<main')]
footer = base[base.index('<!-- RODAPÉ'):]

# Menu com o item "Serviços" (só nos testes)
header = header.replace('<li><a href="/mapa/">Mapa Digital</a></li>',
                        '<li><a href="/mapa/">Mapa Digital</a></li>\n        <li><a href="/testes/servicos/">Serviços</a></li>')
footer = footer.replace('<li><a href="/mapa/">Mapa Digital</a></li>',
                        '<li><a href="/mapa/">Mapa Digital</a></li>\n        <li><a href="/testes/servicos/">Serviços do prédio</a></li>')

CSP = ("default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; "
       "style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://docs.google.com")

BANNER = '''<div class="test-banner" role="note">
  <div class="container"><p><strong>Página de teste.</strong> Rascunho local, não publicado. Horários, contatos e textos marcados como exemplo são fictícios. <a href="/testes/">Ver todas as páginas de teste</a>.</p></div>
</div>
'''

def icon(nome):
    return f'<svg class="icon" aria-hidden="true" focusable="false"><use href="/img/icons/sprite.svg#{nome}"></use></svg>'

def pagina(caminho, titulo, descricao, corpo):
    html = f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="{CSP}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="robots" content="noindex, nofollow">
  <title>{titulo} · DQ Digital</title>
  <meta name="description" content="{descricao}">
  <meta name="theme-color" content="#1d3c69" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0f2340" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/img/favicon-192.png" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="preload" href="/fonts/roboto-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <script src="/js/theme-init.js"></script>
  <link rel="stylesheet" href="/css/global.css">
  <link rel="stylesheet" href="/css/pages.css">
  <link rel="stylesheet" href="/testes/css/testes.css">
  <script src="/js/app.js" defer></script>
</head>
<body>
{header.replace('<header class="site-header">', BANNER + '<header class="site-header">', 1)}<main id="main" tabindex="-1">
{corpo}
</main>

{footer}'''
    destino = RAIZ / "testes" / caminho
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(html)

# ---------------------------------------------------------------- Serviços
SERVICOS = [
    # slug, nome, sigla/selo, sala, ícone, texto, grupo
    ("secretaria-departamento", "Secretaria do Departamento de Química", "", "45-C", "building",
     "Atendimento a estudantes de graduação: matrícula, declarações, ajustes e trâmites do curso.", "Secretarias e coordenações"),
    ("secretaria-pos", "Secretaria da Pós-graduação em Química", "PPGQ", "45-B", "building",
     "Atendimento a estudantes de mestrado e doutorado: matrícula, defesas, bolsas e documentos.", "Secretarias e coordenações"),
    ("coordenacao-graduacao", "Coordenação da Graduação em Química", "", "45-A", "building",
     "Equivalências, aproveitamento de disciplinas, estágios e orientação acadêmica.", "Secretarias e coordenações"),
    ("auditorio", "Auditório Principal", "Reserva", "1", "clock",
     "Espaço para eventos, defesas e confraternizações. Requer reserva de horário.", "Espaços com reserva"),
    ("sala-reunioes", "Sala de Reuniões do Departamento", "Reserva", "45-E", "clock",
     "Reuniões de grupos, bancas e comissões. Acesso mediante reserva prévia.", "Espaços com reserva"),
    ("sala-estudos-pos", "Sala de Estudos da Pós-Graduação", "S-PPGQ", "33", "info",
     "Sala de estudos de acesso restrito aos estudantes de pós-graduação.", "Espaços com reserva"),
    ("central-produtos", "Central de Produtos Químicos", "", "87", "flask",
     "Armazenamento e retirada de reagentes para os laboratórios do departamento.", "Apoio aos laboratórios"),
    ("oficina-hialotecnia", "Oficina de Hialotecnia", "", "71", "flask",
     "Confecção e reparo de vidrarias de laboratório.", "Apoio aos laboratórios"),
    ("instrumentacao", "Sala de Instrumentação Analítica", "", "76", "flask",
     "Equipamentos de análise de uso compartilhado entre grupos.", "Apoio aos laboratórios"),
    ("caqui", "Centro Acadêmico de Química", "CAQUI", "44", "mail",
     "Representação dos estudantes de graduação em Química.", "Estudantes"),
    ("pet", "PET Química", "PET", "83", "mail",
     "Programa de Educação Tutorial: ensino, pesquisa e extensão.", "Estudantes"),
    ("isomeria", "Empresa Júnior de Química", "Isomeria", "51", "mail",
     "Consultoria e projetos desenvolvidos por estudantes de Química.", "Estudantes"),
]

grupos = {}
for s in SERVICOS:
    grupos.setdefault(s[6], []).append(s)

def cartao(s):
    slug, nome, selo, sala, ic, texto, _ = s
    href = "/testes/servicos/secretaria" if slug == "secretaria-departamento" else f"/mapa/?local={sala}"
    rodape = "Ver detalhes" if slug == "secretaria-departamento" else f"Ver sala {sala} no mapa"
    badge = f'<span class="badge badge--ext">{selo}</span>' if selo else ""
    return f'''        <article class="card card--link">
          <div class="card__body">
            <span class="card__icon">{icon(ic)}</span>
            <div class="card__top"><h3 class="card__title"><a href="{href}">{nome}</a></h3>{badge}</div>
            <p class="card__text">{texto}</p>
            <p class="card__footer" aria-hidden="true">{rodape} {icon('arrow-right').replace(' aria-hidden="true"', '')}</p>
          </div>
        </article>'''

secoes = []
for i, (grupo, itens) in enumerate(grupos.items()):
    gid = f"grupo-{i}"
    alt = " section--alt" if i % 2 else ""
    secoes.append(f'''  <section class="section{alt}" aria-labelledby="{gid}">
    <div class="container">
      <div class="section-head"><h2 id="{gid}">{grupo}</h2></div>
      <div class="grid grid--3">
{chr(10).join(cartao(s) for s in itens)}
      </div>
    </div>
  </section>''')

atalhos = "\n".join(f'        <a class="loc-tag loc--servico" href="#grupo-{i}">{g}</a>' for i, g in enumerate(grupos))

pagina("servicos/index.html", "Serviços do prédio",
       "Secretarias, coordenações, espaços com reserva e apoio aos laboratórios do Departamento de Química da UFPR, com a sala de cada serviço no Mapa Digital.",
       f'''  <section class="page-hero container">
    <p class="eyebrow">Serviços</p>
    <h1>Serviços do prédio</h1>
    <p class="lead">Onde fica cada secretaria, coordenação e serviço do Departamento de Química, com o caminho até a sala no Mapa Digital.</p>
    <nav class="quick-links" aria-label="Grupos de serviços">
{atalhos}
    </nav>
  </section>

{chr(10).join(secoes)}

  <section class="section">
    <div class="container container--narrow">
      <div class="alert">
        {icon('info')}
        <p><strong>Falta algum serviço?</strong> Os serviços vêm da mesma planilha do Mapa Digital. <a href="/fale-conosco">Avise a gente</a> para incluir ou corrigir.</p>
      </div>
    </div>
  </section>''')

# ---------------------------------------------------------------- Detalhe de um serviço
pagina("servicos/secretaria.html", "Secretaria do Departamento de Química",
       "Horário, localização e como solicitar documentos na Secretaria do Departamento de Química da UFPR.",
       f'''  <section class="page-hero container container--narrow">
    <p class="eyebrow"><a href="/testes/servicos/">Serviços</a> · Secretarias e coordenações</p>
    <h1>Secretaria do Departamento de Química</h1>
    <p class="lead">Atendimento a estudantes de graduação: matrícula, declarações, ajustes de disciplinas e trâmites do curso.</p>
  </section>

  <div class="container container--narrow">
    <dl class="ficha">
      <div><dt>{icon('pin')} Onde fica</dt><dd>Sala 45-C · Térreo</dd></div>
      <div><dt>{icon('clock')} Horário (exemplo)</dt><dd>Segunda a sexta, 8h às 12h e 13h30 às 17h</dd></div>
      <div><dt>{icon('mail')} E-mail (exemplo)</dt><dd>secretaria@exemplo.ufpr.br</dd></div>
      <div><dt>{icon('info')} Atendimento</dt><dd>Presencial e por e-mail</dd></div>
    </dl>

    <div class="btn-group">
      <a class="btn" href="/mapa/?local=45-C">{icon('map')} Ver a sala no mapa</a>
      <a class="btn btn--secondary" href="/fale-conosco">Corrigir informação</a>
    </div>

    <div class="prose">
      <h2>O que dá para resolver aqui</h2>
      <ul class="list-check">
        <li>{icon('check')}<span>Declaração de matrícula e de vínculo.</span></li>
        <li>{icon('check')}<span>Ajuste e cancelamento de disciplinas, dentro do calendário.</span></li>
        <li>{icon('check')}<span>Encaminhamento de requerimentos à coordenação do curso.</span></li>
        <li>{icon('check')}<span>Informações sobre horários de aulas e salas.</span></li>
      </ul>

      <h2>Como pedir um documento</h2>
    </div>
    <ol class="passos">
      <li><div><h3>Confira o que precisa</h3><p>Tenha em mãos o número de matrícula e um documento com foto.</p></div></li>
      <li><div><h3>Faça o pedido</h3><p>Pessoalmente na sala 45-C ou por e-mail, informando o nome completo e o documento desejado.</p></div></li>
      <li><div><h3>Aguarde o retorno</h3><p>O prazo é informado no atendimento (exemplo: até 3 dias úteis).</p></div></li>
    </ol>

    <div class="alert alert--warning">
      {icon('alert')}
      <p><strong>Conteúdo de exemplo.</strong> Horário, e-mail e prazos desta página são fictícios e precisam ser confirmados com a secretaria antes de publicar.</p>
    </div>
  </div>''')

# ---------------------------------------------------------------- Avisos
pagina("avisos.html", "Avisos",
       "Avisos do prédio do Departamento de Química da UFPR: interdições, mudanças de sala, manutenções e eventos.",
       f'''  <section class="page-hero container container--narrow">
    <p class="eyebrow">Avisos</p>
    <h1>Avisos do prédio</h1>
    <p class="lead">Mudanças de sala, manutenções, interdições e eventos que afetam quem circula pelo departamento.</p>
  </section>

  <div class="container container--narrow">
    <div class="stack">
      <article class="aviso aviso--alerta">
        <p class="aviso__meta"><span class="badge badge--soon">Manutenção</span><time datetime="2026-11-10">10 nov. 2026</time></p>
        <h2>Corredor do térreo com acesso parcial (exemplo)</h2>
        <p>Obra de manutenção no corredor próximo às salas 70 a 76. Use a entrada lateral. <a href="/mapa/?local=76">Ver no mapa</a>.</p>
      </article>
      <article class="aviso">
        <p class="aviso__meta"><span class="badge badge--ext">Mudança de sala</span><time datetime="2026-11-05">5 nov. 2026</time></p>
        <h2>Laboratório mudou de sala (exemplo)</h2>
        <p>Um laboratório de pesquisa passou a funcionar em outra sala. O Mapa Digital já mostra o novo endereço.</p>
      </article>
      <article class="aviso aviso--ok">
        <p class="aviso__meta"><span class="badge badge--new">Evento</span><time datetime="2026-11-20">20 nov. 2026</time></p>
        <h2>Defesa de dissertação no Auditório Principal (exemplo)</h2>
        <p>Aberta ao público. <a href="/mapa/?local=1">Como chegar ao auditório</a>.</p>
      </article>
      <article class="aviso">
        <p class="aviso__meta"><span class="badge badge--off">Encerrado</span><time datetime="2026-10-28">28 out. 2026</time></p>
        <h2>Secretaria com horário reduzido (exemplo)</h2>
        <p>Aviso mantido no histórico; o atendimento já voltou ao normal.</p>
      </article>
    </div>

    <div class="alert">
      {icon('info')}
      <p><strong>Tem um aviso para divulgar?</strong> Envie pelo <a href="/fale-conosco">formulário de contato</a> com a data e o local.</p>
    </div>
  </div>''')

# ---------------------------------------------------------------- Perguntas frequentes
FAQ = [
    ("Como encontro uma sala pelo número?",
     '<p>Abra o <a href="/mapa/">Mapa Digital</a> e digite o número na busca, por exemplo <code>45-B</code>. A sala fica marcada na planta e o painel mostra quem está nela.</p>'),
    ("Os números do mapa são os mesmos das portas?",
     "<p>Sim. O mapa usa o número físico de cada sala, o mesmo que aparece na porta.</p>"),
    ("Como mando a localização de uma sala para alguém?",
     '<p>Selecione a sala no mapa e copie o endereço da página: ele já leva a sala marcada, como <code>/mapa/?local=45-B</code>.</p>'),
    ("Onde peço uma declaração de matrícula?",
     '<p>Na <a href="/testes/servicos/secretaria">Secretaria do Departamento</a> (graduação, sala 45-C) ou na Secretaria do PPGQ (pós-graduação, sala 45-B).</p>'),
    ("Como reservo o auditório ou a sala de reuniões?",
     '<p>Os dois espaços exigem reserva prévia. Procure a secretaria responsável; os detalhes estão em <a href="/testes/servicos/">Serviços do prédio</a>.</p>'),
    ("Encontrei uma informação errada. O que faço?",
     '<p>Use o <a href="/fale-conosco">Fale conosco</a> informando o número da sala e o que mudou. A equipe atualiza a planilha e o mapa.</p>'),
    ("O DQ Digital é um site oficial da UFPR?",
     "<p>Não. É mantido por estudantes da Representação Discente do PPGQ e não é um canal oficial da universidade nem do departamento.</p>"),
]
itens = "\n".join(f'''      <details>
        <summary>{q}</summary>
        <div>{a}</div>
      </details>''' for q, a in FAQ)
pagina("perguntas-frequentes.html", "Perguntas frequentes",
       "Respostas rápidas sobre o Mapa Digital e os serviços do Departamento de Química da UFPR.",
       f'''  <section class="page-hero container container--narrow">
    <p class="eyebrow">Ajuda</p>
    <h1>Perguntas frequentes</h1>
    <p class="lead">Respostas rápidas sobre como usar o Mapa Digital e onde resolver cada assunto no departamento.</p>
  </section>

  <div class="container container--narrow">
    <div class="faq">
{itens}
    </div>
    <div class="alert">
      {icon('mail')}
      <p><strong>Não achou a resposta?</strong> <a href="/fale-conosco">Mande sua pergunta</a>.</p>
    </div>
  </div>''')

# ---------------------------------------------------------------- Primeiros passos
pagina("primeiros-passos.html", "Primeiros passos no DQ",
       "Guia para quem está chegando ao Departamento de Química da UFPR: onde ficam as secretarias, salas de aula, laboratórios e serviços.",
       f'''  <section class="page-hero container container--narrow">
    <p class="eyebrow">Para quem está chegando</p>
    <h1>Primeiros passos no DQ</h1>
    <p class="lead">Calouro, novo pós-graduando ou visitante: o essencial para se localizar no prédio na primeira semana.</p>
  </section>

  <div class="container container--narrow">
    <ol class="passos">
      <li><div><h3>Salve o Mapa Digital</h3><p>Abra o <a href="/mapa/">mapa</a> no celular e adicione à tela inicial. Ele funciona no navegador, sem instalar nada.</p></div></li>
      <li><div><h3>Encontre as secretarias</h3><p>Graduação na sala <a href="/mapa/?local=45-C">45-C</a>, pós-graduação na <a href="/mapa/?local=45-B">45-B</a> e coordenação do curso na <a href="/mapa/?local=45-A">45-A</a>.</p></div></li>
      <li><div><h3>Localize suas aulas</h3><p>Veja todas as <a href="/mapa/?destaque=sala-aula">salas de aula</a> destacadas na planta.</p></div></li>
      <li><div><h3>Conheça os laboratórios</h3><p>Os <a href="/mapa/?destaque=lab-ensino">laboratórios de ensino</a> recebem as aulas práticas; os de <a href="/mapa/?destaque=lab-pesquisa">pesquisa</a> abrigam os grupos.</p></div></li>
      <li><div><h3>Procure os estudantes</h3><p>Centro Acadêmico (<a href="/mapa/?local=44">sala 44</a>), PET Química (<a href="/mapa/?local=83">sala 83</a>) e Empresa Júnior (<a href="/mapa/?local=51">sala 51</a>).</p></div></li>
    </ol>

    <div class="info-strip">
      <div class="info-item">{icon('pin')}<div><h3>Banheiros</h3><p><a href="/mapa/?destaque=banheiro">Veja no mapa</a> os mais próximos.</p></div></div>
      <div class="info-item">{icon('building')}<div><h3>Serviços</h3><p>Todos em <a href="/testes/servicos/">Serviços do prédio</a>.</p></div></div>
      <div class="info-item">{icon('info')}<div><h3>Dúvidas</h3><p>Veja as <a href="/testes/perguntas-frequentes">perguntas frequentes</a>.</p></div></div>
    </div>
  </div>''')

# ---------------------------------------------------------------- Índice dos testes
PAGINAS = [
    ("/testes/servicos/", "building", "Serviços do prédio", "Catálogo de serviços agrupados, com a sala de cada um no mapa. Proposta para o cartão \"Serviços digitais\" da página inicial."),
    ("/testes/servicos/secretaria", "info", "Página de um serviço", "Modelo de detalhe: ficha com local e horário, o que resolver e passo a passo."),
    ("/testes/avisos", "alert", "Avisos do prédio", "Mural com manutenções, mudanças de sala e eventos."),
    ("/testes/perguntas-frequentes", "info", "Perguntas frequentes", "Respostas rápidas em blocos que abrem e fecham."),
    ("/testes/primeiros-passos", "pin", "Primeiros passos no DQ", "Guia para calouros e visitantes, ligado ao mapa."),
]
cards = "\n".join(f'''        <article class="card card--link">
          <div class="card__body">
            <span class="card__icon">{icon(ic)}</span>
            <h2 class="card__title"><a href="{h}">{t}</a></h2>
            <p class="card__text">{d}</p>
            <p class="card__footer" aria-hidden="true">Abrir {icon('arrow-right').replace(' aria-hidden="true"', '')}</p>
          </div>
        </article>''' for h, ic, t, d in PAGINAS)
pagina("index.html", "Páginas de teste",
       "Rascunhos locais de novas páginas do DQ Digital.",
       f'''  <section class="page-hero container">
    <p class="eyebrow">Testes</p>
    <h1>Páginas de teste</h1>
    <p class="lead">Rascunhos de novas páginas no padrão do DQ Digital. Ficam só neste computador: a pasta <code>testes/</code> não entra nos commits.</p>
  </section>
  <div class="container">
    <div class="grid grid--3">
{cards}
    </div>
  </div>''')
print("ok")
