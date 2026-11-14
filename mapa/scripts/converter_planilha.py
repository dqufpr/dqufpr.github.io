"""Converte a planilha antiga (dados/locais.xlsx, uma aba) para o formato novo
(dados/dados-mapa.xlsx, abas Leia-me, Salas, Pessoas, Unidades e Revisão).

Uso, na pasta mapa/:
    pip install openpyxl
    python scripts/converter_planilha.py

Rodar uma vez só, na migração. A aba Revisão lista o que o script não conseguiu decidir
sozinho (nomes escritos de outro jeito, pessoas que faltam, descrições a escrever).
Proposta e decisões: docs/MAPA-PROPOSTA-DADOS.md.
"""
import collections
import json
import pathlib
import re
import unicodedata

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "dados" / "locais.xlsx"
DESTINO = RAIZ / "dados" / "dados-mapa.xlsx"
AREAS = RAIZ / "dados" / "planta-areas.json"

TIPO_SALA = {
    "salaaula": "Sala de aula", "salaprof": "Sala de professores", "labensino": "Laboratório de ensino",
    "labpesquisa": "Laboratório de pesquisa", "servico": "Serviço", "banheiro": "Banheiro",
}
TIPOS_SALA = list(TIPO_SALA.values()) + ["Outros"]
TIPOS_UNIDADE = ["Laboratório de pesquisa", "Laboratório de ensino", "Serviço"]
CARGOS = ["Professor", "Professora", "Técnico", "Técnica"]
# Erros de digitação já conhecidos (PENDENCIAS.md)
CORRECOES = {"reverva": "reserva", "Gradução": "Graduação", "Golçalves": "Gonçalves",
             "Sintese": "Síntese", "Laboratório Química Orgânica": "Laboratório de Química Orgânica"}
NAO_PESSOA = re.compile(r"laborat|sala|secretaria|coordena|central|oficina|escaninho|banheiro|audit|grupo|"
                        r"diret|centro|empresa|pet |anexo|equipamento", re.I)


def limpa(v):
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    return s or None


def corrige(s, revisao, onde):
    if not s:
        return s
    novo = s
    for errado, certo in CORRECOES.items():
        novo = novo.replace(errado, certo)
    if novo != s:
        revisao.append((onde, s, f"Corrigido automaticamente para \"{novo}\". Confira."))
    return novo


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]", " ", s).split()


def chave_sala(s):
    return [int(p) if p.isdigit() else p for p in re.split(r"(\d+)", str(s))]


def mesmo_nome(curto, completo):
    """'Jaísa Soares' ou 'Clarice D. B. Amaral' combinam com o nome completo cadastrado?"""
    a, b = norm(curto), norm(completo)
    if not a or not b or a[0] != b[0]:
        return False
    if a[-1] not in b[1:]:
        return False
    for t in a[1:-1]:  # nomes do meio: iguais ou a inicial de algum
        if not any(u == t or (len(t) == 1 and u.startswith(t)) for u in b[1:]):
            return False
    return True


def le_origem():
    ws = openpyxl.load_workbook(ORIGEM, data_only=True).active
    cab = [limpa(c) for c in next(ws.iter_rows(values_only=True))]
    linhas = []
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        d = dict(zip(cab, r))
        if not limpa(d.get("ID_fisico")) or not limpa(d.get("Nome do Local")):
            continue
        n = d.get("n")
        linhas.append({
            "linha": i, "ordem": n if isinstance(n, (int, float)) else 10_000 + i,
            "sala": limpa(d["ID_fisico"]), "nome": limpa(d["Nome do Local"]), "sigla": limpa(d.get("Sigla")),
            "descricao": limpa(d.get("Descrição")), "tipo": (limpa(d.get("Tipo de local")) or "").lower(),
            "email": limpa(d.get("E-mail")), "site": limpa(d.get("Site")),
        })
    return sorted(linhas, key=lambda x: x["ordem"])


