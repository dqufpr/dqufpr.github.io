# Páginas de teste

Rascunhos de páginas novas no padrão do DQ Digital. A pasta está em `exclude` no `_config.yml`, então **não é publicada** no site: fica só no repositório.

| Arquivo | Página |
|---|---|
| `index.html` | Índice das páginas de teste |
| `servicos/index.html` | Serviços do prédio (catálogo com a sala de cada serviço no mapa) |
| `servicos/secretaria.html` | Modelo de página de um serviço |
| `avisos.html` | Mural de avisos |
| `perguntas-frequentes.html` | Perguntas frequentes |
| `primeiros-passos.html` | Guia para calouros e visitantes |
| `css/testes.css` | Estilos só destas páginas |
| `gerar_testes.py` | Gera as páginas HTML a partir do cabeçalho e rodapé de `sobre.html` |

Horários, e-mails, prazos e textos marcados como "(exemplo)" são fictícios: confirme antes de publicar.

## Ver no computador

Na raiz do repositório:

```bash
python -m http.server 8000
```

Abra <http://localhost:8000/testes/>.

## Regenerar depois de mudar o cabeçalho ou o rodapé do site

```bash
python testes/gerar_testes.py .
```

## Publicar uma página

Mova o arquivo para o lugar definitivo (ex.: `servicos/index.html` na raiz), troque os links `/testes/...`, tire a faixa "Página de teste" e o `noindex`, e acrescente a página no `sitemap.xml` e no menu.
