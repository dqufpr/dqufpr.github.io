"""Gera os dados e a planta do Mapa Digital a partir da planilha de locais.

Uso (na raiz do repositório):
    pip install openpyxl
    python scripts/gerar_mapa.py

Entradas
    dados/locais.xlsx         Planilha de locais. Colunas usadas (pelo nome do cabeçalho):
                              n · ID_fisico · Nome do Local · Sigla · Descrição · Tipo de local
                              e, opcionais, E-mail (pessoas) e Site (laboratórios)
                              (a coluna ID_digital, se existir, é ignorada)
    dados/planta-areas.json   Áreas clicáveis do desenho, cada uma ligada a um ID_fisico
    dados/planta-base.svg     Paredes, corredores e portas (sem números)

Saídas
    dados/locais.json         Locais agrupados por número físico (lido por js/mapa.js)
    index.html                Recebe o desenho da planta e a lista de locais entre os marcadores
                              <!-- DESTAQUES:… -->, <!-- PLANTA:… --> e <!-- LISTA:… -->

Depois
    As prévias de link (imagem e página de cada local, usadas pelo botão Compartilhar)
    saem de scripts/gerar_compartilhamento.js. No main, o GitHub Actions as refaz sozinho
    (.github/workflows/compartilhamento.yml); para gerar à mão, veja o cabeçalho do script.
"""
import collections
import html
import json
import pathlib
import re
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("Instale o openpyxl: pip install openpyxl")

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DADOS = RAIZ / "dados"

# Coluna "Tipo de local" da planilha → categoria do site (classe loc--* do global.css)
CATEGORIAS = {
    "salaaula": ("sala-aula", "Sala de aula", "Salas de aula"),
    "salaprof": ("sala-prof", "Sala de professores", "Salas de professores"),
    "labensino": ("lab-ensino", "Laboratório de ensino", "Laboratórios de ensino"),
    "labpesquisa": ("lab-pesquisa", "Laboratório de pesquisa", "Laboratórios de pesquisa"),
    "servico": ("servico", "Serviço", "Serviços"),
    "banheiro": ("banheiro", "Banheiro", "Banheiros"),
}
OUTROS = ("outros", "Outros", "Outros")
# Só a categoria "outros" (cinza claro) recebe número escuro; as demais, branco
CLARAS = {"outros"}

VIEWBOX = "300 470 6810 3050"  # com folga para o fundo do 1º andar e as entradas do alto

# Andares. Os locais de número 23 a 45 (com 45-A a 45-E) ficam no 1º andar; os demais, no
# térreo. Na planta, o 1º andar é a faixa de baixo, desenhada à parte.
ANDARES = [{"id": 0, "nome": "Térreo", "curto": "Térreo"}, {"id": 1, "nome": "1º andar", "curto": "1º andar"}]
PRIMEIRO_ANDAR = range(23, 46)


# Entradas do prédio (todas no térreo). x, y: meio do vão da porta no desenho;
# fora: para que lado fica a rua (o marcador fica do lado de fora, com a seta apontando para dentro).
ENTRADAS = [
    {"id": "principal", "nome": "Entrada principal", "x": 4955, "y": 2340, "fora": (0, 1),
     "descricao": "Entrada pela frente do prédio principal."},
    {"id": "A", "nome": "Entrada A", "x": 2263, "y": 1830, "fora": (-1, 0),
     "descricao": "Entrada lateral."},
    {"id": "B", "nome": "Entrada B", "x": 2326, "y": 683, "fora": (0, -1),
     "descricao": "Entrada pelos fundos."},
    {"id": "C", "nome": "Entrada C", "x": 4824, "y": 683, "fora": (0, -1),
     "descricao": "Entrada pelos fundos."},
]