def converte():
    linhas = le_origem()
    revisao = []  # (onde, valor, o que fazer)
    areas = json.loads(AREAS.read_text(encoding="utf-8"))
    salas_planta = sorted({a["local"] for a in areas}, key=chave_sala)

    # ---------- Pessoas ----------
    pessoas = []
    for l in linhas:
        e_prof = l["tipo"] == "salaprof"
        e_tec = l["tipo"] == "servico" and not NAO_PESSOA.search(l["nome"]) and l["descricao"] and l["descricao"].lower().startswith("secretaria")
        if not (e_prof or e_tec):
            continue
        cargo = area = None
        if e_prof and l["descricao"] and "/" in l["descricao"]:
            cargo, area = [p.strip() for p in l["descricao"].split("/", 1)]
        elif e_tec:
            area = l["descricao"]
            revisao.append(("Pessoas · " + l["nome"], "", "Escolher o cargo (Técnico ou Técnica)."))
        if e_prof and not cargo:
            revisao.append(("Pessoas · " + l["nome"], l["descricao"] or "", "Preencher cargo e área."))
        pessoas.append({"Nome": l["nome"], "Cargo": cargo, "Área ou setor": area, "Sala": l["sala"],
                        "E-mail": l["email"], "Lattes": None})
        l["vira_pessoa"] = True
    # Áreas com grafias diferentes ("Quimica Analítica"): fica a mais usada
    grafias = collections.defaultdict(collections.Counter)
    for p in pessoas:
        if p["Área ou setor"]:
            grafias[" ".join(norm(p["Área ou setor"]))][p["Área ou setor"]] += 1
    for p in pessoas:
        if p["Área ou setor"]:
            p["Área ou setor"] = grafias[" ".join(norm(p["Área ou setor"]))].most_common(1)[0][0]
    for p in pessoas:
        if p["E-mail"] and not p["E-mail"].lower().endswith("@ufpr.br"):
            revisao.append(("Pessoas · " + p["Nome"], p["E-mail"], "Só e-mail institucional (@ufpr.br)."))

    def acha_pessoa(texto):
        exato = [p for p in pessoas if norm(p["Nome"]) == norm(texto)]
        if exato:
            return exato[0]["Nome"], None
        parecido = [p for p in pessoas if mesmo_nome(texto, p["Nome"])]
        if len(parecido) == 1:
            return parecido[0]["Nome"], f"\"{texto}\" foi ligado a \"{parecido[0]['Nome']}\". Confira."
        return texto, f"\"{texto}\" não está na aba Pessoas. Inclua a pessoa (se for professor ou técnico) ou corrija o nome."

    # ---------- Unidades (laboratórios e serviços) ----------
    unidades = collections.OrderedDict()
    for l in linhas:
        if l.get("vira_pessoa") or l["tipo"] not in ("labpesquisa", "labensino", "servico"):
            continue
        nome = corrige(l["nome"], revisao, f"Unidades · sala {l['sala']}")
        chave = " ".join(norm(nome))
        u = unidades.get(chave)
        if u and u["Sigla"] and l["sigla"] and u["Sigla"] != l["sigla"]:
            chave += " " + " ".join(norm(l["sigla"]))
            u = unidades.get(chave)
        if not u:
            u = unidades[chave] = {"Nome": nome, "Sigla": l["sigla"], "Tipo": TIPO_SALA[l["tipo"]], "Salas": [],
                                   "Coordenação": [], "Descrição": None, "Site": l["site"], "_textos": []}
        u["Sigla"] = u["Sigla"] or l["sigla"]
        u["Site"] = u["Site"] or l["site"]
        if l["sala"] not in u["Salas"]:
            u["Salas"].append(l["sala"])
        if l["descricao"]:
            u["_textos"].append(l["descricao"])
    for u in unidades.values():
        onde = f"Unidades · {u['Nome']}"
        if len(u["Salas"]) > 1:
            revisao.append((onde, "; ".join(u["Salas"]), "Linhas iguais em salas diferentes viraram uma unidade. Confira se é mesmo o mesmo laboratório."))
        for texto in dict.fromkeys(u["_textos"]):
            if u["Tipo"] == "Laboratório de ensino" and texto.lower() == "laboratório de ensino":
                continue
            partes = [p.strip() for p in re.split(r",| e ", texto) if p.strip()]
            parecem_nomes = partes and all(2 <= len(p.split()) <= 6 and not NAO_PESSOA.search(p) and p[0].isupper()
                                           and not re.search(r"acesso|exclusiv|análise|empresa|requer", p, re.I) for p in partes)
            if parecem_nomes:
                for p in partes:
                    nome, aviso = acha_pessoa(p)
                    if nome not in u["Coordenação"]:
                        u["Coordenação"].append(nome)
                    if aviso:
                        revisao.append((onde, p, aviso))
            else:
                u["Descrição"] = corrige(texto, revisao, onde)
        u["Salas"].sort(key=chave_sala)
        falta = []
        if u["Tipo"] == "Laboratório de pesquisa":
            if not u["Descrição"]:
                falta.append("descrição (o que o laboratório faz)")
            if not u["Coordenação"]:
                falta.append("coordenação")
            if not u["Site"]:
                falta.append("site, se houver")
        elif u["Tipo"] == "Laboratório de ensino" and not u["Descrição"]:
            falta.append("breve descrição")
        if falta:
            revisao.append((onde, "", "Preencher: " + "; ".join(falta) + "."))

    # ---------- Salas ----------
    por_sala = collections.defaultdict(list)
    for l in linhas:
        por_sala[l["sala"]].append(l)
    salas = []
    for s in sorted(set(por_sala) | set(salas_planta), key=chave_sala):
        its = por_sala.get(s, [])
        tipos = list(dict.fromkeys(TIPO_SALA.get(l["tipo"], "Outros") for l in its))
        nome = acesso = None
        for l in its:
            if l["tipo"] in ("salaaula", "banheiro"):
                nome = nome or l["nome"]
                if l["descricao"] and l["tipo"] == "banheiro":
                    acesso = l["descricao"]
                elif l["descricao"] and l["descricao"].lower() != (l["nome"] or "").lower():
                    acesso = acesso or l["descricao"]
        salas.append({"Sala": s, "Tipo": tipos[0] if tipos else "Outros", "Nome": nome, "Acesso ou observação": acesso})
        if len(tipos) > 1:
            revisao.append((f"Salas · {s}", " + ".join(tipos), "Sala com usos diferentes. Confira o número na porta e o tipo."))
        if s not in salas_planta:
            revisao.append((f"Salas · {s}", "", "Esta sala não existe no desenho da planta."))
        if not its:
            revisao.append((f"Salas · {s}", "", "Sala desenhada na planta, sem nada cadastrado."))

    # ordem: Pessoas pela sala; Unidades pela primeira sala
    pessoas.sort(key=lambda p: (chave_sala(p["Sala"]), norm(p["Nome"])))
    lista_unidades = sorted(unidades.values(), key=lambda u: (TIPOS_UNIDADE.index(u["Tipo"]), chave_sala(u["Salas"][0])))
    return salas, pessoas, lista_unidades, revisao


