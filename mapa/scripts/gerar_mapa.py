"""Gera os dados e a planta do Mapa Digital a partir da planilha.

Uso (na pasta mapa/):
    pip install openpyxl
    python scripts/gerar_mapa.py

Entradas
    dados/dados-mapa.xlsx     Planilha com as abas (colunas lidas pelo nome do cabeçalho; a coluna n,
                              de numeração, é ignorada; a ordem das linhas é a ordem no mapa):
                                Salas     Sala · Tipo · Nome · Acesso ou observação
                                Pessoas   Nome · Cargo · Área ou setor · Sala · E-mail · Lattes
                                Unidades  Nome · Sigla · Tipo · Salas · Coordenação · Descrição · Site
    dados/planta-areas.json   Áreas clicáveis do desenho, cada uma ligada ao número de uma sala
    dados/planta-base.svg     Paredes, corredores e portas (sem números)

Saídas
    dados/locais.json         Salas, pessoas e unidades, ligadas entre si (lido por js/mapa.js)
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
import unicodedata

try:
    import openpyxl
except ImportError:
    sys.exit("Instale o openpyxl: pip install openpyxl")

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DADOS = RAIZ / "dados"

# Categorias do site (classe loc--* do global.css): chave antiga, nome (coluna Tipo da planilha) e plural
CATEGORIAS = {
    "salaaula": ("sala-aula", "Sala de aula", "Salas de aula"),
    "salaprof": ("sala-prof", "Sala de professores", "Salas de professores"),
    "labensino": ("lab-ensino", "Laboratório de ensino", "Laboratórios de ensino"),
    "labpesquisa": ("lab-pesquisa", "Laboratório de pesquisa", "Laboratórios de pesquisa"),
    "servico": ("servico", "Serviço", "Serviços"),
    "banheiro": ("banheiro", "Banheiro", "Banheiros"),
}
OUTROS = ("outros", "Outros", "Outros")
# Coluna Tipo das abas Salas e Unidades → categoria
TIPOS = {c[1].lower(): c[0] for c in list(CATEGORIAS.values()) + [OUTROS]}
NOMES_CAT = {c[0]: c[1] for c in list(CATEGORIAS.values()) + [OUTROS]}
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


EMAIL = re.compile(r"^[^@\s]+@ufpr\.br$", re.I)
SITE = re.compile(r"^https?://[^\s/]+\.[^\s]+$", re.I)
LATTES = re.compile(r"^https?://(www\.)?lattes\.cnpq\.br/\S+$", re.I)


def aviso(msg):
    print("aviso: " + msg)


def le_link(v, onde, padrao, tipo):
    """Site ou Lattes (o https:// é acrescentado se faltar); inválido é avisado e ignorado."""
    v = limpa(v)
    if not v:
        return None
    if not re.match(r"^https?://", v, re.I):
        v = "https://" + v
    if not padrao.match(v):
        aviso(f"{onde}: {tipo} '{v}' inválido, ignorado")
        return None
    return v


def le_email(v, onde):
    v = limpa(v)
    if not v:
        return None
    v = re.sub(r"^mailto:", "", v, flags=re.I)
    if not EMAIL.match(v):
        aviso(f"{onde}: e-mail '{v}' ignorado (só o institucional, @ufpr.br)")
        return None
    return v.lower()


def sem_acento(s):
    return unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", sem_acento(s)).strip("-") or "x"


def lista_salas(v):
    return [p.strip() for p in re.split(r"[;,]", limpa(v) or "") if p.strip()]


def le_aba(wb, nome, colunas):
    """Linhas da aba como dicionários, pela ordem; a coluna n (numeração) não é usada."""
    if nome not in wb.sheetnames:
        sys.exit(f"dados/dados-mapa.xlsx: falta a aba {nome} (veja docs/MAPA-ATUALIZAR-DADOS.md)")
    linhas = wb[nome].iter_rows(values_only=True)
    cab = [limpa(c) for c in next(linhas)]
    faltando = [c for c in colunas if c not in cab]
    if faltando:
        sys.exit(f"dados/dados-mapa.xlsx, aba {nome}: falta a coluna " + ", ".join(faltando))
    out = []
    for i, r in enumerate(linhas, start=2):
        d = {c: limpa(r[cab.index(c)]) if cab.index(c) < len(r) else None for c in colunas}
        if any(d.values()):
            d["_linha"] = i
            out.append(d)
    return out


def le_dados(areas):
    try:
        import openpyxl
    except ImportError:
        sys.exit("Instale o openpyxl: pip install openpyxl")
    wb = openpyxl.load_workbook(DADOS / "dados-mapa.xlsx", data_only=True)
    salas_l = le_aba(wb, "Salas", ["Sala", "Tipo", "Nome", "Acesso ou observação"])
    pessoas_l = le_aba(wb, "Pessoas", ["Nome", "Cargo", "Área ou setor", "Sala", "E-mail", "Lattes"])
    unidades_l = le_aba(wb, "Unidades", ["Nome", "Sigla", "Tipo", "Salas", "Coordenação", "Descrição", "Site"])
    na_planta = {a["local"] for a in areas}

    # ---- Salas ----
    salas = collections.OrderedDict()
    for r in salas_l:
        sid = r["Sala"]
        onde = f"Salas, linha {r['_linha']}"
        if not sid:
            continue
        if sid in salas:
            aviso(f"{onde}: a sala {sid} aparece mais de uma vez; vale a primeira")
            continue
        tipo = TIPOS.get((r["Tipo"] or "").lower())
        if not tipo:
            aviso(f"{onde}: tipo '{r['Tipo']}' desconhecido, usando 'Outros'")
            tipo = "outros"
        if sid not in na_planta:
            aviso(f"{onde}: a sala {sid} não existe no desenho da planta; aparece só na lista")
        salas[sid] = {"id": sid, "tipo": tipo, "nome": r["Nome"], "acesso": r["Acesso ou observação"]}
    for sid in sorted(na_planta - set(salas), key=chave_natural):
        aviso(f"a sala {sid} está desenhada na planta, mas não está na aba Salas")
        salas[sid] = {"id": sid, "tipo": "outros", "nome": None, "acesso": None}

    # ---- Pessoas ----
    pessoas, ids = [], set()
    for r in pessoas_l:
        onde = f"Pessoas, linha {r['_linha']}"
        if not r["Nome"]:
            continue
        pid = slug(r["Nome"])
        if pid in ids:
            aviso(f"{onde}: '{r['Nome']}' aparece mais de uma vez; vale a primeira")
            continue
        ids.add(pid)
        sala = r["Sala"]
        if sala and sala not in salas:
            aviso(f"{onde}: sala {sala} de '{r['Nome']}' não está na aba Salas")
            sala = None
        p = {"id": pid, "nome": r["Nome"], "cargo": r["Cargo"], "area": r["Área ou setor"], "sala": sala,
             "email": le_email(r["E-mail"], onde), "lattes": le_link(r["Lattes"], onde, LATTES, "Lattes")}
        pessoas.append({k: v for k, v in p.items() if v})
    por_nome = {sem_acento(p["nome"]): p for p in pessoas}

    # ---- Unidades ----
    unidades, ids = [], set()
    for r in unidades_l:
        onde = f"Unidades, linha {r['_linha']}"
        if not r["Nome"]:
            continue
        tipo = TIPOS.get((r["Tipo"] or "").lower())
        if tipo not in ("lab-pesquisa", "lab-ensino", "servico"):
            aviso(f"{onde}: tipo '{r['Tipo']}' de '{r['Nome']}' deve ser Laboratório de pesquisa, Laboratório de ensino ou Serviço; usando Serviço")
            tipo = "servico"
        uid = slug(r["Sigla"] or r["Nome"])
        if uid in ids:
            uid = slug(r["Nome"])
        while uid in ids:
            uid += "-2"
        ids.add(uid)
        sl = []
        for s_ in lista_salas(r["Salas"]):
            if s_ in salas:
                sl.append(s_)
            else:
                aviso(f"{onde}: sala {s_} de '{r['Nome']}' não está na aba Salas")
        if not sl:
            aviso(f"{onde}: '{r['Nome']}' não tem sala; não aparece na planta")
        coord = []
        for nome in [c.strip() for c in (r["Coordenação"] or "").split(";") if c.strip()]:
            p = por_nome.get(sem_acento(nome))
            if p:
                coord.append({"nome": p["nome"], "pessoa": p["id"]})
                p.setdefault("coordena", []).append(uid)
            else:
                aviso(f"{onde}: '{nome}' (coordenação de '{r['Nome']}') não está na aba Pessoas; aparece só o nome")
                coord.append({"nome": nome})
        u = {"id": uid, "nome": r["Nome"], "sigla": r["Sigla"], "tipo": tipo, "salas": sl, "coordenacao": coord,
             "descricao": r["Descrição"], "site": le_link(r["Site"], onde, SITE, "site")}
        unidades.append({k: v for k, v in u.items() if v})
    return salas, pessoas, unidades


def monta_locais(salas, pessoas, unidades):
    """Uma entrada por sala, com as pessoas e as unidades que estão nela."""
    locais = []
    for sid in sorted(salas, key=chave_natural):
        s_ = salas[sid]
        ps = [p for p in pessoas if p.get("sala") == sid]
        us = [u for u in unidades if sid in u.get("salas", [])]
        cats = list(dict.fromkeys([s_["tipo"]] + [u["tipo"] for u in us]))
        l = {"id": sid, "andar": andar(sid), "categoria": s_["tipo"], "categorias": cats,
             "nome": s_["nome"], "acesso": s_["acesso"],
             "pessoas": [p["id"] for p in ps], "unidades": [u["id"] for u in us]}
        l["titulo"] = titulo(l, ps, us)
        l["resumo"] = resumo(l, ps, us)
        if not ps and not us and not s_["nome"]:
            aviso(f"a sala {sid} não tem nome, pessoas nem unidades")
        locais.append({k: v for k, v in l.items() if v or k in ("andar", "pessoas", "unidades")})
    return locais


def titulo(l, ps, us):
    """Nome curto da sala: o nome próprio, a primeira unidade ou o tipo."""
    if l.get("nome"):
        return l["nome"]
    if us:
        return us[0]["nome"]
    if ps and l["categoria"] == "sala-prof":
        return "Sala de professores" if len(ps) > 1 else "Sala de professor"
    if l["categoria"] == "outros" and not ps:
        return "Sem informações"
    return NOMES_CAT[l["categoria"]]


def resumo(l, ps, us):
    """Uma linha sobre a sala, para os cartões da lista e as prévias de compartilhamento."""
    if ps and l["categoria"] == "sala-prof":
        return ", ".join(p["nome"] for p in ps)
    if len(us) > 1:
        return " · ".join(u["nome"] for u in us)
    if us:
        u = us[0]
        if u.get("descricao"):
            return u["descricao"]
        if u.get("coordenacao"):
            return "Coordenação: " + ", ".join(c["nome"] for c in u["coordenacao"])
    if ps:
        return ", ".join(p["nome"] for p in ps)
    return l.get("acesso") or ""


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
    nomes = {l["id"]: l["titulo"] for l in locais}
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


ICONE = '<svg class="icon" aria-hidden="true" focusable="false"><use href="/img/icons/sprite.svg#{}"></use></svg>'


def rotulo_link(u):
    return re.sub(r"^https?://(www\.)?|/$", "", u)


def contatos(i):
    """Links de e-mail, Lattes e site (lista "Todos os locais"); iguais aos do painel."""
    links = []
    if i.get("email"):
        e = html.escape(i["email"])
        links.append(f'<a class="contato contato--email" href="mailto:{e}">{ICONE.format("mail")}{e}</a>')
    for chave, rot in (("lattes", "Currículo Lattes"), ("site", None)):
        if i.get(chave):
            u = html.escape(i[chave])
            txt = rot or html.escape(rotulo_link(i[chave]))
            links.append(f'<a class="contato contato--{chave}" href="{u}" target="_blank" rel="noopener noreferrer">'
                         f'{ICONE.format("external")}{txt}<span class="visually-hidden"> (abre em nova aba)</span></a>')
    return f'<p class="contatos">{"".join(links)}</p>' if links else ""


def gera_lista(locais, pessoas, unidades):
    """Cards da lista "Todos os locais": número, tipo e andar, nome, resumo e ações.
    Os detalhes mostram as unidades (laboratórios, serviços) e as pessoas da sala.
    js/mapa.js pagina a lista (9 por página) e abre e fecha os detalhes; sem JavaScript,
    todos os cards e detalhes ficam à mostra."""
    por_p = {p["id"]: p for p in pessoas}
    por_u = {u["id"]: u for u in unidades}
    out = []
    for l in locais:
        e = html.escape(l["id"])
        cats = " ".join(l["categorias"])
        itens = []
        for uid in l["unidades"]:
            u = por_u[uid]
            sig = f' <span class="badge">{html.escape(u["sigla"])}</span>' if u.get("sigla") and u["sigla"] not in u["nome"] else ""
            desc = f'<p class="local__desc">{html.escape(u["descricao"])}</p>' if u.get("descricao") else ""
            coord = (f'<p class="local__desc">Coordenação: {html.escape(", ".join(c["nome"] for c in u["coordenacao"]))}</p>'
                     if u.get("coordenacao") else "")
            itens.append(f'<li><span class="local__item">{html.escape(u["nome"])}</span>{sig}{desc}{coord}{contatos(u)}</li>')
        for pid in l["pessoas"]:
            p = por_p[pid]
            sub = " · ".join(x for x in (p.get("cargo"), p.get("area")) if x)
            sub = f'<p class="local__desc">{html.escape(sub)}</p>' if sub else ""
            itens.append(f'<li><span class="local__item">{html.escape(p["nome"])}</span>{sub}{contatos(p)}</li>')
        if l.get("acesso"):
            itens.append(f'<li><p class="local__desc">{html.escape(l["acesso"])}</p></li>')
        cat_txt = " · ".join(NOMES_CAT[c] for c in l["categorias"])
        piso = ANDARES[l["andar"]]["nome"]
        resumo_ = l.get("resumo") or ("" if itens else "Ainda não há informações sobre este local.")
        resumo_html = f'  <p class="local__resumo">{html.escape(resumo_)}</p>\n' if resumo_ else ""
        tem_detalhes = bool(itens)
        detalhes = (f'  <div class="local__detalhes" id="local-{e}-detalhes"><ul class="local__itens">{"".join(itens)}</ul></div>\n'
                    if tem_detalhes else "")
        abrir = (f'<button type="button" class="local__abrir" aria-expanded="false" aria-controls="local-{e}-detalhes">Detalhes</button>'
                 if tem_detalhes else "")
        out.append(
            f'<li class="local loc--{l["categoria"]}" id="local-{e}" data-local="{e}" data-categorias="{cats}" data-andar="{l["andar"]}">\n'
            f'  <div class="local__topo"><span class="local__num"><span class="visually-hidden">Sala </span>{e}</span>'
            f'<span class="local__tags"><span class="local__cat">{cat_txt}</span><span class="local__andar">{piso}</span></span></div>\n'
            f'  <h3 class="local__nome">{html.escape(l["titulo"])}</h3>\n'
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
    areas = json.loads((DADOS / "planta-areas.json").read_text(encoding="utf-8"))
    base = (DADOS / "planta-base.svg").read_text(encoding="utf-8")
    salas, pessoas, unidades = le_dados(areas)
    locais = monta_locais(salas, pessoas, unidades)

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
    saida = {"fonte": "dados/dados-mapa.xlsx", "categorias": categorias, "andares": andares,
             "entradas": entradas, "acessos": acessos, "locais": locais, "pessoas": pessoas, "unidades": unidades}
    (DADOS / "locais.json").write_text(
        json.dumps(saida, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")

    pagina = RAIZ / "index.html"
    texto = pagina.read_text(encoding="utf-8")
    texto = substitui(texto, "DESTAQUES", gera_destaques(categorias))
    texto = substitui(texto, "PLANTA", gera_planta(locais, areas, base))
    texto = substitui(texto, "LISTA", gera_lista(locais, pessoas, unidades))
    pagina.write_text(texto, encoding="utf-8", newline="\n")

    print(f"{len(locais)} salas, {len(pessoas)} pessoas e {len(unidades)} unidades (planta com {len(areas)} áreas)")
    for c in categorias:
        print(f"  {c['plural']}: {c['locais']}")


if __name__ == "__main__":
    main()