# Rampas e escadas: só a área (tom próprio) com o símbolo no meio. ret = (x0, y0, x1, y1) no desenho,
# nas linhas de centro das paredes; o tom é multiplicado sobre a planta (css), então as paredes continuam à vista.
# liga: a escada do outro andar na mesma área (para a rota "Como chegar").
ACESSOS = [
    # Rampas: corredores de ligação do térreo; uma das faixas sobe e chega ao 1º andar no recorte
    # do alto da planta do 1º andar, na mesma posição. A Rampa 1 é a da direita (lado da entrada principal).
    {"id": "rampa-1", "tipo": "rampa", "nome": "Rampa 1", "andar": 0, "ret": (4762.5, 1326.3, 4884.4, 1776), "liga": "rampa-1-1"},
    {"id": "rampa-2", "tipo": "rampa", "nome": "Rampa 2", "andar": 0, "ret": (2263.5, 1326.3, 2385.6, 1776), "liga": "rampa-2-1"},
    {"id": "rampa-1-1", "tipo": "rampa", "nome": "Rampa 1", "andar": 1, "ret": (4823.5, 2787.7, 4884.4, 2838.4), "liga": "rampa-1"},
    {"id": "rampa-2-1", "tipo": "rampa", "nome": "Rampa 2", "andar": 1, "ret": (2324.8, 2787.7, 2385.6, 2838.4), "liga": "rampa-2"},
    # Escadas: a mesma escada nos dois andares (o prédio só tem térreo e 1º andar), com a mesma largura.
    # A Escada 1 é a da entrada principal.
    {"id": "escada-1", "tipo": "escada", "nome": "Escada 1", "andar": 0, "ret": (4631.2, 2087, 4762.5, 2340.1), "liga": "escada-1-1"},
    {"id": "escada-2", "tipo": "escada", "nome": "Escada 2", "andar": 0, "ret": (2263.5, 2087, 2385.6, 2340.1), "liga": "escada-2-1"},
    {"id": "escada-1-1", "tipo": "escada", "nome": "Escada 1", "andar": 1, "ret": (4631.2, 3080.8, 4762.5, 3273.2), "liga": "escada-1"},
    {"id": "escada-2-1", "tipo": "escada", "nome": "Escada 2", "andar": 1, "ret": (2263.5, 3080.8, 2385.6, 3273.2), "liga": "escada-2"},
]
for _a in ACESSOS:
    _a["descricao"] = "Liga o térreo ao 1º andar."

# Pictogramas (caixa de 100×100 centrada em 0), brancos dentro de um círculo colorido:
# escada: pessoa subindo degraus; rampa: Símbolo Internacional de Acesso sobre o plano inclinado.
SIMBOLOS = {
    "escada": (
        '<path class="pict__cheio" d="M-34 36H38V-30H22V-14H6V2H-10V18H-34Z"/>'
        '<circle class="pict__cheio" cx="-14" cy="-30" r="8"/>'
        '<path class="pict__traco" d="M-14 -19L-10 2M-10 2L-20 16M-10 2L2 -6M-13 -14L-26 -6M-13 -14L-1 -18"/>'
    ),
    "rampa": (
        '<path class="pict__cheio" d="M-40 38H40V14Z"/>'
        '<circle class="pict__cheio" cx="-4" cy="-34" r="7"/>'
        '<path class="pict__traco" d="M-6 -24V-4H12L18 12M-6 -14H8"/>'
        '<path class="pict__traco" d="M-15 -14A16 16 0 1 0 5 8"/>'
    ),
}
R_PICT = 52  # raio do círculo, em unidades do desenho


def gera_acessos(andar_):
    """Área de cada rampa e escada do andar (tom próprio, multiplicado sobre a planta) e o pictograma num círculo."""
    areas, marcas = [], []
    for a in (x for x in ACESSOS if x["andar"] == andar_):
        x0, y0, x1, y1 = a["ret"]
        w, h = x1 - x0, y1 - y0
        cx, cy = x0 + w / 2, y0 + h / 2
        t = html.escape(a["nome"]) + " · " + ANDARES[a["andar"]]["nome"]
        areas.append(
            f'<g class="acesso acesso--{a["tipo"]}" data-entrada="{a["id"]}"><title>{t}</title>'
            f'<rect class="acesso__ret" x="{x0:g}" y="{y0:g}" width="{w:g}" height="{h:g}"/></g>')
        marcas.append(
            f'<g class="acesso acesso--{a["tipo"]} acesso__marca" data-entrada="{a["id"]}"><title>{t}</title>'
            f'<circle class="acesso__circulo" cx="{cx:g}" cy="{cy:g}" r="{R_PICT}"/>'
            f'<g transform="translate({cx:g} {cy:g}) scale({R_PICT * 0.62 / 50:g})">{SIMBOLOS[a["tipo"]]}</g></g>')
    # Áreas primeiro; os círculos por cima de tudo
    return '<g class="acessos">\n' + "\n".join(areas) + "\n" + "\n".join(marcas) + "\n</g>\n"