# ---------- Escrita da planilha ----------
CAB = PatternFill("solid", fgColor="1D3C69")
REV = PatternFill("solid", fgColor="FFF4D6")


def aba(wb, titulo, colunas, linhas, larguras, dica):
    ws = wb.create_sheet(titulo)
    ws.append(colunas)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = CAB
        c.alignment = Alignment(vertical="center", wrap_text=True)
    for l in linhas:
        ws.append([l.get(c) if not isinstance(l.get(c), list) else "; ".join(l.get(c)) for c in colunas])
    for i, w in enumerate(larguras, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(vertical="top", wrap_text=True)
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    ws.sheet_properties.tabColor = dica
    return ws


def lista(ws, col, valores, ate=1000):
    dv = DataValidation(type="list", formula1='"' + ",".join(valores) + '"', allow_blank=True,
                        showErrorMessage=True, errorTitle="Valor inválido", error="Escolha um valor da lista.")
    ws.add_data_validation(dv)
    dv.add(f"{col}2:{col}{ate}")


def escreve(salas, pessoas, unidades, revisao):
    wb = openpyxl.Workbook()
    leia = wb.active
    leia.title = "Leia-me"
    texto = [
        ("Dados do Mapa Digital", True),
        ("Cada aba guarda um tipo de informação. Cada sala, pessoa ou unidade aparece uma vez só.", False),
        ("", False),
        ("Salas", True),
        ("Uma linha por sala, com o número igual ao da porta. O Tipo define a cor na planta. Nome e Acesso só quando a sala tiver (salas de aula, banheiros).", False),
        ("Pessoas", True),
        ("Professores e técnicos (servidores). E-mail: só o institucional (@ufpr.br). Lattes: o endereço do currículo (lattes.cnpq.br/...). Campos vazios não aparecem no mapa.", False),
        ("Unidades", True),
        ("Laboratórios de pesquisa: nome, sigla, salas, coordenação, descrição e site.", False),
        ("Laboratórios de ensino: nome, sigla, salas e uma breve descrição.", False),
        ("Serviços: nome, salas e descrição (horário, regras de acesso).", False),
        ("Salas e Coordenação aceitam vários valores separados por ponto e vírgula. Ex.: 8; 9", False),
        ("Os nomes em Coordenação precisam ser iguais aos da aba Pessoas.", False),
        ("A ordem das linhas é a ordem em que aparecem no mapa.", False),
        ("Revisão", True),
        ("O que a conversão automática não conseguiu decidir. Resolva cada item nas outras abas e apague a linha.", False),
    ]
    for t, negrito in texto:
        leia.append([t])
        leia.cell(leia.max_row, 1).font = Font(bold=negrito, size=14 if negrito and leia.max_row == 1 else 11)
        leia.cell(leia.max_row, 1).alignment = Alignment(wrap_text=True, vertical="top")
    leia.column_dimensions["A"].width = 110

    ws = aba(wb, "Salas", ["Sala", "Tipo", "Nome", "Acesso ou observação"], salas, [10, 26, 44, 44], "4067A1")
    lista(ws, "B", TIPOS_SALA)
    ws = aba(wb, "Pessoas", ["Nome", "Cargo", "Área ou setor", "Sala", "E-mail", "Lattes"], pessoas, [36, 14, 30, 8, 32, 40], "2F7D6D")
    lista(ws, "B", CARGOS)
    for u in unidades:
        u.pop("_textos", None)
    ws = aba(wb, "Unidades", ["Nome", "Sigla", "Tipo", "Salas", "Coordenação", "Descrição", "Site"], unidades,
             [48, 16, 24, 12, 48, 60, 36], "B4532F")
    lista(ws, "C", TIPOS_UNIDADE)
    ws = aba(wb, "Revisão", ["Onde", "Valor", "O que fazer"], [{"Onde": o, "Valor": v, "O que fazer": f} for o, v, f in revisao],
             [46, 40, 90], "D89A00")
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.fill = REV
    wb.save(DESTINO)


if __name__ == "__main__":
    salas, pessoas, unidades, revisao = converte()
    escreve(salas, pessoas, unidades, revisao)
    tipos = collections.Counter(u["Tipo"] for u in unidades)
    print(f"{DESTINO.relative_to(RAIZ.parent)}: {len(salas)} salas, {len(pessoas)} pessoas, "
          f"{len(unidades)} unidades ({', '.join(f'{v} {k.lower()}' for k, v in tipos.items())}), {len(revisao)} itens para revisar")
