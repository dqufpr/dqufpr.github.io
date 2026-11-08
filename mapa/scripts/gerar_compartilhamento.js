/* gerar_compartilhamento.js — prévias de link do Mapa Digital, uma por local.

   Uso (na raiz do repositório; rode depois de scripts/gerar_mapa.py):
       npm install --no-save playwright@1.48.2
       npx playwright install chromium
       node mapa/scripts/gerar_compartilhamento.js

   Lê
     mapa/dados/locais.json      locais (o mesmo arquivo lido por js/mapa.js)
     mapa/index.html             desenho da planta, entre <!-- PLANTA:INICIO --> e <!-- PLANTA:FIM -->
     css/global.css e mapa/css/style.css, fontes e logo (servidos por um servidor local)

   Escreve
     mapa/img/compartilhar/<id>.jpg   1200×630: a sala no centro, nítida e contornada;
                                      o resto da planta desfocado; cartão com número e nome
     mapa/l/<id>.html                 página que o botão Compartilhar envia. Tem as meta tags
                                      Open Graph com a imagem acima e leva a /mapa/?local=<id>
     mapa/img/capa.jpg                capa geral do Mapa Digital (1200×630): chamada à esquerda,
                                      planta inteira à direita; a og:image de mapa/index.html,
                                      sobre.html, legal.html e atualizacao.html passa a apontar para ela
   Arquivos de locais que saíram da planilha são apagados.
   Também roda sozinho pelo GitHub Actions (.github/workflows/compartilhamento.yml). */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..', '..');
const MAPA = path.join(RAIZ, 'mapa');
const SITE = 'https://dqufpr.github.io';
const W = 1200, H = 630;
const DIR_IMG = path.join(MAPA, 'img', 'compartilhar');
const DIR_PAG = path.join(MAPA, 'l');

const dados = JSON.parse(fs.readFileSync(path.join(MAPA, 'dados', 'locais.json'), 'utf8'));
const nomesCat = {};
dados.categorias.forEach((c) => { nomesCat[c.id] = c.nome; });
nomesCat.outros = nomesCat.outros || 'Outros';
const nomesAndar = ['Térreo', '1º andar'];
(dados.andares || []).forEach((a) => { nomesAndar[a.id] = a.nome; });
const andarDe = (l) => nomesAndar[l.andar || 0];
const indexHtml = fs.readFileSync(path.join(MAPA, 'index.html'), 'utf8');
const planta = /<!-- PLANTA:INICIO -->([\s\S]*?)<!-- PLANTA:FIM -->/.exec(indexHtml)[1];

// Mesmas regras de js/mapa.js (titulo/subtitulo)
function titulo(l) {
  if (!l.itens.length) return 'Sem informações';
  if (l.itens.every((i) => i.categoria === 'sala-prof')) return l.itens.length > 1 ? 'Sala de professores' : 'Sala de professor';
  return l.itens.filter((i) => i.categoria !== 'sala-prof')[0].nome;
}
function subtitulo(l) {
  if (l.itens.length && l.itens.every((i) => i.categoria === 'sala-prof')) return l.itens.map((i) => i.nome).join(', ');
  return l.categorias.map((c) => nomesCat[c]).join(' · ');
}
function descricao(l) {
  const partes = [andarDe(l) + ' · ' + subtitulo(l)];
  const outros = l.itens.map((i) => i.nome).filter((n) => n !== titulo(l) && partes[0].indexOf(n) === -1);
  if (outros.length) partes.push(outros.join(', '));
  partes.push('Veja onde fica na planta do Departamento de Química da UFPR.');
  return partes.join('. ').replace(/\.\./g, '.');
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Servidor estático mínimo na raiz do repositório (CSS, fontes e logo com caminhos absolutos)
const TIPOS = { '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.html': 'text/html' };
function servidor() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      const f = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}

