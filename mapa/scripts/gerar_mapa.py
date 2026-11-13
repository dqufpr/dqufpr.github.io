"""Gera os dados e a planta do Mapa Digital a partir da planilha de locais.

Uso (na raiz do repositório):
    pip install openpyxl
    python scripts/gerar_mapa.py

Entradas
    dados/locais.xlsx         Planilha de locais. Colunas usadas (pelo nome do cabeçalho):
                              n · ID_fisico · Nome do Local · Sigla · Descrição · Tipo de local
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
# Categorias com cor clara recebem número escuro (contraste AA)
CLARAS = {"lab-ensino", "banheiro", "outros"}

VIEWBOX = "300 470 6810 3050"  # com folga para o fundo do 1º andar e as entradas do alto

# Andares. Os locais de número 23 a 45 (com 45-A a 45-E) ficam no 1º andar; os demais, no
# térreo. Na planta, o 1º andar é a faixa de baixo, desenhada à parte.
ANDARES = [{"id": 0, "nome": "Térreo", "curto": "Térreo"}, {"id": 1, "nome": "1º andar", "curto": "1º andar"}]
PRIMEIRO_ANDAR = range(23, 46)


# Entradas do prédio (todas no térreo). x, y: meio do vão da porta no desenho;
# fora: para que lado fica a rua (o marcador fica do lado de fora, com a seta apontando para dentro).
ENTRADAS = [
    {"id": "principal", "nome": "Entrada principal", "x": 4955, "y": 2340, "fora": (0, 1),
     "descricao": "Entre a sala 4 e o Auditório Principal (sala 1), mais perto do auditório."},
    {"id": "A", "nome": "Entrada A", "x": 4824, "y": 683, "fora": (0, -1),
     "descricao": "Nos fundos, entre as salas 67 e 66."},
    {"id": "B", "nome": "Entrada B", "x": 2326, "y": 683, "fora": (0, -1),
     "descricao": "Nos fundos, entre as salas 87 e 86."},
    {"id": "C", "nome": "Entrada C", "x": 2263, "y": 1830, "fora": (-1, 0),
     "descricao": "No corredor de ligação, ao lado da sala 15, um pouco acima dela."},
]


# Rampas e escadas: retângulo (x0, y0, x1, y1) no desenho, sobre o corredor
ACESSOS = [
    {"id": "rampa-1", "tipo": "rampa", "nome": "Rampa 1", "andar": 0, "ret": (2268, 1336, 2380, 1776),
     "descricao": "Liga o corredor das salas 85 a 88 ao corredor da sala 15 e da Entrada C."},
    {"id": "rampa-2", "tipo": "rampa", "nome": "Rampa 2", "andar": 0, "ret": (4770, 1336, 4880, 1776),
     "descricao": "Liga o corredor das salas 65 a 68 ao hall da entrada principal."},
    {"id": "escada-terreo", "tipo": "escada", "nome": "Escada do térreo", "andar": 0, "ret": (4636, 2092, 4688, 2334),
     "descricao": "Sobe para o 1º andar. Fica ao lado da sala 4, perto da entrada principal."},
    {"id": "escada-1a", "tipo": "escada", "nome": "Escada 1 do 1º andar", "andar": 1, "ret": (2268, 3078, 2380, 3266),
     "descricao": "No 1º andar, entre as salas 30 e 31."},
    {"id": "escada-1b", "tipo": "escada", "nome": "Escada 2 do 1º andar", "andar": 1, "ret": (4632, 3078, 4752, 3266),
     "descricao": "No 1º andar, entre as salas 42 e 43."},
]


def gera_acessos():
    """Escadas (degraus em listras) e rampas (setas de subida e descida), clicáveis como as entradas."""
    out = ['<defs><pattern id="degraus" width="24" height="24" patternUnits="userSpaceOnUse">'
           '<rect width="24" height="24" class="escada__fundo"/><path d="M0 2H24" class="escada__degrau"/></pattern></defs>']
    for a in ACESSOS:
        x0, y0, x1, y1 = a["ret"]
        w, h = x1 - x0, y1 - y0
        t = html.escape(a["nome"]) + " · " + html.escape(a["descricao"])
        corpo = f'<rect class="acesso__ret" x="{x0}" y="{y0}" width="{w}" height="{h}" rx="10"/>'
        if a["tipo"] == "rampa":
            cx, cy = x0 + w / 2, y0 + h / 2
            corpo += (f'<path class="acesso__seta" d="M{cx - 26:g} {cy - 150:g}v300M{cx - 44:g} {cy - 128:g}l18 -22 18 22'
                      f'M{cx + 26:g} {cy + 150:g}v-300M{cx + 8:g} {cy + 128:g}l18 22 18 -22"/>')
        out.append(f'<g class="acesso acesso--{a["tipo"]}" data-entrada="{a["id"]}"><title>{t}</title>{corpo}</g>')
    return '<g class="acessos">\n' + "\n".join(out) + "\n</g>\n"


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


def le_planilha():
    ws = openpyxl.load_workbook(DADOS / "locais.xlsx", data_only=True).active
    linhas = ws.iter_rows(values_only=True)
    cab = [limpa(c) for c in next(linhas)]
    obrigatorias = ("n", "ID_fisico", "Nome do Local", "Sigla", "Descrição", "Tipo de local")
    faltando = [c for c in obrigatorias if c not in cab]
    if faltando:
        sys.exit("dados/locais.xlsx: falta a coluna " + ", ".join(faltando) + " na primeira linha (veja docs/ATUALIZAR-DADOS.md)")
    col = {nome: cab.index(nome) for nome in obrigatorias}
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


def gera_planta(locais, areas, base):
    cat = {l["id"]: l["categoria"] for l in locais}
    nomes = {l["id"]: titulo(l) for l in locais}
    poly, rot = [], []
    for a in areas:
        c = cat.get(a["local"], "outros")
        pts = " ".join(f"{x:g},{y:g}" for x, y in a["pontos"])
        e = html.escape(a["local"])
        poly.append(f'<polygon class="area loc--{c}" data-local="{e}" points="{pts}"><title>{e} · {html.escape(nomes.get(a["local"], ""))}</title></polygon>')
        tom = " rotulo--escuro" if c in CLARAS else ""
        rot.append(f'<text class="rotulo{tom}" data-local="{e}" x="{a["rotulo"][0]}" y="{a["rotulo"][1]}">{e}</text>')
    corpo = re.search(r"<g class=\"base\">.*</g>", base, re.S).group(0)
    return (
        f'<svg class="planta__svg" viewBox="{VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img" '
        f'aria-label="Planta do prédio do Departamento de Química com {len(locais)} locais numerados" data-planta-svg>\n'
        + gera_fundo_andar(areas) +
        f"{corpo}\n"
        f'<g class="areas">\n' + "\n".join(poly) + "\n</g>\n"
        f'<g class="rotulos" aria-hidden="true">\n' + "\n".join(rot) + "\n</g>\n"
        + gera_andares(areas)
        + gera_acessos()
        + gera_entradas() +
        f'<g class="selecao" aria-hidden="true" data-planta-selecao></g>\n'
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


def gera_andares(areas):
    """Nome de cada andar acima do seu bloco."""
    caixas = caixas_andares(areas)
    partes = []
    for a in ANDARES:
        if a["id"] in caixas:
            x0, y0 = caixas[a["id"]][:2]
            partes.append(f'<text class="andar__nome" x="{x0:g}" y="{y0 - 22:g}">{html.escape(a["nome"].upper())}</text>')
    return f'<g class="andares" aria-hidden="true">\n' + "\n".join(partes) + "\n</g>\n"


def gera_lista(locais):
    nomes_cat = {c[0]: c[1] for c in list(CATEGORIAS.values()) + [OUTROS]}
    out = []
    for l in locais:
        e = html.escape(l["id"])
        cats = " ".join(l["categorias"])
        itens = []
        for i in l["itens"]:
            sig = f' <span class="badge">{html.escape(i["sigla"])}</span>' if i.get("sigla") and i["sigla"] not in i["nome"] else ""
            desc = f'<p class="local__desc">{html.escape(i["descricao"])}</p>' if i.get("descricao") else ""
            itens.append(f'<li><span class="local__item">{html.escape(i["nome"])}</span>{sig}{desc}</li>')
        cat_txt = " · ".join(nomes_cat[c] for c in l["categorias"])
        piso = ANDARES[l["andar"]]["nome"]
        # Card recolhido: número, nome e tipo. O nome é o botão que abre os detalhes (js/mapa.js);
        # sem JavaScript, os detalhes ficam sempre à mostra.
        out.append(
            f'<li class="local loc--{l["categoria"]}" id="local-{e}" data-local="{e}" data-categorias="{cats}">\n'
            f'  <span class="local__num"><span class="visually-hidden">Sala </span>{e}</span>\n'
            f'  <div class="local__body">\n'
            f'    <h3 class="local__nome"><button type="button" class="local__abrir" aria-expanded="false" aria-controls="local-{e}-detalhes">{html.escape(titulo(l))}</button></h3>\n'
            f'    <p class="local__meta"><span class="local__cat">{cat_txt}</span> · <span class="local__andar">{piso}</span></p>\n'
            f'    <div class="local__detalhes" id="local-{e}-detalhes">\n'
            f'      <ul class="local__itens">{"".join(itens)}</ul>\n'
            f'      <button type="button" class="btn btn--ghost btn--sm local__ver" data-ver-local="{e}">Ver na planta</button>\n'
            f"    </div>\n"
            f"  </div>\n"
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
    entradas = [{"id": e["id"], "tipo": "entrada", "nome": e["nome"], "andar": 0, "descricao": e["descricao"]} for e in ENTRADAS]
    acessos = [{k: a[k] for k in ("id", "tipo", "nome", "andar", "descricao")} for a in ACESSOS]
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
