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

VIEWBOX = "480 600 6460 2760"

# Andares. Os locais de número 23 a 45 (com 45-A a 45-E) ficam no 1º andar; os demais, no
# térreo. Na planta, o 1º andar é a faixa de baixo, desenhada à parte.
ANDARES = [{"id": 0, "nome": "Térreo", "curto": "Térreo"}, {"id": 1, "nome": "1º andar", "curto": "1º andar"}]
PRIMEIRO_ANDAR = range(23, 46)


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
        + gera_andares(areas) +
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
    x0 = min(c[0] for c in caixas.values()) - 40
    x1 = max(c[2] for c in caixas.values()) + 40
    y0 = caixas[1][1] - 120
    y1 = caixas[1][3] + 40
    return (f'<g class="andares-fundo" aria-hidden="true"><rect class="andar__fundo" x="{x0:g}" y="{y0:g}" '
            f'width="{x1 - x0:g}" height="{y1 - y0:g}" rx="40"/></g>\n')


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
    saida = {"fonte": "dados/locais.xlsx", "categorias": categorias, "andares": andares, "locais": locais}
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