const CARTAO = `<!DOCTYPE html>
<html lang="pt-BR" data-theme="light"><head><meta charset="utf-8">
<link rel="stylesheet" href="/css/global.css"><link rel="stylesheet" href="/mapa/css/style.css">
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: var(--planta-fundo); }
  .quadro { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
  .quadro svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  /* O resto da planta: desfocado e mais claro */
  .fundo { position: absolute; inset: 0; filter: blur(3px) saturate(0.8); opacity: 0.55; }
  /* A sala: nítida, com contorno e um halo */
  .foco .area { stroke-width: 10; filter: drop-shadow(0 0 30px rgba(11, 31, 59, 0.45)); }
  .foco .contorno { fill: none; stroke: var(--planta-selecao); stroke-width: 22; stroke-linejoin: round; }
  .cartao {
    position: absolute; left: 40px; top: 40px; bottom: 40px; width: 430px; box-sizing: border-box;
    display: flex; flex-direction: column; gap: 18px; padding: 34px 34px 30px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 24px;
    box-shadow: 0 18px 50px rgba(11, 31, 59, 0.22);
  }
  .marca { display: flex; align-items: center; gap: 12px; color: var(--brand-navy); font-weight: 700; font-size: 22px; }
  .marca img { width: 44px; height: 44px; }
  .marca small { display: block; color: var(--text-muted); font-size: 15px; font-weight: 500; letter-spacing: .04em; text-transform: uppercase; }
  .num {
    align-self: flex-start; margin-top: auto; padding: 10px 22px; border-radius: 14px;
    background: var(--loc); color: var(--loc-ink, #fff); font-size: 54px; font-weight: 900; line-height: 1;
  }
  .andar { align-self: flex-start; margin-top: -6px; padding: 5px 14px; border-radius: 999px;
    background: var(--brand-navy); color: #fff; font-size: 17px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .andar--0 { background: #e8edf3; color: var(--brand-navy); }
  .loc--lab-ensino.num, .loc--banheiro.num { --loc-ink: var(--brand-navy-deep); }
  .tit { margin: 0; color: var(--brand-navy); font-size: 38px; line-height: 1.12; font-weight: 800;
    display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }
  .tit.longo { font-size: 31px; }
  .sub { margin: 0; color: var(--text-muted); font-size: 22px; line-height: 1.3;
    display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
</style></head><body>
<div class="quadro">
  <div class="fundo">${planta}</div>
  <svg class="foco" xmlns="http://www.w3.org/2000/svg"></svg>
  <div class="cartao">
    <div class="marca"><img src="/mapa/img/logo.svg" alt=""><span>Mapa Digital<small>Química UFPR</small></span></div>
    <span class="num"></span>
    <span class="andar"></span>
    <p class="tit"></p>
    <p class="sub"></p>
  </div>
</div>
<script>
  // Monta a imagem de um local: enquadra a sala à direita do cartão e copia as áreas para a camada nítida
  window.desenha = function (l) {
    var fundo = document.querySelector('.fundo svg'), foco = document.querySelector('.foco');
    var areas = fundo.querySelectorAll('.area[data-local="' + CSS.escape(l.id) + '"]');
    if (!areas.length) return false;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    areas.forEach(function (a) { var b = a.getBBox(); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
    var prop = ${H} / ${W}, w = Math.max((x1 - x0) * 4.5, 1800), h = w * prop;
    if (h < (y1 - y0) * 2.6) { h = (y1 - y0) * 2.6; w = h / prop; }
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, fx = (40 + 430 + ${W}) / 2 / ${W}; // centro da área livre
    var vb = (cx - w * fx) + ' ' + (cy - h / 2) + ' ' + w + ' ' + h;
    fundo.setAttribute('viewBox', vb);
    fundo.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    foco.setAttribute('viewBox', vb);
    foco.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    foco.innerHTML = '';
    areas.forEach(function (a) { foco.appendChild(a.cloneNode(true)); });
    areas.forEach(function (a) { var c = a.cloneNode(false); c.setAttribute('class', 'contorno'); foco.appendChild(c); });
    fundo.querySelectorAll('.rotulo[data-local="' + CSS.escape(l.id) + '"]').forEach(function (t) {
      var c = t.cloneNode(true); c.style.fontSize = Math.max(46, Math.min((x1 - x0) * 0.3, (y1 - y0) * 0.4, 110)) + 'px'; foco.appendChild(c);
    });
    var num = document.querySelector('.num');
    num.className = 'num loc--' + l.categoria;
    num.textContent = l.id;
    var an = document.querySelector('.andar');
    an.className = 'andar andar--' + l.andar;
    an.textContent = l.andarNome;
    var tit = document.querySelector('.tit');
    tit.textContent = l.titulo;
    tit.classList.toggle('longo', l.titulo.length > 48);
    document.querySelector('.sub').textContent = l.subtitulo;
    return true;
  };
</script></body></html>`;