def gera_entradas():
    """Marcador de cada entrada: círculo do lado de fora, seta para dentro e o nome ao lado."""
    out = []
    giro = {(0, -1): 0, (0, 1): 180, (-1, 0): 270, (1, 0): 90}  # a seta é desenhada apontando para baixo
    for e in ENTRADAS:
        dx, dy = e["fora"]
        principal = e["id"] == "principal"
        r = 84 if principal else 68
        cx, cy = e["x"] + dx * (r + 26), e["y"] + dy * (r + 26)
        nome = html.escape(e["nome"])
        if dx < 0:  # porta na lateral esquerda: nome à esquerda do marcador
            tx, ty, anc = cx - r - 24, cy, "end"
        else:
            tx, ty, anc = cx + r + 24, cy, "start"
        halo = f'<circle class="entrada__halo" cx="{cx}" cy="{cy}" r="{r + 26}"/>' if principal else ""
        out.append(
            f'<g class="entrada{" entrada--principal" if principal else ""}" data-entrada="{e["id"]}">'
            f'<title>{nome} · {html.escape(e["descricao"])}</title>{halo}'
            f'<circle class="entrada__circulo" cx="{cx}" cy="{cy}" r="{r}"/>'
            f'<path class="entrada__seta" transform="translate({cx} {cy}) rotate({giro[(dx, dy)]}) scale({r / 50:g})" '
            f'd="M0 -24V24M-17 7L0 24L17 7"/>'
            f'<text class="entrada__nome" x="{tx}" y="{ty}" text-anchor="{anc}">{nome.upper()}</text></g>'
        )
    return '<g class="entradas">\n' + "\n".join(out) + "\n</g>\n"


def andar(local):
    """0 (térreo) ou 1 (1º andar), pelo número da sala."""
    m = re.match(r"\d+", local)
    return 1 if m and int(m.group(0)) in PRIMEIRO_ANDAR else 0


def limpa(v):
    """Texto da célula sem espaços sobrando; vazio vira None."""
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    return s or None


def chave_natural(local):
    """Ordena 9 < 10 < 45-A < 45-B < 46."""
    m = re.match(r"(\d+)(.*)", local)
    return (int(m.group(1)), m.group(2)) if m else (10**6, local)


EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SITE = re.compile(r"^https?://[^\s/]+\.[^\s]+$", re.I)


def le_email(v, linha):
    """E-mail da coluna opcional; um valor inválido é avisado e ignorado."""
    v = limpa(v)
    if not v:
        return None
    v = re.sub(r"^mailto:", "", v, flags=re.I)
    if not EMAIL.match(v):
        print(f"aviso: linha {linha}: e-mail '{v}' inválido, ignorado")
        return None
    return v


def le_site(v, linha):
    """Endereço da coluna opcional Site (sem https://, ele é acrescentado); inválido é ignorado."""
    v = limpa(v)
    if not v:
        return None
    if not re.match(r"^https?://", v, re.I):
        v = "https://" + v
    if not SITE.match(v):
        print(f"aviso: linha {linha}: site '{v}' inválido, ignorado")
        return None
    return v


def le_planilha():
    ws = openpyxl.load_workbook(DADOS / "locais.xlsx", data_only=True).active
    linhas = ws.iter_rows(values_only=True)
    cab = [limpa(c) for c in next(linhas)]
    obrigatorias = ("n", "ID_fisico", "Nome do Local", "Sigla", "Descrição", "Tipo de local")
    faltando = [c for c in obrigatorias if c not in cab]
    if faltando:
        sys.exit("dados/locais.xlsx: falta a coluna " + ", ".join(faltando) + " na primeira linha (veja docs/ATUALIZAR-DADOS.md)")
    col = {nome: cab.index(nome) for nome in obrigatorias}
    opcionais = {"E-mail": "email", "Site": "site"}
    for nome in opcionais:
        if nome in cab:
            col[nome] = cab.index(nome)
    itens = []
    for i, r in enumerate(linhas, start=2):
        local = limpa(r[col["ID_fisico"]])
        nome = limpa(r[col["Nome do Local"]])
        if not local or not nome:
            continue
        tipo = (limpa(r[col["Tipo de local"]]) or "").lower()
        if tipo not in CATEGORIAS:
            print(f"aviso: linha {i}: tipo '{tipo}' desconhecido, usando 'outros'")
        n = r[col["n"]]
        itens.append({
            "ordem": n if isinstance(n, (int, float)) else i,
            "local": local,
            "nome": nome,
            "sigla": limpa(r[col["Sigla"]]),
            "descricao": limpa(r[col["Descrição"]]),
            "email": le_email(r[col["E-mail"]], i) if "E-mail" in col else None,
            "site": le_site(r[col["Site"]], i) if "Site" in col else None,
            "categoria": CATEGORIAS.get(tipo, OUTROS)[0],
        })
    return itens


def monta_locais(itens, areas):
    por_local = collections.defaultdict(list)
    for it in sorted(itens, key=lambda x: x["ordem"]):
        por_local[it["local"]].append({k: v for k, v in it.items() if k not in ("ordem", "local") and v})
    areas_por_local = collections.defaultdict(list)
    for a in areas:
        areas_por_local[a["local"]].append(a)

    sem_area = sorted(set(por_local) - set(areas_por_local), key=chave_natural)
    sem_dados = sorted(set(areas_por_local) - set(por_local), key=chave_natural)
    for l in sem_area:
        print(f"aviso: o local {l} está na planilha, mas não tem área na planta (dados/planta-areas.json); aparece só na lista")
    for l in sem_dados:
        print(f"aviso: a área {l} da planta não tem linhas na planilha")

    locais = []
    for local in sorted(set(por_local) | set(areas_por_local), key=chave_natural):
        its = por_local.get(local, [])
        cats = list(dict.fromkeys(i["categoria"] for i in its)) or ["outros"]
        locais.append({"id": local, "andar": andar(local), "categoria": cats[0], "categorias": cats, "itens": its})
    return locais


def titulo(local):
    """Nome curto de um local: o do primeiro item ou 'Sala de professores'."""
    its = local["itens"]
    if not its:
        return "Sem informações"
    if all(i["categoria"] == "sala-prof" for i in its):
        return "Sala de professores" if len(its) > 1 else "Sala de professor"
    # O primeiro item (ordem da coluna n) dá nome ao local; os demais aparecem na lista de itens
    return next(i["nome"] for i in its if i["categoria"] != "sala-prof")


# Corte entre os andares no desenho-base (o 1º andar está desenhado abaixo do térreo)
CORTE_Y = 2560
# Deslocamento do 1º andar até a posição real (em cima do bloco das salas 1 a 22); usado por css/style.css
DESLOCAMENTO_1 = -933.11


def dentro(px, py, pontos):
    """O ponto está dentro do polígono? (regra par-ímpar)"""
    ok = False
    for (x1, y1), (x2, y2) in zip(pontos, pontos[1:] + pontos[:1]):
        if (y1 > py) != (y2 > py) and px < x1 + (py - y1) * (x2 - x1) / (y2 - y1):
            ok = not ok
    return ok