// Capa geral: a mesma planta e as mesmas cores do site, com a chamada e o total de locais
const CORES = ['sala-aula', 'sala-prof', 'lab-ensino', 'lab-pesquisa', 'servico', 'banheiro'];
const CAPA = `<!DOCTYPE html>
<html lang="pt-BR" data-theme="light"><head><meta charset="utf-8">
<link rel="stylesheet" href="/css/global.css"><link rel="stylesheet" href="/mapa/css/style.css">
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
  .q { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: linear-gradient(135deg, #f4f7fa 0%, #e6edf5 100%); }
  .planta-box { position: absolute; left: 440px; top: 52px; width: 740px; height: 500px; overflow: hidden;
    background: #fff; border-radius: 22px; box-shadow: 0 18px 50px rgba(11, 31, 59, 0.18); }
  .planta-box svg { width: 100%; height: 100%; }
  .c { position: absolute; left: 52px; top: 52px; width: 360px; height: 500px; display: flex; flex-direction: column; }
  .marca { display: flex; align-items: center; gap: 14px; color: var(--brand-navy); font-weight: 800; font-size: 26px; line-height: 1.1; }
  .marca img { width: 58px; height: 58px; }
  .marca small { display: block; margin-top: 4px; color: var(--text-muted); font-size: 15px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
  h1 { margin: auto 0 0; color: var(--brand-navy); font-size: 50px; line-height: 1.04; font-weight: 900; letter-spacing: -.01em; }
  .sub { margin: 18px 0 0; color: var(--text-muted); font-size: 21px; line-height: 1.35; }
  .sub b { color: var(--text); }
  .url { margin-top: auto; align-self: flex-start; padding: 10px 18px; border-radius: 999px; background: var(--brand-navy); color: #fff; font-size: 19px; font-weight: 700; }
  .faixa { position: absolute; left: 0; right: 0; bottom: 0; height: 12px; display: flex; }
  .faixa span { flex: 1; background: var(--loc); -webkit-print-color-adjust: exact; }
</style></head><body><div class="q">
  <div class="c">
    <div class="marca"><img src="/mapa/img/logo.svg" alt=""><span>Mapa Digital<small>Química UFPR</small></span></div>
    <h1>Encontre qualquer sala do DQ</h1>
    <p class="sub"><b>${dados.locais.length} locais</b> no térreo e no 1º andar: salas de aula, professores, laboratórios e serviços.</p>
    <span class="url">dqufpr.github.io/mapa</span>
  </div>
  <div class="planta-box">${planta.replace(/viewBox="[^"]*"/, 'viewBox="470 560 6480 2840"')}</div>
  <div class="faixa">${CORES.map((c) => '<span class="loc--' + c + '"></span>').join('')}</div>
</div></body></html>`;

// Troca o bloco og:image (e width/height/type/alt) das páginas do Mapa pela capa
const PAGINAS_CAPA = ['index.html', 'sobre.html', 'legal.html', 'atualizacao.html'];
function aplicaCapa(url) {
  const bloco = [
    `<meta property="og:image" content="${url}">`,
    '<meta property="og:image:type" content="image/jpeg">',
    `<meta property="og:image:width" content="${W}">`,
    `<meta property="og:image:height" content="${H}">`,
    '<meta property="og:image:alt" content="Mapa Digital: planta do Departamento de Química da UFPR, com as salas coloridas por tipo">'
  ];
  PAGINAS_CAPA.forEach((f) => {
    const arq = path.join(MAPA, f);
    if (!fs.existsSync(arq)) return;
    const t = fs.readFileSync(arq, 'utf8');
    const novo = t.replace(/( *)<meta property="og:image" content="[^"]*">\n(?: *<meta property="og:image:[a-z]+" content="[^"]*">\n)*/,
      (m, ind) => bloco.map((l) => ind + l).join('\n') + '\n');
    if (novo !== t) fs.writeFileSync(arq, novo);
  });
}