def posicao_rotulo(a):
    """Número da sala no meio da sala: na horizontal, o centro da caixa da sala (se cair dentro
    dela; senão, a posição da planilha de áreas); na vertical, o meio da sala naquela coluna.
    Salas da mesma fileira ficam com os números alinhados."""
    pts = a["pontos"]
    xs = [p[0] for p in pts]
    ox, oy = a["rotulo"]
    cx = (min(xs) + max(xs)) / 2
    ys_caixa = [p[1] for p in pts]
    if not dentro(cx, (min(ys_caixa) + max(ys_caixa)) / 2, pts) and not dentro(cx, oy, pts):
        cx = ox
    # Cortes da reta vertical x = cx com as bordas da sala
    cortes = []
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
        if (x1 > cx) != (x2 > cx):
            cortes.append(y1 + (cx - x1) * (y2 - y1) / (x2 - x1))
    cortes.sort()
    trechos = [(cortes[i], cortes[i + 1]) for i in range(0, len(cortes) - 1, 2)]
    if not trechos:
        return round(ox), round(oy)
    # O trecho que contém a posição original; senão, o mais alto
    t = next((t for t in trechos if t[0] <= oy <= t[1]), max(trechos, key=lambda t: t[1] - t[0]))
    return round(cx), round((t[0] + t[1]) / 2)


def gera_planta(locais, areas, base):
    """Planta com um grupo por andar (.piso--0, .piso--1). Sem classe de vista, os dois andares aparecem
    como no desenho original (impressão e imagens de compartilhamento); js/mapa.js mostra um por vez."""
    cat = {l["id"]: l["categoria"] for l in locais}
    nomes = {l["id"]: titulo(l) for l in locais}
    poly, rot = {0: [], 1: []}, {0: [], 1: []}
    for a in areas:
        c = cat.get(a["local"], "outros")
        n = andar(a["local"])
        pts = " ".join(f"{x:g},{y:g}" for x, y in a["pontos"])
        e = html.escape(a["local"])
        poly[n].append(f'<polygon class="area loc--{c}" data-local="{e}" points="{pts}"><title>{e} · {html.escape(nomes.get(a["local"], ""))}</title></polygon>')
        tom = " rotulo--escuro" if c in CLARAS else ""
        rx, ry = posicao_rotulo(a)
        rot[n].append(f'<text class="rotulo{tom}" data-local="{e}" x="{rx}" y="{ry}">{e}</text>')
    corpo = re.search(r"<g class=\"base\">.*</g>", base, re.S).group(0)
    # Segunda cópia do desenho-base (1º andar): ids com sufixo, para não repetir
    corpo1 = re.sub(r'id="([^"]+)"', r'id="\1-1"', corpo)
    corpo1 = re.sub(r'href="#([^"]+)"', r'href="#\1-1"', corpo1)

    def piso(n, desenho, extra_antes=""):
        return (
            f'<g class="piso piso--{n}" data-andar="{n}">\n' + extra_antes
            + f'<g clip-path="url(#corte-{n})">{desenho}</g>\n'
            + '<g class="areas">\n' + "\n".join(poly[n]) + "\n</g>\n"
            + '<g class="rotulos" aria-hidden="true">\n' + "\n".join(rot[n]) + "\n</g>\n"
            + gera_andares(areas, n) + gera_acessos(n) + (gera_entradas() if n == 0 else "")
            + '<g class="selecao" aria-hidden="true" data-planta-selecao></g>\n</g>\n'
        )

    return (
        f'<svg class="planta__svg" viewBox="{VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img" '
        f'aria-label="Planta do prédio do Departamento de Química com {len(locais)} locais numerados" data-planta-svg>\n'
        f'<defs><clipPath id="corte-0"><rect x="0" y="0" width="8000" height="{CORTE_Y}"/></clipPath>'
        f'<clipPath id="corte-1"><rect x="0" y="{CORTE_Y}" width="8000" height="2000"/></clipPath></defs>\n'
        # Grupo que gira (js/mapa.js, botão Girar e entradas); os textos giram de volta para ficar de pé
        + '<g class="giro" data-giro>\n' + piso(0, corpo) + piso(1, corpo1, gera_fundo_andar(areas)) + '</g>\n'
        "</svg>"
    )


def caixas_andares(areas):
    """Retângulo (x0, y0, x1, y1) que contém as áreas de cada andar."""
    caixas = {}
    for a in areas:
        xs = [x for x, _ in a["pontos"]]
        ys = [y for _, y in a["pontos"]]
        c = caixas.setdefault(andar(a["local"]), [min(xs), min(ys), max(xs), max(ys)])
        c[:] = [min(c[0], min(xs)), min(c[1], min(ys)), max(c[2], max(xs)), max(c[3], max(ys))]
    return caixas


def gera_fundo_andar(areas):
    """Fundo suave atrás do 1º andar (nome incluído), na largura da planta toda; vai por baixo do desenho."""
    caixas = caixas_andares(areas)
    if 1 not in caixas:
        return ""
    folga = 200  # unidades do desenho: ~40px na tela do computador com a planta inteira
    x0 = min(c[0] for c in caixas.values()) - folga
    x1 = max(c[2] for c in caixas.values()) + folga
    y0 = caixas[1][1] - 62 - folga  # 62: altura do nome do andar, que fica dentro do fundo
    y1 = caixas[1][3] + folga
    return (f'<g class="andares-fundo" aria-hidden="true"><rect class="andar__fundo" x="{x0:g}" y="{y0:g}" '
            f'width="{x1 - x0:g}" height="{y1 - y0:g}" rx="60"/></g>\n')


def gera_andares(areas, andar_):
    """Nome do andar acima do seu bloco."""
    caixas = caixas_andares(areas)
    partes = []
    for a in ANDARES:
        if a["id"] == andar_ and a["id"] in caixas:
            x0, y0 = caixas[a["id"]][:2]
            partes.append(f'<text class="andar__nome" x="{x0:g}" y="{y0 - 22:g}">{html.escape(a["nome"].upper())}</text>')
    return f'<g class="andares" aria-hidden="true">\n' + "\n".join(partes) + "\n</g>\n"


def contatos(i):
    """Links de e-mail e site de um item (lista "Todos os locais"); iguais aos do painel."""
    links = []
    if i.get("email"):
        e = html.escape(i["email"])
        links.append(f'<a class="contato contato--email" href="mailto:{e}">'
                     f'<svg class="icon" aria-hidden="true" focusable="false"><use href="/img/icons/sprite.svg#mail"></use></svg>{e}</a>')
    if i.get("site"):
        u = html.escape(i["site"])
        rot = html.escape(re.sub(r"^https?://(www\.)?|/$", "", i["site"]))
        links.append(f'<a class="contato contato--site" href="{u}" target="_blank" rel="noopener noreferrer">'
                     f'<svg class="icon" aria-hidden="true" focusable="false"><use href="/img/icons/sprite.svg#external"></use></svg>{rot}'
                     f'<span class="visually-hidden"> (site, abre em nova aba)</span></a>')
    return f'<p class="contatos">{"".join(links)}</p>' if links else ""


def gera_lista(locais):
    """Cards da lista "Todos os locais": número, tipo e andar, nome, resumo e ações.
    js/mapa.js pagina a lista (9 por página) e abre e fecha os detalhes; sem JavaScript,
    todos os cards e detalhes ficam à mostra."""
    nomes_cat = {c[0]: c[1] for c in list(CATEGORIAS.values()) + [OUTROS]}
    out = []
    for l in locais:
        e = html.escape(l["id"])
        cats = " ".join(l["categorias"])
        its = l["itens"]
        itens = []
        for i in its:
            sig = f' <span class="badge">{html.escape(i["sigla"])}</span>' if i.get("sigla") and i["sigla"] not in i["nome"] else ""
            desc = f'<p class="local__desc">{html.escape(i["descricao"])}</p>' if i.get("descricao") else ""
            itens.append(f'<li><span class="local__item">{html.escape(i["nome"])}</span>{sig}{desc}{contatos(i)}</li>')
        cat_txt = " · ".join(nomes_cat[c] for c in l["categorias"])
        piso = ANDARES[l["andar"]]["nome"]
        profs = bool(its) and all(i["categoria"] == "sala-prof" for i in its)
        # Resumo: quem está na sala, quantos itens há ou a descrição do único item
        if profs:
            resumo = ", ".join(i["nome"] for i in its)
        elif len(its) > 1:
            resumo = f"{len(its)} itens neste local"
        else:
            resumo = its[0].get("descricao", "") if its else "Ainda não há informações sobre este local."
        resumo_html = f'  <p class="local__resumo">{html.escape(resumo)}</p>\n' if resumo else ""
        tem_detalhes = bool(its) and (len(its) > 1 or any(i.get(k) for i in its for k in ("descricao", "sigla", "email", "site")))
        detalhes = (f'  <div class="local__detalhes" id="local-{e}-detalhes"><ul class="local__itens">{"".join(itens)}</ul></div>\n'
                    if tem_detalhes else "")
        abrir = (f'<button type="button" class="local__abrir" aria-expanded="false" aria-controls="local-{e}-detalhes">Detalhes</button>'
                 if tem_detalhes else "")
        out.append(
            f'<li class="local loc--{l["categoria"]}" id="local-{e}" data-local="{e}" data-categorias="{cats}" data-andar="{l["andar"]}">\n'
            f'  <div class="local__topo"><span class="local__num"><span class="visually-hidden">Sala </span>{e}</span>'
            f'<span class="local__tags"><span class="local__cat">{cat_txt}</span><span class="local__andar">{piso}</span></span></div>\n'
            f'  <h3 class="local__nome">{html.escape(titulo(l))}</h3>\n'
            + resumo_html + detalhes +
            f'  <div class="local__acoes"><button type="button" class="btn btn--secondary btn--sm local__ver" data-ver-local="{e}">Ver na planta</button>{abrir}</div>\n'
            f"</li>"
        )
    return "\n".join(out)