function pagina(l, img) {
  const t = 'Sala ' + l.id + ' (' + andarDe(l) + ') · ' + titulo(l);
  const d = descricao(l);
  const destino = '/mapa/?local=' + encodeURIComponent(l.id);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <!-- Gerada por mapa/scripts/gerar_compartilhamento.js: não edite à mão -->
  <title>${esc(t)} · Mapa Digital</title>
  <meta name="description" content="${esc(d)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="DQ Digital">
  <meta property="og:title" content="${esc(t)}">
  <meta property="og:description" content="${esc(d)}">
  <meta property="og:url" content="${SITE}/mapa/l/${encodeURIComponent(l.id)}">
  <meta property="og:image" content="${SITE}${img}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="${W}">
  <meta property="og:image:height" content="${H}">
  <meta property="og:image:alt" content="${esc('Planta do prédio com a sala ' + l.id + ' em destaque')}">
  <meta property="og:locale" content="pt_BR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(t)}">
  <meta name="twitter:description" content="${esc(d)}">
  <meta name="twitter:image" content="${SITE}${img}">
  <link rel="icon" href="/mapa/img/favicon.svg" type="image/svg+xml">
  <!-- Pessoas vão direto para a sala na planta; os robôs das redes sociais ficam com as meta tags acima -->
  <script>window.location.replace(${JSON.stringify(destino)} + window.location.hash);</script>
  <noscript><meta http-equiv="refresh" content="0; url=${esc(destino)}"></noscript>
</head>
<body>
<p>Abrindo a sala ${esc(l.id)} na planta… <a href="${esc(destino)}">Abrir no Mapa Digital</a></p>
</body>
</html>
`;
}

(async () => {
  fs.mkdirSync(DIR_IMG, { recursive: true });
  fs.mkdirSync(DIR_PAG, { recursive: true });
  const srv = await servidor();
  const porta = srv.address().port;
  fs.writeFileSync(path.join(MAPA, 'scripts', '.cartao.html'), CARTAO);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${porta}/mapa/scripts/.cartao.html`);
  await page.evaluate(() => document.fonts.ready);

  const feitos = new Set();
  let n = 0;
  for (const l of dados.locais) {
    const ok = await page.evaluate((x) => window.desenha(x), { id: l.id, categoria: l.categoria, andar: l.andar || 0, andarNome: andarDe(l), titulo: titulo(l), subtitulo: subtitulo(l) });
    if (!ok) { console.warn('Sem área na planta, pulado: ' + l.id); continue; }
    const arq = l.id + '.jpg';
    const buf = await page.screenshot({ type: 'jpeg', quality: 82 });
    fs.writeFileSync(path.join(DIR_IMG, arq), buf);
    // ?v= muda quando a imagem muda: as redes sociais guardam a prévia antiga em cache
    const v = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
    fs.writeFileSync(path.join(DIR_PAG, l.id + '.html'), pagina(l, '/mapa/img/compartilhar/' + arq + '?v=' + v));
    feitos.add(l.id);
    n++;
  }
  // Capa geral
  fs.writeFileSync(path.join(MAPA, 'scripts', '.capa.html'), CAPA);
  await page.goto(`http://127.0.0.1:${porta}/mapa/scripts/.capa.html`);
  await page.evaluate(() => document.fonts.ready);
  const capa = await page.screenshot({ type: 'jpeg', quality: 88 });
  fs.writeFileSync(path.join(MAPA, 'img', 'capa.jpg'), capa);
  aplicaCapa(SITE + '/mapa/img/capa.jpg?v=' + crypto.createHash('sha1').update(capa).digest('hex').slice(0, 8));

  await browser.close();
  srv.close();
  fs.unlinkSync(path.join(MAPA, 'scripts', '.cartao.html'));
  fs.unlinkSync(path.join(MAPA, 'scripts', '.capa.html'));

  // Remove o que sobrou de locais que não existem mais
  for (const [dir, ext] of [[DIR_IMG, '.jpg'], [DIR_PAG, '.html']]) {
    fs.readdirSync(dir).filter((f) => f.endsWith(ext) && !feitos.has(f.slice(0, -ext.length)))
      .forEach((f) => { fs.unlinkSync(path.join(dir, f)); console.log('Removido: ' + path.join(dir, f)); });
  }
  console.log(n + ' prévias geradas em mapa/img/compartilhar/ e mapa/l/; capa em mapa/img/capa.jpg');
})().catch((e) => { console.error(e); process.exit(1); });