def gera_destaques(categorias):
    return "\n".join(
        f'          <button type="button" class="loc-tag loc--{c["id"]}" aria-pressed="false" data-destaque="{c["id"]}">'
        f'{html.escape(c["plural"])} <span class="loc-tag__n">{c["locais"]}</span></button>'
        for c in categorias
    )


def substitui(texto, marcador, conteudo):
    padrao = re.compile(rf"(<!-- {marcador}:INICIO -->)(.*?)(<!-- {marcador}:FIM -->)", re.S)
    if not padrao.search(texto):
        sys.exit(f"index.html: marcador {marcador} não encontrado")
    return padrao.sub(lambda m: m.group(1) + "\n" + conteudo + "\n" + m.group(3), texto)


def main():
    itens = le_planilha()
    areas = json.loads((DADOS / "planta-areas.json").read_text(encoding="utf-8"))
    base = (DADOS / "planta-base.svg").read_text(encoding="utf-8")
    locais = monta_locais(itens, areas)

    # Contagem de locais por categoria (um local conta em cada categoria que tiver)
    contagem = collections.Counter(c for l in locais for c in l["categorias"])
    categorias = [
        {"id": c[0], "nome": c[1], "plural": c[2], "locais": contagem.get(c[0], 0)}
        for c in list(CATEGORIAS.values()) + [OUTROS] if contagem.get(c[0])
    ]
    andares = [{"id": a["id"], "nome": a["nome"]} for a in ANDARES]
    # fora: para que lado fica a rua (o mapa gira para a entrada ficar embaixo, como quem chega por ela)
    entradas = [{"id": e["id"], "tipo": "entrada", "nome": e["nome"], "andar": 0, "descricao": e["descricao"],
                 "fora": list(e["fora"])} for e in ENTRADAS]
    acessos = [{k: a[k] for k in ("id", "tipo", "nome", "andar", "descricao", "liga") if k in a} for a in ACESSOS]
    saida = {"fonte": "dados/locais.xlsx", "categorias": categorias, "andares": andares,
             "entradas": entradas, "acessos": acessos, "locais": locais}
    (DADOS / "locais.json").write_text(
        json.dumps(saida, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")

    pagina = RAIZ / "index.html"
    texto = pagina.read_text(encoding="utf-8")
    texto = substitui(texto, "DESTAQUES", gera_destaques(categorias))
    texto = substitui(texto, "PLANTA", gera_planta(locais, areas, base))
    texto = substitui(texto, "LISTA", gera_lista(locais))
    pagina.write_text(texto, encoding="utf-8", newline="\n")

    print(f"{len(itens)} linhas da planilha → {len(locais)} locais em {len(areas)} áreas da planta")
    for c in categorias:
        print(f"  {c['plural']}: {c['locais']}")


if __name__ == "__main__":
    main()
