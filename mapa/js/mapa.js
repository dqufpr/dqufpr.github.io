/* mapa.js — planta interativa do Mapa Digital (/mapa/).
   Carregue com defer: <script src="/mapa/js/mapa.js" defer></script>

   A planta (SVG) e a lista de locais já vêm no HTML, geradas por scripts/gerar_mapa.py.
   Este script lê /mapa/dados/locais.json para o painel de detalhes e liga:
   - zoom e arraste na planta (mouse, toque e teclado pelos botões);
   - clique numa sala → contorno na planta + detalhes no painel;
   - busca e destaque por categoria (filtram a planta e a lista);
   - endereço compartilhável: ?local=45-B e ?destaque=sala-aula,servico;
   - botão Ampliar (tela cheia do navegador ou, sem ela, quadro fixo sobre a página);
   - girar a planta (botão, 90° por vez, animado); ao escolher uma entrada, o mapa gira para
     ela ficar embaixo, como quem chega por ela;
   - andar exibido (Térreo | 1º andar): o 1º andar aparece na posição real, sobre o térreo
     desfocado; troca sozinho ao escolher um local do outro andar; ?andar=1;
   - entradas, rampas e escadas: clique na planta, botões no painel, busca e ?entrada=principal
     (ou ?entrada=rampa-1, escada-terreo…);
   - compartilhar o local exibido (WhatsApp, Instagram e folha de compartilhar do sistema);
   - lista de locais recolhida (acordeão) e "Mostrar todos os locais" no painel;
   - computador (1024px+ com mouse): painel flutuando à direita da planta; enquadramentos
     descontam a faixa que ele cobre;
   - celular e tablet (até 1023px, ou tablet de toque deitado até 1399px): busca recolhida num botão e detalhes num cartão fixo
     no pé da tela (classes mapa-js, is-buscando e tem-folha). */
(function () {
  'use strict';

  var DADOS_URL = '/mapa/dados/locais.json';
  var ZOOM_PASSO = 0.7;      // fator dos botões + e −
  var ZOOM_MIN_W = 600;      // menor largura visível, em unidades do desenho
  var MOVE_CLIQUE = 6;       // px: abaixo disso, arrastar conta como clique

  var root = document.querySelector('[data-explorador]');
  if (!root) return;
  var svg = root.querySelector('[data-planta-svg]');
  var planta = root.querySelector('[data-planta]');
  var pisosEl = root.querySelector('[data-pisos]');
  var painel = root.querySelector('[data-painel-corpo]');
  var busca = root.querySelector('[data-busca]');
  var limpar = root.querySelector('[data-limpar]');
  var lista = document.querySelector('[data-lista]');
  var listaStatus = document.querySelector('[data-lista-status]');
  // Filtros da lista: cópias dos botões de destaque da planta (mesmo estado, filtram os dois)
  var listaFiltros = document.querySelector('[data-lista-filtros]');
  if (listaFiltros) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-destaque]'), function (b) { listaFiltros.appendChild(b.cloneNode(true)); });
  }
  var botoesDestaque = Array.prototype.slice.call(document.querySelectorAll('[data-destaque]'));
  var painelEl = root.querySelector('[data-painel]');
  var lupa = root.querySelector('[data-busca-abrir]');
  // Celular e tablet: mesmo layout (as mesmas condições estão em css/style.css)
  var TOQUE = '(max-width: 1023.98px), (hover: none) and (pointer: coarse) and (max-width: 1399.98px)';
  var celular = window.matchMedia(TOQUE);
  // Celular e tablet: o painel vira um cartão fixo no pé da tela (mesmo limite de css/style.css)
  var folhaMq = window.matchMedia(TOQUE);
  document.documentElement.classList.add('mapa-js');

  var dados = null;               // conteúdo de locais.json
  var porId = {};                 // id do local → objeto do local
  var porPessoa = {};             // id da pessoa → objeto da pessoa
  var porUnidade = {};            // id da unidade (laboratório, serviço) → objeto da unidade
  var pilha = [];                 // cartões abertos antes do atual, para o "Voltar"
  var nomesCat = {};              // id da categoria → nome
  var nomesAndar = ['Térreo', '1º andar']; // substituídos pelos de locais.json
  var estado = { local: null, pessoa: null, unidade: null, entrada: null, busca: '', destaques: [], todos: false, piso: 0 };
  var porEntrada = {};            // id da entrada (principal, A, B, D) → objeto de locais.json

  /* ---------- Utilidades ---------- */
  function normalize(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function esc(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"'); }
  var reduzMovimento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Zoom e arraste (pelo viewBox do SVG) ---------- */
  var vb0 = svg.viewBox.baseVal;
  // TODA: o desenho com os dois andares (impressão). INTEIRA: a vista de um andar, que é a área do
  // térreo; o 1º andar aparece por cima dele, na posição real (css/style.css, .vista-1).
  var CORTE_ANDARES = 2560; // CORTE_Y de scripts/gerar_mapa.py
  var TODA = { x: vb0.x, y: vb0.y, w: vb0.width, h: vb0.height };
  var INTEIRA = { x: TODA.x, y: TODA.y, w: TODA.w, h: CORTE_ANDARES - TODA.y };
  svg.classList.add('vista-0');
  svg.setAttribute('viewBox', INTEIRA.x + ' ' + INTEIRA.y + ' ' + INTEIRA.w + ' ' + INTEIRA.h);
  var vb = { x: INTEIRA.x, y: INTEIRA.y, w: INTEIRA.w, h: INTEIRA.h };
  var animacao = null;

  function aplica(v) {
    vb = v;
    svg.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
  }
  function escala() {
    var r = svg.getBoundingClientRect();
    return Math.min(r.width / vb.w, r.height / vb.h);
  }
  function paraDesenho(cx, cy) {
    var p = svg.createSVGPoint();
    p.x = cx; p.y = cy;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  // Zoom em torno de um ponto. suave: anima até o destino; toques seguidos (roda do mouse)
  // somam a partir do destino anterior, para o movimento continuar fluido.
  var alvoZoom = null;
  function zoomEm(f, px, py, suave) {
    var base = suave && alvoZoom ? alvoZoom : vb;
    var w = Math.min(Math.max(base.w * f, ZOOM_MIN_W), Math.max(INTEIRA.w * 1.2, vistaCheia().w * 1.1));
    f = w / base.w;
    var alvo = { x: px - (px - base.x) * f, y: py - (py - base.y) * f, w: base.w * f, h: base.h * f };
    if (!suave) { alvoZoom = null; aplica(alvo); return; }
    alvoZoom = alvo;
    animaPara(alvo, 260);
  }
  var fimAnimacao = null;
  function paraAnimacao() {
    window.cancelAnimationFrame(animacao);
    window.clearTimeout(fimAnimacao);
  }
  function animaPara(alvo, duracao) {
    paraAnimacao();
    if (alvo !== alvoZoom) alvoZoom = null;
    // Sem animação com movimento reduzido ou com a aba oculta
    if (reduzMovimento || document.hidden) { alvoZoom = null; aplica(alvo); return; }
    var ini = { x: vb.x, y: vb.y, w: vb.w, h: vb.h }, t0 = performance.now(), D = duracao || 400;
    function passo(agora) {
      var k = Math.min(1, (agora - t0) / D), e = 1 - Math.pow(1 - k, 3);
      aplica({ x: ini.x + (alvo.x - ini.x) * e, y: ini.y + (alvo.y - ini.y) * e,
        w: ini.w + (alvo.w - ini.w) * e, h: ini.h + (alvo.h - ini.h) * e });
      if (k < 1) animacao = window.requestAnimationFrame(passo);
      else if (alvo === alvoZoom) alvoZoom = null;
    }
    animacao = window.requestAnimationFrame(passo);
    // Se o navegador pausar os quadros (janela minimizada), chega ao destino mesmo assim
    fimAnimacao = window.setTimeout(function () { paraAnimacao(); aplica(alvo); }, D + 100);
  }
  // Enquadra as áreas de um local, com folga em volta
  function enquadra(id) { enquadraNos(svg.querySelectorAll('.area[data-local="' + esc(id) + '"]')); }
  function enquadraEntrada(id) { enquadraNos(svg.querySelectorAll('[data-entrada="' + esc(id) + '"]')); }
  function enquadraNos(areas) {
    var alvo = alvoEnquadre(areas);
    if (alvo) animaPara(alvo);
  }
  // Computador: a barra de busca fica por cima da planta; fração da altura que ela cobre
  function fracaoTopo() {
    var r = svg.getBoundingClientRect();
    if (folhaMq.matches || !r.height) return 0;
    var b = root.querySelector('.explorador__barra').getBoundingClientRect();
    return Math.max(0, Math.min(0.4, (b.bottom + 8 - r.top) / r.height));
  }
  // Caixa que contém os elementos, no sistema da planta
  function caixaDe(nos) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    var inv = svg.getScreenCTM().inverse();
    Array.prototype.forEach.call(nos, function (a) {
      var b = a.getBBox(), m = inv.multiply(a.getScreenCTM());
      [[b.x, b.y], [b.x + b.width, b.y + b.height]].forEach(function (c) {
        var p = svg.createSVGPoint();
        p.x = c[0]; p.y = c[1];
        p = p.matrixTransform(m);
        x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
      });
    });
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  }
  function alvoEnquadre(areas) {
    if (!areas.length) return null;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    // Caixa no sistema da planta (inclui o deslocamento do 1º andar na vista por andar)
    var inv = svg.getScreenCTM().inverse();
    Array.prototype.forEach.call(areas, function (a) {
      var b = a.getBBox(), m = inv.multiply(a.getScreenCTM());
      [[b.x, b.y], [b.x + b.width, b.y + b.height]].forEach(function (c) {
        var p = svg.createSVGPoint();
        p.x = c[0]; p.y = c[1];
        p = p.matrixTransform(m);
        x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
      });
    });
    var r = svg.getBoundingClientRect(), prop = r.height / r.width || INTEIRA.h / INTEIRA.w;
    var w = Math.max((x1 - x0) * 4, 1600), h = w * prop;
    if (h < (y1 - y0) * 2) { h = (y1 - y0) * 2; w = h / prop; }
    var f = fracaoVisivel(), fx = fracaoVisivelX(), t = fracaoTopo();
    return { x: (x0 + x1) / 2 - w * fx / 2, y: (y0 + y1) / 2 - h * (t + f) / 2, w: w, h: h };
  }

  /* ---------- Girar a planta ---------- */
  // O grupo [data-giro] gira em volta do centro do andar; números, nomes e pictogramas giram de
  // volta para continuar de pé. A vista inteira (INTEIRA) passa a ser a caixa girada.
  var giroEl = svg.querySelector('[data-giro]');
  var BASE = { x: INTEIRA.x, y: INTEIRA.y, w: INTEIRA.w, h: INTEIRA.h };
  var CX = BASE.x + BASE.w / 2, CY = BASE.y + BASE.h / 2;
  var angulo = 0, anguloAlvo = 0, animGiro = null;
  var deVolta = Array.prototype.map.call(svg.querySelectorAll('.rotulo, .andar__nome, .entrada__nome'), function (t) {
    var o = { el: t, x: +t.getAttribute('x'), y: +t.getAttribute('y') };
    // Nome da entrada: fica sempre do mesmo lado do círculo na tela (à direita ou à esquerda)
    var c = t.classList.contains('entrada__nome') && t.parentNode.querySelector('.entrada__circulo');
    if (c) {
      o.cx = +c.getAttribute('cx'); o.cy = +c.getAttribute('cy');
      o.lado = o.x >= o.cx ? 1 : -1; o.dist = Math.abs(o.x - o.cx);
    }
    // Nome do andar: fica acima do canto superior esquerdo do bloco, como ele aparece na tela
    if (t.classList.contains('andar__nome')) {
      var piso = t.closest('.piso'), xs = [], ys = [];
      Array.prototype.forEach.call(piso.querySelectorAll('.areas polygon'), function (pg) {
        pg.getAttribute('points').trim().split(/\s+/).forEach(function (par) {
          var v = par.split(',');
          xs.push(+v[0]); ys.push(+v[1]);
        });
      });
      o.bloco = xs.map(function (x, i) { return [x, ys[i]]; }); // cantos das salas do andar
      o.folga = Math.min.apply(null, ys) - o.y; // distância entre o nome e o topo do bloco
      // O 1º andar aparece deslocado (css: .vista-1 .piso--1): o centro do giro, no sistema dele, desce junto
      o.dyCentro = piso.classList.contains('piso--1') ? 933.11 : 0;
    }
    return o;
  });
  // Gira o ponto (x, y) em volta de (cx, cy)
  function giraPonto(x, y, cx, cy, graus) {
    var a = graus * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    return { x: cx + (x - cx) * c - (y - cy) * sn, y: cy + (x - cx) * sn + (y - cy) * c };
  }
  // Na tela, o nome fica acima da parede mais alta do prédio, a partir do começo dela (esquerda)
  function posicaoNomeAndar(t, r) {
    var cy = CY + t.dyCentro;
    var pts = t.bloco.map(function (p) { return giraPonto(p[0], p[1], CX, cy, r); });
    var minY = Math.min.apply(null, pts.map(function (p) { return p.y; }));
    var minX = Math.min.apply(null, pts.filter(function (p) { return p.y < minY + 2; }).map(function (p) { return p.x; }));
    return giraPonto(minX, minY - t.folga, CX, cy, -r); // de volta para o sistema do desenho
  }
  var pictos = Array.prototype.map.call(svg.querySelectorAll('.acesso__marca > g[transform]'), function (g) {
    return { el: g, base: g.getAttribute('transform') };
  });
  function aplicaGiro(a) {
    angulo = a;
    var r = Math.round(a * 100) / 100;
    if (giroEl) giroEl.setAttribute('transform', r ? 'rotate(' + r + ' ' + CX + ' ' + CY + ')' : '');
    var rad = -r * Math.PI / 180;
    deVolta.forEach(function (t) {
      var x = t.x, y = t.y;
      if (t.cx !== undefined) {
        x = Math.round((t.cx + t.lado * t.dist * Math.cos(rad)) * 10) / 10;
        y = Math.round((t.cy + t.lado * t.dist * Math.sin(rad)) * 10) / 10;
        t.el.setAttribute('x', x);
        t.el.setAttribute('y', y);
      } else if (t.bloco) {
        var pa = r ? posicaoNomeAndar(t, r) : { x: t.x, y: t.y };
        x = Math.round(pa.x * 10) / 10; y = Math.round(pa.y * 10) / 10;
        t.el.setAttribute('x', x);
        t.el.setAttribute('y', y);
      }
      t.el.setAttribute('transform', r ? 'rotate(' + -r + ' ' + x + ' ' + y + ')' : '');
    });
    pictos.forEach(function (p) { p.el.setAttribute('transform', r ? p.base.replace(/(translate\([^)]*\))/, '$1 rotate(' + -r + ')') : p.base); });
  }
  function caixaNoAngulo(a) {
    var deitado = Math.abs(((a % 180) + 180) % 180 - 90) < 1; // 90° ou 270°
    return deitado ? { x: CX - BASE.h / 2, y: CY - BASE.w / 2, w: BASE.h, h: BASE.w } : BASE;
  }
  // Gira até o ângulo (múltiplo de 90°), pelo caminho mais curto, animando junto a vista
  // até alvoVista(), calculado já no ângulo final.
  function giraPara(alvo, alvoVista) {
    var delta = ((alvo - angulo) % 360 + 540) % 360 - 180;
    if (delta === -180 && alvo > angulo) delta = 180;
    anguloAlvo = angulo + delta;
    INTEIRA = caixaNoAngulo(anguloAlvo);
    var ini = angulo;
    aplicaGiro(anguloAlvo);
    var vista = alvoVista ? alvoVista() : null;
    aplicaGiro(ini);
    window.cancelAnimationFrame(animGiro);
    if (vista) animaPara(vista, 650);
    if (reduzMovimento || document.hidden || !delta) { aplicaGiro(anguloAlvo); return; }
    var t0 = performance.now(), D = 650;
    function passo(agora) {
      var k = Math.min(1, (agora - t0) / D), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      aplicaGiro(ini + delta * e);
      if (k < 1) animGiro = window.requestAnimationFrame(passo);
    }
    animGiro = window.requestAnimationFrame(passo);
  }
  root.querySelector('[data-girar]').addEventListener('click', function () {
    mexeu = true;
    giraPara(anguloAlvo + 90, function () { return estado.local ? alvoEnquadre(svg.querySelectorAll('.area[data-local="' + esc(estado.local) + '"]')) : vistaCheia(); });
  });
  // Zoom padrão (abertura e entradas), igual em todos os tamanhos: a escala do celular
  // (1550 unidades em 390px de largura livre). Telas maiores mostram mais da planta em
  // volta, até a altura do prédio. No computador, a largura livre desconta o painel.
  function tamanhoPadrao(r) {
    var livre = limiteDireito() - r.left;
    var s = livre / (1550 * Math.max(1, livre / 390)); // pixels por unidade da planta
    var h = r.height / s;
    if (h < 2450) h = 2450;
    if (h > 3050) h = 3050;
    return { w: h * r.width / r.height, h: h, livre: livre };
  }
  // Vista com o ponto (cx, cy) no meio da parte livre da planta e a uma fração fy da altura
  function vistaEm(cx, cy, fy) {
    var r = svg.getBoundingClientRect(), t = tamanhoPadrao(r);
    var meio = (t.livre / 2) * t.w / r.width; // da borda esquerda ao meio da parte livre
    var topo = fracaoTopo(); // no computador, abaixo da barra de busca
    return { x: cx - meio, y: cy - t.h * (topo + fy * (1 - topo)), w: t.w, h: t.h };
  }
  // Abertura: o trecho da entrada principal, da Entrada C até a principal
  function vistaPadrao() { return vistaEm(5000, 1640, 0.5); }
  // Entrada no mesmo zoom da abertura; ela fica no meio, embaixo, logo acima da barra das
  // entradas e do cartão do pé da tela (calculada já no ângulo final do giro)
  function vistaEntrada(id) {
    var g = svg.querySelector('.entrada[data-entrada="' + esc(id) + '"] .entrada__circulo');
    if (!g) return null;
    var b = g.getBoundingClientRect();
    var c = paraDesenho(b.left + b.width / 2, b.top + b.height / 2);
    return vistaEm(c.x, c.y, Math.max(0.35, fracaoVisivel() - 0.18));
  }
  // Entrada: o mapa gira para a entrada ficar embaixo, com a rua atrás de quem chega
  function anguloDaEntrada(e) {
    if (!e.fora) return anguloAlvo;
    return 90 - Math.atan2(e.fora[1], e.fora[0]) * 180 / Math.PI;
  }
  // O mapa e os elementos se alinham pela área inteira da planta, sem descontar o painel
  function limiteDireito() { return svg.getBoundingClientRect().right; }
  // Computador: onde começa, na tela, o painel que flutua sobre a direita da planta
  // (só para empurrar uma sala tocada que ficou embaixo dele)
  function bordaDoPainel() {
    var r = svg.getBoundingClientRect();
    if (folhaMq.matches || !painelEl.offsetParent) return r.right;
    return Math.max(r.left + 120, Math.min(r.right, painelEl.getBoundingClientRect().left - 12));
  }
  function fracaoVisivelX() {
    var r = svg.getBoundingClientRect();
    return r.width ? (limiteDireito() - r.left) / r.width : 1;
  }
  // A planta inteira, centralizada no quadro (o viewBox cobre o quadro todo)
  function vistaCheia() {
    var r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return INTEIRA;
    // Folga igual dos dois lados (botões de zoom à esquerda) e, no alto, o seletor de andar
    var esq = celular.matches ? 52 : 60, vw = r.width - 2 * esq; // a barra de ferramentas fica à esquerda
    // Livre no alto: abaixo do seletor de andar (e, no computador, da barra de busca)
    var topo = Math.max(56, pisosEl.getBoundingClientRect().bottom - r.top + 8), vh = r.height - topo;
    var s = Math.min(vw / INTEIRA.w, vh / INTEIRA.h);
    var w = r.width / s, h = r.height / s;
    return { x: INTEIRA.x - esq / s - (vw / s - INTEIRA.w) / 2, y: INTEIRA.y - topo / s - (vh / s - INTEIRA.h) / 2, w: w, h: h };
  }
  // Onde termina, na tela, a parte da planta que o cartão fixo não cobre
  function limiteVisivel() {
    var r = svg.getBoundingClientRect();
    if (!folhaMq.matches || !root.classList.contains('tem-folha')) return r.bottom;
    return Math.max(r.top + 80, Math.min(r.bottom, window.innerHeight - painelEl.offsetHeight));
  }
  function fracaoVisivel() {
    var r = svg.getBoundingClientRect();
    return r.height ? (limiteVisivel() - r.top) / r.height : 1;
  }
  // Toque numa sala: se ela ficou embaixo do cartão (celular) ou do painel (telas maiores),
  // desliza a planta sem mudar o zoom
  function garanteVisivel(id) {
    var areas = svg.querySelectorAll('.area[data-local="' + esc(id) + '"]');
    if (!areas.length) return;
    var r = svg.getBoundingClientRect(), base = areas[0].getBoundingClientRect();
    var x0 = base.left, y0 = base.top, x1 = base.right, y1 = base.bottom;
    Array.prototype.forEach.call(areas, function (a) {
      var b = a.getBoundingClientRect();
      x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom);
    });
    var lim = limiteVisivel(), limX = bordaDoPainel(), folga = 16, dx = 0, dy = 0;
    if (y1 > lim - folga || y0 < r.top + folga) dy = (y0 + y1) / 2 - (r.top + lim) / 2;
    if (x1 > limX - folga || x0 < r.left + folga) dx = (x0 + x1) / 2 - (r.left + limX) / 2;
    if (!dx && !dy) return;
    var s = escala();
    animaPara({ x: vb.x + dx / s, y: vb.y + dy / s, w: vb.w, h: vb.h });
  }

  function ampliado() {
    return root.classList.contains('is-expanded') ||
      (document.fullscreenElement || document.webkitFullscreenElement) === root;
  }

  // Roda do mouse: no quadro normal só com Ctrl (a página continua rolando); ampliado, sempre
  svg.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey && !ampliado()) return;
    e.preventDefault();
    var p = paraDesenho(e.clientX, e.clientY);
    zoomEm(Math.exp(e.deltaY * 0.0015), p.x, p.y, true);
  }, { passive: false });

  // Zoom só na planta: o Safari do iPhone ignora user-scalable=no; aqui a pinça fora da
  // planta não amplia a página (na planta, a pinça é a do mapa; o toque duplo para ampliar
  // já está desligado pelo touch-action em css/style.css)
  document.addEventListener('gesturestart', function (e) { if (!svg.contains(e.target)) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1 && !svg.contains(e.target)) e.preventDefault();
  }, { passive: false });

  var ponteiros = new Map(), movido = 0, alvoInicial = null, pinca = null;
  svg.addEventListener('pointerdown', function (e) {
    paraAnimacao(); // mexer na planta interrompe um zoom ou enquadramento em andamento
    alvoZoom = null;
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.size === 1) { movido = 0; alvoInicial = e.target; }
    if (ponteiros.size === 2) {
      var v = Array.from(ponteiros.values());
      pinca = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
    }
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ponteiro já solto */ }
    svg.classList.add('is-arrastando');
  });
  svg.addEventListener('pointermove', function (e) {
    if (!ponteiros.has(e.pointerId)) return;
    var ant = ponteiros.get(e.pointerId), atual = { x: e.clientX, y: e.clientY };
    ponteiros.set(e.pointerId, atual);
    paraAnimacao();
    if (ponteiros.size === 1) {
      var dx = atual.x - ant.x, dy = atual.y - ant.y, s = escala();
      movido += Math.abs(dx) + Math.abs(dy);
      aplica({ x: vb.x - dx / s, y: vb.y - dy / s, w: vb.w, h: vb.h });
    } else if (ponteiros.size === 2) {
      var v = Array.from(ponteiros.values()), d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
      var m = paraDesenho((v[0].x + v[1].x) / 2, (v[0].y + v[1].y) / 2);
      if (pinca) zoomEm(pinca / d, m.x, m.y);
      pinca = d; movido = 99;
    }
  });
  function solta(e) {
    if (!ponteiros.has(e.pointerId)) return;
    ponteiros.delete(e.pointerId);
    if (ponteiros.size < 2) pinca = null;
    if (ponteiros.size === 0) {
      svg.classList.remove('is-arrastando');
      if (e.type === 'pointerup' && movido < MOVE_CLIQUE && alvoInicial) {
        var ent = alvoInicial.closest && alvoInicial.closest('[data-entrada]');
        var area = alvoInicial.closest && alvoInicial.closest('.area');
        if (ent || area) pilha = [];
        if (ent) selecionaEntrada(ent.getAttribute('data-entrada'), false);
        else if (area) seleciona(area.getAttribute('data-local'), false);
      }
      alvoInicial = null;
    }
  }
  svg.addEventListener('pointerup', solta);
  svg.addEventListener('pointercancel', solta);

  root.querySelector('[data-zoom-mais]').addEventListener('click', function () { var b = alvoZoom || vb; zoomEm(ZOOM_PASSO, b.x + b.w / 2, b.y + b.h / 2, true); });
  root.querySelector('[data-zoom-menos]').addEventListener('click', function () { var b = alvoZoom || vb; zoomEm(1 / ZOOM_PASSO, b.x + b.w / 2, b.y + b.h / 2, true); });
  root.querySelector('[data-zoom-inteira]').addEventListener('click', function () { animaPara(vistaCheia()); });

  /* ---------- Filtro: busca + destaques ---------- */
  // Texto da própria sala (número, nome, tipo, andar) e, para destacar na planta, também o
  // das pessoas e unidades que estão nela
  function textoSala(l) {
    return normalize([l.id, l.titulo, l.nome, l.acesso, (l.categorias || []).map(function (c) { return nomesCat[c]; }).join(' '),
      // Andar sem algarismos, para "1" continuar achando só as salas com 1 no número
      l.andar ? 'primeiro andar piso superior' : 'terreo'].join(' '));
  }
  function textoPessoa(p) { return normalize([p.nome, p.cargo, p.area].join(' ')); }
  function textoUnidade(u) {
    return normalize([u.nome, u.sigla, nomesCat[u.tipo], u.descricao,
      (u.coordenacao || []).map(function (c) { return c.nome; }).join(' ')].join(' '));
  }
  function textoBusca(l) {
    var partes = [l._sala];
    l.pessoas.forEach(function (id) { partes.push(porPessoa[id]._busca); });
    l.unidades.forEach(function (id) { partes.push(porUnidade[id]._busca); });
    return partes.join(' ');
  }
  function casaNumero(l, q) { return normalize(l.id) === q || normalize(l.id).indexOf(q) === 0; }
  function combina(l) {
    var q = normalize(estado.busca.trim());
    if (estado.destaques.length && !l.categorias.some(function (c) { return estado.destaques.indexOf(c) !== -1; })) return false;
    if (!q) return true;
    if (casaNumero(l, q)) return true;
    return l._busca.indexOf(q) !== -1;
  }
  // Resultados agrupados: pessoas, unidades e salas (estas, pelo texto da própria sala)
  function pessoasDaBusca() {
    var q = normalize(estado.busca.trim());
    if (!q) return [];
    return dados.pessoas.filter(function (p) {
      var l = porId[p.sala];
      if (estado.destaques.length && !(l && l.categorias.some(function (c) { return estado.destaques.indexOf(c) !== -1; }))) return false;
      return p._busca.indexOf(q) !== -1;
    });
  }
  function unidadesDaBusca() {
    var q = normalize(estado.busca.trim());
    if (!q) return [];
    return dados.unidades.filter(function (u) {
      if (estado.destaques.length && estado.destaques.indexOf(u.tipo) === -1) return false;
      return u._busca.indexOf(q) !== -1;
    });
  }
  function salasDaBusca() {
    var q = normalize(estado.busca.trim());
    return dados.locais.filter(function (l) {
      if (!combina(l)) return false;
      return !q || casaNumero(l, q) || l._sala.indexOf(q) !== -1;
    });
  }
  function filtroAtivo() { return !!(estado.busca.trim() || estado.destaques.length); }

  function resultados() {
    return dados.locais.filter(combina);
  }

  function aplicaFiltro() {
    var ativo = filtroAtivo();
    var ok = {}, porPiso = [0, 0];
    if (ativo) resultados().forEach(function (l) { ok[l.id] = true; porPiso[l.andar ? 1 : 0]++; });
    // Quantos resultados há em cada andar, no seletor
    Array.prototype.forEach.call(pisosEl.querySelectorAll('[data-piso]'), function (b) {
      b.querySelector('[data-piso-n]').textContent = ativo ? String(porPiso[+b.getAttribute('data-piso')]) : '';
    });
    // Busca digitada sem nada no andar exibido: mostra o outro
    if (ativo && estado.busca.trim() && !estado.local && !estado.entrada &&
        !porPiso[estado.piso] && porPiso[1 - estado.piso]) mudaPiso(1 - estado.piso);
    svg.classList.toggle('is-filtrando', ativo);
    Array.prototype.forEach.call(svg.querySelectorAll('.area, .rotulo'), function (a) {
      a.classList.toggle('is-match', !!ok[a.getAttribute('data-local')]);
    });
    // Lista completa abaixo da planta
    var visiveis = 0;
    Array.prototype.forEach.call(lista.children, function (li) {
      var mostra = !ativo || !!ok[li.getAttribute('data-local')];
      li.hidden = !mostra;
      if (mostra) visiveis++;
    });
    atualizaPaginas();
    listaStatus.textContent = ativo
      ? (visiveis ? visiveis + (visiveis === 1 ? ' local' : ' locais') + ' de ' + dados.locais.length + '.' : 'Nenhum local encontrado.')
      : '';
    botoesDestaque.forEach(function (b) {
      b.setAttribute('aria-pressed', estado.destaques.indexOf(b.getAttribute('data-destaque')) !== -1 ? 'true' : 'false');
    });
    limpar.hidden = !estado.destaques.length;
  }

  /* ---------- Seleção ---------- */
  // Qualquer seleção (ou a falta dela) tira a marca da entrada; selecionaEntrada a põe de volta
  // Contorno das salas escolhidas (uma sala, ou todas as de um laboratório)
  function areasDe(ids) {
    var out = [];
    ids.forEach(function (id) {
      Array.prototype.push.apply(out, svg.querySelectorAll('.area[data-local="' + esc(id) + '"]'));
    });
    return out;
  }
  function desenhaSelecao(id) {
    Array.prototype.forEach.call(svg.querySelectorAll('[data-planta-selecao]'), function (g) { g.textContent = ''; });
    estado.entrada = null;
    estado.pessoa = null;
    estado.unidade = null;
    marcaEntrada(null);
    if (!id) return;
    areasDe([].concat(id)).forEach(function (a) {
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      p.setAttribute('points', a.getAttribute('points'));
      a.closest('.piso').querySelector('[data-planta-selecao]').appendChild(p); // no mesmo andar da área
    });
  }

  /* ---------- Andar exibido ---------- */
  function mudaPiso(n) {
    n = n ? 1 : 0;
    estado.piso = n;
    svg.classList.toggle('vista-0', n === 0);
    svg.classList.toggle('vista-1', n === 1);
    Array.prototype.forEach.call(pisosEl.querySelectorAll('[data-piso]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-piso') === String(n) ? 'true' : 'false');
    });
  }
  pisosEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-piso]');
    if (!b) return;
    mudaPiso(+b.getAttribute('data-piso'));
    atualizaEndereco();
    if (dados && !estado.local && !estado.entrada && !filtroAtivo()) render(); // lista do andar no painel
  });
  pisosEl.hidden = false;

  // Pessoa: a sala dela fica marcada na planta
  function selecionaPessoa(id) {
    var p = porPessoa[id];
    if (!p) return;
    estado.local = null;
    if (p.sala) { mudaPiso(porId[p.sala].andar); desenhaSelecao(p.sala); } else desenhaSelecao(null);
    estado.pessoa = id;
    atualizaEndereco();
    render();
    if (p.sala) enquadra(p.sala);
  }
  // Unidade (laboratório, serviço): todas as salas dela ficam marcadas
  function salasNoAndar(u) {
    var andar = porId[u.salas[0]].andar;
    return u.salas.filter(function (s) { return porId[s].andar === andar; });
  }
  function selecionaUnidade(id) {
    var u = porUnidade[id];
    if (!u) return;
    estado.local = null;
    if (u.salas && u.salas.length) { mudaPiso(porId[u.salas[0]].andar); desenhaSelecao(u.salas); } else desenhaSelecao(null);
    estado.unidade = id;
    atualizaEndereco();
    render();
    if (u.salas && u.salas.length) enquadraNos(areasDe(salasNoAndar(u)));
  }
  // Abrir outro cartão a partir de um cartão: guarda o atual para o "Voltar"
  function empilha() {
    if (estado.local) pilha.push(['local', estado.local]);
    else if (estado.pessoa) pilha.push(['pessoa', estado.pessoa]);
    else if (estado.unidade) pilha.push(['unidade', estado.unidade]);
    else pilha = [];
  }
  function volta() {
    var a = pilha.pop();
    if (!a) { desseleciona(); return; }
    if (a[0] === 'local') seleciona(a[1], true);
    else if (a[0] === 'pessoa') selecionaPessoa(a[1]);
    else selecionaUnidade(a[1]);
  }
  function seleciona(id, enquadrar) {
    if (!porId[id]) return;
    mudaPiso(porId[id].andar);
    estado.local = id;
    desenhaSelecao(id);
    atualizaEndereco();
    render(); // antes de enquadrar: no celular, o cartão já ocupa o pé da tela
    if (enquadrar) enquadra(id); else garanteVisivel(id);
  }
  // Ao abrir o mapa: ondas saindo da seta da entrada principal, por alguns segundos, para
  // mostrar por onde se chega (não repete; sem animação para quem pediu menos movimento)
  function chamaEntradaPrincipal() {
    if (reduzMovimento) return;
    var g = svg.querySelector('.entrada[data-entrada="principal"]');
    var c = g && g.querySelector('.entrada__circulo');
    if (!c) return;
    var ns = 'http://www.w3.org/2000/svg', ondas = [];
    for (var i = 1; i <= 3; i++) {
      var o = document.createElementNS(ns, 'circle');
      o.setAttribute('class', 'entrada__onda entrada__onda--' + i);
      ['cx', 'cy', 'r'].forEach(function (k) { o.setAttribute(k, c.getAttribute(k)); });
      g.insertBefore(o, g.firstChild.nextSibling); // atrás do círculo (depois do <title>)
      ondas.push(o);
    }
    ondas[2].addEventListener('animationend', function () {
      ondas.forEach(function (o) { if (o.parentNode) o.parentNode.removeChild(o); });
    });
  }
  function marcaEntrada(id) {
    Array.prototype.forEach.call(svg.querySelectorAll('[data-entrada]'), function (g) {
      g.classList.toggle('is-sel', g.getAttribute('data-entrada') === id);
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-entradas-rapidas] [data-ir-entrada]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-ir-entrada') === id ? 'true' : 'false');
    });
  }
  // Celular e tablet: botões das entradas sobre a planta (no computador, ficam no painel)
  function montaEntradasRapidas() {
    var box = root.querySelector('[data-entradas-rapidas]');
    if (!box || !dados.entradas || !dados.entradas.length) return;
    box.textContent = '';
    box.appendChild(el('span', 'planta__entradas-rot', 'Entrada'));
    dados.entradas.forEach(function (e) {
      var b = el('button', 'painel__ponto painel__ponto--entrada', e.id === 'principal' ? 'Principal' : e.id);
      b.type = 'button';
      b.setAttribute('data-ir-entrada', e.id);
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', e.nome);
      b.title = e.nome;
      box.appendChild(b);
    });
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-ir-entrada]');
      if (!b) return;
      if (b.getAttribute('aria-pressed') === 'true') desseleciona(); // tocar de novo desmarca
      else selecionaEntrada(b.getAttribute('data-ir-entrada'), true);
    });
    box.hidden = false;
  }
  function selecionaEntrada(id, enquadrar) {
    if (!porEntrada[id]) return;
    mudaPiso(porEntrada[id].andar);
    estado.local = null;
    desenhaSelecao(null);
    estado.entrada = id;
    marcaEntrada(id);
    atualizaEndereco();
    render();
    var e = porEntrada[id];
    if (e.tipo === 'entrada') {
      mexeu = true;
      giraPara(anguloDaEntrada(e), function () {
        return vistaEntrada(id) || alvoEnquadre(svg.querySelectorAll('[data-entrada="' + esc(id) + '"]'));
      });
    } else if (enquadrar) enquadraEntrada(id);
  }
  function desseleciona() {
    estado.local = null;
    pilha = [];
    desenhaSelecao(null);
    atualizaEndereco();
    render();
  }

  /* ---------- Painel ---------- */
  function caixaNumero(l) {
    var n = el('span', 'local__num painel__num loc--' + l.categoria);
    n.appendChild(el('span', 'visually-hidden', 'Sala '));
    n.appendChild(document.createTextNode(l.id));
    return n;
  }
  function botaoLocal(l) {
    var li = el('li');
    var b = el('button', 'painel__item loc--' + l.categoria);
    b.type = 'button';
    b.setAttribute('data-ir', l.id);
    b.appendChild(el('span', 'painel__item-num', l.id));
    var t = el('span', 'painel__item-txt');
    t.appendChild(el('span', 'painel__item-nome', titulo(l)));
    t.appendChild(el('span', 'painel__item-sub', subtitulo(l)));
    if (l.resumo) t.appendChild(el('span', 'painel__item-sub painel__item-resumo', l.resumo)); // o que compõe a sala
    b.appendChild(t);
    li.appendChild(b);
    return li;
  }
  // A sala se identifica pelo número ("Sala 88") e pela categoria dela
  function titulo(l) { return 'Sala ' + l.id; }
  function categoriaDe(l) { return nomesCat[l.categoria] || nomesCat.outros; }
  function andarDe(l) { return nomesAndar[l.andar || 0] || nomesAndar[0]; }
  function subtitulo(l) { return categoriaDe(l) + ' · ' + andarDe(l); }
  function cargoArea(p) { return [p.cargo, p.area].filter(Boolean).join(' · '); }
  function salasTexto(salas) { return (salas.length > 1 ? 'Salas ' : 'Sala ') + salas.join(', '); }
  // Botão de pessoa ou de unidade nos cartões e nos resultados. Com a sala, mostra o
  // número na cor dela; dentro do cartão da própria sala, só o nome
  function botaoItem(attr, id, nome, sub, sala, sigla) {
    var li = el('li');
    var l = sala && porId[sala];
    var b = el('button', 'painel__item' + (l ? ' loc--' + l.categoria : ' painel__item--sem-num'));
    b.type = 'button';
    b.setAttribute(attr, id);
    if (l) b.appendChild(el('span', 'painel__item-num', l.id));
    var t = el('span', 'painel__item-txt');
    var n = el('span', 'painel__item-nome', nome);
    if (sigla && nome.indexOf(sigla) === -1) {
      n.appendChild(document.createTextNode(' '));
      n.appendChild(el('span', 'badge', sigla));
    }
    t.appendChild(n);
    if (sub) t.appendChild(el('span', 'painel__item-sub', sub));
    b.appendChild(t);
    li.appendChild(b);
    return li;
  }
  function botaoPessoa(p, comSala) {
    var sub = cargoArea(p);
    if (comSala && p.sala) sub = [sub, 'Sala ' + p.sala].filter(Boolean).join(' · ');
    return botaoItem('data-ir-pessoa', p.id, p.nome, sub, comSala && p.sala);
  }
  function botaoUnidade(u, comSala) {
    var sub = nomesCat[u.tipo];
    if (comSala && u.salas && u.salas.length) sub += ' · ' + salasTexto(u.salas);
    return botaoItem('data-ir-unidade', u.id, u.nome, sub, comSala && u.salas && u.salas[0], u.sigla);
  }
  function secao(titulo_, itens) {
    var box = el('div', 'painel__secao');
    box.appendChild(el('p', 'painel__eyebrow', titulo_));
    var ul = el('ul', 'painel__lista');
    itens.forEach(function (i) { ul.appendChild(i); });
    box.appendChild(ul);
    return box;
  }
  function cabecalho(l, eyebrow, nome, sigla) {
    var cab = el('div', 'painel__cabeca');
    if (l) cab.appendChild(caixaNumero(l));
    var tt = el('div', 'painel__cabeca-txt');
    tt.appendChild(el('p', 'painel__eyebrow', eyebrow));
    var h = el('h2', 'painel__titulo', nome);
    if (sigla && nome.indexOf(sigla) === -1) {
      h.appendChild(document.createTextNode(' '));
      h.appendChild(el('span', 'badge', sigla));
    }
    tt.appendChild(h);
    if (l) tt.appendChild(el('span', 'painel__andar painel__andar--' + (l.andar || 0), andarDe(l)));
    cab.appendChild(tt);
    return cab;
  }
  function topoCartao(rotuloFechar) {
    painel.appendChild(botaoFechar(rotuloFechar));
    // "Voltar" só quando há para onde: o cartão anterior ou os resultados da busca
    if (!pilha.length && !estado.busca.trim()) return;
    var voltar = el('button', 'btn btn--ghost btn--sm painel__voltar', '← Voltar');
    voltar.type = 'button';
    voltar.setAttribute('data-voltar', '');
    painel.appendChild(voltar);
  }
  function acoesCartao(comLista, id) {
    var acoes = el('div', 'painel__acoes');
    var centra = el('button', 'btn btn--secondary btn--sm', 'Centralizar na planta');
    centra.type = 'button';
    centra.setAttribute('data-centralizar', '');
    acoes.appendChild(centra);
    if (comLista) {
      var link = el('a', 'btn btn--ghost btn--sm', 'Ver na lista');
      link.href = '#local-' + id;
      link.setAttribute('data-ver-lista', id);
      acoes.appendChild(link);
      var imprime = el('button', 'btn btn--ghost btn--sm', 'Imprimir');
      imprime.type = 'button';
      imprime.setAttribute('data-imprimir', '');
      acoes.appendChild(imprime);
    }
    return acoes;
  }

  function renderPessoa() {
    var p = porPessoa[estado.pessoa], l = p.sala && porId[p.sala];
    topoCartao('Fechar ' + p.nome);
    painel.appendChild(cabecalho(l, cargoArea(p) || 'Pessoa', p.nome));
    var ct = contatos(p);
    if (ct) painel.appendChild(ct);
    if (l) painel.appendChild(secao(l.pessoas.length > 1 ? 'Sala, com ' + (l.pessoas.length - 1) + (l.pessoas.length > 2 ? ' colegas' : ' colega') : 'Sala',
      [botaoItem('data-ir', l.id, titulo(l), subtitulo(l), l.id)]));
    var coord = (p.coordena || []).map(function (id) { return botaoUnidade(porUnidade[id], true); });
    if (coord.length) painel.appendChild(secao(coord.length > 1 ? 'Coordena os laboratórios' : 'Coordena', coord));
    if (l) painel.appendChild(acoesCartao(false));
    painel.appendChild(blocoCompartilhar());
  }

  function renderUnidade() {
    var u = porUnidade[estado.unidade], salas = u.salas || [], l = salas.length && porId[salas[0]];
    topoCartao('Fechar ' + u.nome);
    var eyebrow = nomesCat[u.tipo] + (salas.length ? ' · ' + salasTexto(salas) : '');
    painel.appendChild(cabecalho(l, eyebrow, u.nome, u.sigla));
    if (u.descricao) painel.appendChild(el('p', 'painel__texto', u.descricao));
    var ct = contatos(u);
    if (ct) painel.appendChild(ct);
    if (u.coordenacao && u.coordenacao.length) {
      painel.appendChild(secao(u.coordenacao.length > 1 ? 'Coordenação' : 'Coordenação', u.coordenacao.map(function (c) {
        if (c.pessoa && porPessoa[c.pessoa]) return botaoPessoa(porPessoa[c.pessoa], true);
        var li = el('li', 'painel__nome-solto');
        li.appendChild(el('span', 'painel__item-nome', c.nome));
        return li;
      })));
    }
    // Salas da unidade: "Sala 8" quando a sala leva o nome da própria unidade
    var botaoSala = function (id) {
      var x = porId[id];
      return botaoItem('data-ir', id, titulo(x), subtitulo(x), id);
    };
    if (salas.length) painel.appendChild(secao(salas.length > 1 ? 'Salas' : 'Sala', salas.map(botaoSala)));
    if (l) painel.appendChild(acoesCartao(false));
    painel.appendChild(blocoCompartilhar());
  }

  function renderVisaoGeral() {
    painel.appendChild(el('p', 'painel__eyebrow', 'Planta do prédio'));
    painel.appendChild(el('h2', 'painel__titulo', dados.locais.length + ' locais'));
    var p = el('p', 'painel__texto');
    p.textContent = 'Toque ou clique numa sala para ver o que funciona nela. Para ver todos os locais de um tipo, use os botões de destaque.';
    painel.appendChild(p);
    // A lista de todos os locais começa oculta; o botão a mostra aqui no painel
    var t = el('button', 'btn btn--secondary btn--sm painel__todos',
      estado.todos ? 'Ocultar os locais' : 'Mostrar todos os locais');
    t.type = 'button';
    t.setAttribute('data-todos', '');
    t.setAttribute('aria-expanded', estado.todos ? 'true' : 'false');
    if (dados.entradas && dados.entradas.length) {
      painel.appendChild(el('p', 'painel__eyebrow', 'Entradas do prédio'));
      painel.appendChild(listaEntradas(dados.entradas));
    }
    // Rampas e escadas do andar exibido (as mesmas existem no outro andar)
    var acs = (dados.acessos || []).filter(function (a) { return (a.andar || 0) === estado.piso; });
    if (acs.length) {
      painel.appendChild(el('p', 'painel__eyebrow', 'Rampas e escadas · ' + nomesAndar[estado.piso]));
      painel.appendChild(listaEntradas(acs));
    }
    painel.appendChild(t);
    if (estado.todos) {
      var ul = el('ul', 'painel__lista');
      dados.locais.forEach(function (l) { ul.appendChild(botaoLocal(l)); });
      painel.appendChild(ul);
    }
  }

  function botaoFechar(rotulo) {
    var b = el('button', 'planta__btn painel__fechar');
    b.type = 'button';
    b.setAttribute('data-fechar', '');
    b.setAttribute('aria-label', rotulo);
    b.title = rotulo;
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'icon');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', '/img/icons/sprite.svg#close');
    s.appendChild(u);
    b.appendChild(s);
    return b;
  }

  function renderResultados() {
    var ps = pessoasDaBusca(), us = unidadesDaBusca(), r = salasDaBusca(), ents = entradasDaBusca();
    painel.appendChild(botaoFechar('Fechar resultados'));
    painel.appendChild(el('p', 'painel__eyebrow', estado.busca.trim() ? 'Resultado da busca' : 'Destaques'));
    var n = ps.length + us.length + r.length + ents.length;
    painel.appendChild(el('h2', 'painel__titulo', n + (n === 1 ? ' resultado' : ' resultados')));
    if (!n) {
      painel.appendChild(el('p', 'painel__texto', 'Nada encontrado. Tente o número da sala, o nome de uma pessoa, de um laboratório ou a sigla.'));
      return;
    }
    if (ents.length) painel.appendChild(listaEntradas(ents));
    if (ps.length) painel.appendChild(secao('Pessoas', ps.map(function (p) { return botaoPessoa(p, true); })));
    if (us.length) painel.appendChild(secao('Laboratórios e serviços', us.map(function (u) { return botaoUnidade(u, true); })));
    if (r.length) painel.appendChild(secao(ps.length || us.length ? 'Salas' : (r.length === 1 ? 'Sala' : 'Salas'), r.map(botaoLocal)));
  }

  // Só no papel: o que funciona na sala e quem trabalha nela, em texto corrido, com os
  // contatos escritos por extenso (no papel, link não se clica)
  function blocoImpressao(l, us) {
    var box = el('div', 'painel__impressao');
    if (l.nome) box.appendChild(el('p', 'imp__nome', l.nome));
    var semProto = function (u) { return u.replace(/^https?:\/\/(www\.)?|\/$/g, ''); };
    us.forEach(function (u) {
      var d = el('div', 'imp__item');
      var n = el('p', 'imp__nome', u.nome);
      if (u.sigla && u.nome.indexOf(u.sigla) === -1) n.appendChild(el('span', 'imp__sigla', ' (' + u.sigla + ')'));
      d.appendChild(n);
      d.appendChild(el('p', 'imp__sub', nomesCat[u.tipo] + (u.salas.length > 1 ? ' · ' + salasTexto(u.salas) : '')));
      if (u.descricao) d.appendChild(el('p', 'imp__txt', u.descricao));
      if ((u.coordenacao || []).length) d.appendChild(el('p', 'imp__txt', 'Coordenação: ' + u.coordenacao.map(function (c) { return c.nome; }).join(', ')));
      if (u.site) d.appendChild(el('p', 'imp__txt', 'Site: ' + semProto(u.site)));
      box.appendChild(d);
    });
    if (l.pessoas.length) {
      box.appendChild(el('p', 'painel__eyebrow', l.categoria === 'sala-prof' ? 'Professores' : 'Pessoas'));
      l.pessoas.forEach(function (id) {
        var p = porPessoa[id], d = el('div', 'imp__item');
        d.appendChild(el('p', 'imp__nome', p.nome));
        var sub = cargoArea(p);
        if (sub) d.appendChild(el('p', 'imp__sub', sub));
        var ct = [p.email, p.lattes && 'Lattes: ' + semProto(p.lattes)].filter(Boolean).join(' · ');
        if (ct) d.appendChild(el('p', 'imp__txt', ct));
        box.appendChild(d);
      });
    }
    return box;
  }

  function renderLocal() {
    var l = porId[estado.local];
    topoCartao('Fechar detalhes da sala ' + l.id);
    // Cabeçalho: "Sala 88" e a categoria; embaixo, o que compõe a sala
    painel.appendChild(cabecalho(l, categoriaDe(l), titulo(l)));
    if (l.nome) painel.appendChild(el('p', 'painel__item-nome painel__nome-sala', l.nome));
    if (l.acesso) painel.appendChild(el('p', 'painel__texto', l.acesso));
    // O que funciona na sala (laboratórios, serviços) e quem trabalha nela
    var us = l.unidades.map(function (id) { return porUnidade[id]; });
    if (us.length) {
      painel.appendChild(secao('Nesta sala', us.map(function (u) {
        var sub = u.descricao || ((u.coordenacao || []).length ? 'Coordenação: ' + u.coordenacao.map(function (c) { return c.nome; }).join(', ') : nomesCat[u.tipo]);
        if (u.salas.length > 1) sub += ' · também em ' + salasTexto(u.salas.filter(function (s) { return s !== l.id; })).toLowerCase();
        return botaoItem('data-ir-unidade', u.id, u.nome, sub, null, u.sigla);
      })));
    }
    if (l.pessoas.length) {
      painel.appendChild(secao(l.categoria === 'sala-prof' ? (l.pessoas.length > 1 ? 'Professores' : 'Professor ou professora') : 'Pessoas',
        l.pessoas.map(function (id) { return botaoPessoa(porPessoa[id], false); })));
    }
    if (!us.length && !l.pessoas.length && !l.acesso && !l.nome) {
      painel.appendChild(el('p', 'painel__texto', 'Ainda não há informações sobre este local.'));
    }
    painel.appendChild(acoesCartao(true, l.id));
    painel.appendChild(blocoImpressao(l, us));
    painel.appendChild(blocoCompartilhar());
    // Só na impressão: o endereço para abrir a sala no celular
    var url = el('p', 'painel__url');
    url.appendChild(el('strong', '', 'Ver na planta: '));
    url.appendChild(document.createTextNode(urlLocal(l).replace(/^https?:\/\//, '')));
    painel.appendChild(url);
  }

  /* ---------- Compartilhar o local exibido ---------- */
  // Página de compartilhamento do local (mapa/l/<id>.html, gerada por
  // scripts/gerar_compartilhamento.js): tem a imagem de prévia da sala e leva a ?local=<id>
  function urlLocal(l) {
    return window.location.origin + '/mapa/l/' + encodeURIComponent(l.id);
  }
  function textoLocal(l) { return titulo(l) + ' · ' + categoriaDe(l) + ' | Mapa Digital, Química UFPR'; }
  // WhatsApp e Instagram vêm do sprite do site; "Enviar" é um ícone de traço
  var ENVIAR = ['M12 3v12', 'M7.5 7.5L12 3l4.5 4.5', 'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7'];
  function icone(nome) {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.setAttribute('class', 'icon painel__share-ico painel__share-ico--' + nome);
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    if (nome === 'enviar') {
      s.setAttribute('viewBox', '0 0 24 24');
      s.setAttribute('fill', 'none');
      s.setAttribute('stroke', 'currentColor');
      s.setAttribute('stroke-width', '2');
      s.setAttribute('stroke-linecap', 'round');
      s.setAttribute('stroke-linejoin', 'round');
      ENVIAR.forEach(function (d) {
        var p = document.createElementNS(ns, 'path');
        p.setAttribute('d', d);
        s.appendChild(p);
      });
    } else {
      var u = document.createElementNS(ns, 'use');
      u.setAttribute('href', '/img/icons/sprite.svg#' + (nome === 'copiar' ? 'link' : nome));
      s.appendChild(u);
    }
    return s;
  }
  // E-mail (pessoas) e site (laboratórios) de um item, vindos das colunas da planilha;
  // gerar_mapa.py já validou os dois (o site sempre começa com http)
  function iconeSprite(nome) {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), u = document.createElementNS(ns, 'use');
    s.setAttribute('class', 'icon');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    u.setAttribute('href', '/img/icons/sprite.svg#' + nome);
    s.appendChild(u);
    return s;
  }
  function linkExterno(url, rotulo) {
    var w = el('a', 'contato contato--site');
    w.href = url;
    w.target = '_blank';
    w.rel = 'noopener noreferrer';
    w.appendChild(iconeSprite('external'));
    w.appendChild(document.createTextNode(rotulo));
    w.appendChild(el('span', 'visually-hidden', ' (abre em nova aba)'));
    return w;
  }
  // E-mail institucional, currículo Lattes e site; vazios não aparecem
  function contatos(i) {
    var ok = function (u) { return u && /^https?:\/\//i.test(u); };
    if (!i.email && !ok(i.site) && !ok(i.lattes)) return null;
    var p = el('p', 'contatos');
    if (ok(i.lattes)) p.appendChild(linkExterno(i.lattes, 'Currículo Lattes'));
    if (i.email) {
      var m = el('a', 'contato contato--email');
      m.href = 'mailto:' + i.email;
      m.appendChild(iconeSprite('mail'));
      m.appendChild(document.createTextNode(i.email));
      p.appendChild(m);
    }
    if (ok(i.site)) p.appendChild(linkExterno(i.site, i.site.replace(/^https?:\/\/(www\.)?|\/$/g, '')));
    return p;
  }
  // O que se compartilha: a sala (página com prévia própria), a pessoa ou a unidade
  function alvoShare() {
    var base = window.location.origin + '/mapa/', fim = ' | Mapa Digital, Química UFPR';
    if (estado.local) {
      var l = porId[estado.local];
      return { url: urlLocal(l), titulo: 'Mapa Digital · Sala ' + l.id, texto: textoLocal(l), rotulo: 'Compartilhar este local' };
    }
    if (estado.pessoa) {
      var p = porPessoa[estado.pessoa];
      return { url: base + '?pessoa=' + encodeURIComponent(p.id), titulo: 'Mapa Digital · ' + p.nome,
        texto: p.nome + (p.sala ? ' · Sala ' + p.sala : '') + fim, rotulo: 'Compartilhar' };
    }
    var u = porUnidade[estado.unidade];
    return { url: base + '?unidade=' + encodeURIComponent(u.id), titulo: 'Mapa Digital · ' + u.nome,
      texto: u.nome + (u.salas && u.salas.length ? ' · ' + salasTexto(u.salas) : '') + fim, rotulo: 'Compartilhar este laboratório' };
  }
  function blocoCompartilhar() {
    var a = alvoShare();
    var box = el('div', 'painel__compartilhar');
    box.appendChild(el('p', 'painel__eyebrow', a.rotulo));
    var row = el('div', 'painel__share');
    var wa = el('a', 'painel__share-btn painel__share-btn--whatsapp');
    wa.setAttribute('aria-label', 'Compartilhar pelo WhatsApp');
    wa.title = 'WhatsApp';
    wa.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(a.texto + '\n' + a.url);
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.appendChild(icone('whatsapp'));
    row.appendChild(wa);
    [['instagram', 'Instagram', 'Compartilhar pelo Instagram'], ['copiar', 'Copiar o link', 'Copiar o link da sala'],
      ['enviar', 'Enviar', 'Enviar por outro aplicativo ou copiar o link']].forEach(function (o) {
      var b = el('button', 'painel__share-btn painel__share-btn--' + o[0]);
      b.type = 'button';
      b.setAttribute('data-compartilhar', o[0]);
      b.setAttribute('aria-label', o[2]);
      b.title = o[1];
      b.appendChild(icone(o[0]));
      if (o[0] === 'copiar') b.appendChild(iconeOk());
      row.appendChild(b);
    });
    box.appendChild(row);
    var st = el('p', 'painel__share-status');
    st.setAttribute('role', 'status');
    st.setAttribute('data-share-status', '');
    box.appendChild(st);
    return box;
  }
  // Visto de "copiado", desenhado por cima do ícone de link
  function iconeOk() {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.setAttribute('class', 'painel__share-ok');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'M5 12.5l4.5 4.5L19 7.5');
    p.setAttribute('pathLength', '1');
    s.appendChild(p);
    return s;
  }
  function avisaShare(msg, soLeitor) {
    var st = painel.querySelector('[data-share-status]');
    if (!st) return;
    st.classList.toggle('visually-hidden', !!soLeitor);
    st.textContent = msg;
  }
  // Copiar: o próprio botão confirma (fica verde e mostra um visto)
  var tempoCopiado;
  function marcaCopiado() {
    var b = painel.querySelector('[data-compartilhar="copiar"]');
    if (!b) return;
    clearTimeout(tempoCopiado);
    b.classList.remove('is-copiado');
    void b.offsetWidth;
    b.classList.add('is-copiado');
    b.title = 'Link copiado';
    avisaShare('Link copiado.', true);
    tempoCopiado = setTimeout(function () {
      b.classList.remove('is-copiado');
      b.title = 'Copiar o link';
      avisaShare('');
    }, 2000);
  }
  function copia(texto) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
    return new Promise(function (ok, falha) {
      var t = document.createElement('textarea');
      t.value = texto;
      t.setAttribute('readonly', '');
      t.style.position = 'fixed';
      t.style.opacity = '0';
      root.appendChild(t);
      t.select();
      try { if (document.execCommand('copy')) ok(); else falha(); } catch (e) { falha(e); }
      root.removeChild(t);
    });
  }
  // Instagram não aceita link de compartilhamento: no celular abre a folha de
  // compartilhar do sistema (onde ele aparece) e, em todo caso, copia o link.
  // "Enviar" abre a mesma folha; sem ela (computador), copia o link.
  function compartilha(tipo) {
    if (!estado.local && !estado.pessoa && !estado.unidade) return;
    var a = alvoShare(), url = a.url, dadosShare = { title: a.titulo, text: a.texto, url: url };
    var podeShare = !!navigator.share && (!navigator.canShare || navigator.canShare(dadosShare));
    if (tipo === 'copiar') {
      copia(url).then(marcaCopiado, function () { avisaShare(url); });
    } else if (tipo === 'instagram') {
      copia(url).then(function () {
        avisaShare(podeShare ? 'Link copiado. Escolha o Instagram na lista.' : 'Link copiado. Cole no Instagram (Direct ou Stories).');
      }, function () { avisaShare(url); });
      if (podeShare) navigator.share(dadosShare).catch(function () {});
      else window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener');
    } else if (podeShare) {
      navigator.share(dadosShare).catch(function () {});
    } else {
      copia(url).then(function () { avisaShare('Link copiado.'); }, function () { avisaShare(url); });
    }
  }

  function renderEntrada() {
    var e = porEntrada[estado.entrada];
    painel.appendChild(botaoFechar('Fechar ' + e.nome));
    if (estado.busca.trim()) { // "Voltar" para os resultados da busca
      var voltar = el('button', 'btn btn--ghost btn--sm painel__voltar', '← Voltar');
      voltar.type = 'button';
      voltar.setAttribute('data-voltar', '');
      painel.appendChild(voltar);
    }
    var tipo = { entrada: 'Entrada do prédio', rampa: 'Rampa', escada: 'Escada' }[e.tipo] || 'Entrada do prédio';
    painel.appendChild(el('p', 'painel__eyebrow', tipo + ' · ' + andarDe(e)));
    painel.appendChild(el('h2', 'painel__titulo', e.nome));
    painel.appendChild(el('p', 'painel__texto', e.descricao));
    var acoes = el('div', 'painel__acoes');
    var centra = el('button', 'btn btn--secondary btn--sm', 'Centralizar na planta');
    centra.type = 'button';
    centra.setAttribute('data-centralizar', '');
    acoes.appendChild(centra);
    painel.appendChild(acoes);
  }
  // Botões das entradas (visão geral e resultados da busca)
  function listaEntradas(es) {
    var ul = el('ul', 'painel__entradas');
    es.forEach(function (e) {
      var li = el('li');
      var b = el('button', 'painel__ponto painel__ponto--' + (e.tipo || 'entrada'));
      b.type = 'button';
      b.setAttribute('data-ir-entrada', e.id);
      var ico = el('span', 'painel__ponto-ico');
      ico.setAttribute('aria-hidden', 'true');
      b.appendChild(ico);
      b.appendChild(document.createTextNode(e.nome + (e.tipo !== 'entrada' && e.andar ? ' · 1º andar' : '')));
      li.appendChild(b);
      ul.appendChild(li);
    });
    return ul;
  }
  function entradasDaBusca() {
    var q = normalize(estado.busca.trim());
    if (!q || estado.destaques.length) return [];
    return pontos().filter(function (e) { return e._busca.indexOf(q) !== -1; });
  }
  function pontos() { return (dados.entradas || []).concat(dados.acessos || []);
  }

  function render() {
    aplicaFiltro();
    painel.textContent = '';
    if (estado.local) renderLocal();
    else if (estado.pessoa && porPessoa[estado.pessoa]) renderPessoa();
    else if (estado.unidade && porUnidade[estado.unidade]) renderUnidade();
    else if (estado.entrada && porEntrada[estado.entrada]) renderEntrada();
    else if (filtroAtivo()) renderResultados();
    else renderVisaoGeral();
    // Celular: o cartão fixo aparece com uma sala escolhida ou uma busca digitada.
    // Só com destaques, a planta fica livre (as cores dos botões servem de legenda).
    // No celular, escolher uma entrada só move o mapa: o cartão não abre
    var soMapa = estado.entrada && celular.matches && porEntrada[estado.entrada] && porEntrada[estado.entrada].tipo === 'entrada';
    var folha = !!(estado.local || estado.pessoa || estado.unidade || (estado.entrada && !soMapa) || estado.busca.trim());
    if (folha && !root.classList.contains('tem-folha')) { painelEl.scrollTop = 0; poeFolha(false); }
    if (!folha) poeFolha(false);
    root.classList.toggle('tem-folha', folha);
    window.setTimeout(atualizaMais, 0);
  }

  /* ---------- Celular e tablet: cartão do pé da tela com duas alturas ----------
     Abre na altura média; arrastar a alça ou o cartão para cima o expande até abaixo do
     cabeçalho, e para baixo o devolve à altura média (ou, da média, fecha). Tocar na alça
     alterna as duas alturas. Expandido, o conteúdo rola; com ele no topo, puxar para baixo
     reduz o cartão, como as folhas do iOS. */
  var alca = el('button', 'painel__alca');
  alca.type = 'button';
  painelEl.insertBefore(alca, painelEl.firstChild);
  var folhaCheia = false;
  function poeFolha(cheia) {
    folhaCheia = cheia;
    root.classList.toggle('folha-cheia', cheia);
    alca.setAttribute('aria-expanded', cheia ? 'true' : 'false');
    alca.setAttribute('aria-label', cheia ? 'Reduzir o cartão' : 'Expandir o cartão');
    painelEl.style.height = '';
    if (!cheia) painelEl.scrollTop = 0;
    atualizaMais();
  }
  // Na altura média, um esmaecimento no pé avisa que há mais conteúdo
  function atualizaMais() {
    root.classList.toggle('folha-tem-mais', !folhaCheia && painelEl.scrollHeight > painelEl.clientHeight + 4);
  }
  function alturaCheia() {
    var cab = document.querySelector('.site-header');
    var topo = cab ? Math.max(0, cab.getBoundingClientRect().bottom) : 0;
    return window.innerHeight - topo;
  }
  function alturaMedia() {
    var conteudo = alca.offsetHeight + painel.offsetHeight;
    return Math.min(conteudo, window.innerHeight * 0.45);
  }
  // Leva o cartão até uma das alturas, com animação (sem ela, para quem pediu menos movimento)
  function encaixa(cheia) {
    var alvo = cheia ? alturaCheia() : alturaMedia();
    if (reduzMovimento) { poeFolha(cheia); return; }
    painelEl.style.height = painelEl.getBoundingClientRect().height + 'px';
    root.classList.add('folha-anima');
    void painelEl.offsetHeight;
    painelEl.style.height = alvo + 'px';
    window.setTimeout(function () { root.classList.remove('folha-anima'); poeFolha(cheia); }, 260);
  }
  alca.addEventListener('click', function () { encaixa(!folhaCheia); });
  var arrasto = null, ignoraClique = false;
  painelEl.addEventListener('touchstart', function (e) {
    if (!folhaMq.matches || !root.classList.contains('tem-folha') || e.touches.length > 1) { arrasto = null; return; }
    arrasto = { y0: e.touches[0].clientY, y: e.touches[0].clientY, t0: Date.now(), h0: painelEl.getBoundingClientRect().height,
      ativo: false, naAlca: !!e.target.closest('.painel__alca') };
  }, { passive: true });
  painelEl.addEventListener('touchmove', function (e) {
    if (!arrasto) return;
    var dy = e.touches[0].clientY - arrasto.y0;
    arrasto.y = e.touches[0].clientY;
    if (!arrasto.ativo) {
      if (Math.abs(dy) < 8) return;
      // Expandido: o dedo rola o conteúdo, salvo pela alça ou puxando para baixo com o conteúdo no topo
      if (folhaCheia && !arrasto.naAlca && !(dy > 0 && painelEl.scrollTop <= 0)) { arrasto = null; return; }
      arrasto.ativo = true;
      root.classList.add('folha-arrastando');
    }
    e.preventDefault();
    var h = Math.max(80, Math.min(alturaCheia(), arrasto.h0 - dy));
    painelEl.style.height = h + 'px';
  }, { passive: false });
  painelEl.addEventListener('touchend', function () {
    if (!arrasto) return;
    var a = arrasto;
    arrasto = null;
    if (!a.ativo) return;
    root.classList.remove('folha-arrastando');
    ignoraClique = true;
    window.setTimeout(function () { ignoraClique = false; }, 350);
    var dy = a.y - a.y0, v = dy / Math.max(1, Date.now() - a.t0); // px por ms
    if (folhaCheia) encaixa(!(dy > 80 || v > 0.5));
    else if (dy < -40 || v < -0.4) encaixa(true);
    else if (dy > 90 || v > 0.6) { painelEl.style.height = ''; fechaFolha(); }
    else encaixa(false);
  });
  // Um arrasto não vale como toque num botão do cartão
  painelEl.addEventListener('click', function (e) {
    if (ignoraClique) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  window.addEventListener('resize', function () { if (!folhaCheia) atualizaMais(); });

  // Fechar o cartão: tira a seleção e a busca
  function fechaFolha() {
    estado.local = null;
    pilha = [];
    desenhaSelecao(null);
    if (estado.busca) { estado.busca = ''; busca.value = ''; }
    abreBusca(false);
    atualizaEndereco();
    render();
  }

  painel.addEventListener('click', function (e) {
    var t = e.target.closest('[data-ir], [data-ir-pessoa], [data-ir-unidade], [data-voltar], [data-centralizar], [data-fechar], [data-ver-lista], [data-todos], [data-compartilhar], [data-imprimir], [data-ir-entrada]');
    if (!t) return;
    if (t.hasAttribute('data-imprimir')) {
      window.print();
    } else if (t.hasAttribute('data-compartilhar')) {
      compartilha(t.getAttribute('data-compartilhar'));
    } else if (t.hasAttribute('data-todos')) {
      estado.todos = !estado.todos;
      render();
      var b = painel.querySelector('[data-todos]');
      if (b) b.focus();
    } else if (t.hasAttribute('data-ir')) { empilha(); seleciona(t.getAttribute('data-ir'), true); }
    else if (t.hasAttribute('data-ir-pessoa')) { empilha(); selecionaPessoa(t.getAttribute('data-ir-pessoa')); }
    else if (t.hasAttribute('data-ir-unidade')) { empilha(); selecionaUnidade(t.getAttribute('data-ir-unidade')); }
    else if (t.hasAttribute('data-ir-entrada')) selecionaEntrada(t.getAttribute('data-ir-entrada'), true);
    else if (t.hasAttribute('data-voltar')) volta();
    else if (t.hasAttribute('data-centralizar')) {
      var ve = estado.entrada && porEntrada[estado.entrada].tipo === 'entrada' && vistaEntrada(estado.entrada);
      if (ve) animaPara(ve);
      else if (estado.entrada) enquadraEntrada(estado.entrada);
      else if (estado.pessoa) enquadra(porPessoa[estado.pessoa].sala);
      else if (estado.unidade) enquadraNos(areasDe(salasNoAndar(porUnidade[estado.unidade])));
      else enquadra(estado.local);
    }
    else if (t.hasAttribute('data-fechar')) fechaFolha();
    else if (t.hasAttribute('data-ver-lista')) {
      e.preventDefault();
      e.stopPropagation(); // senão o clique "fora" fecharia o card que vai abrir
      var id = t.getAttribute('data-ver-lista');
      mostraNaLista(id);
      if (folhaMq.matches) fechaFolha(); // o cartão cobriria a lista
      window.location.hash = 'local-' + id;
    }
  });

  /* ---------- Celular: busca recolhida e lista em acordeão ---------- */
  function abreBusca(on) {
    root.classList.toggle('is-buscando', on);
    lupa.setAttribute('aria-expanded', on ? 'true' : 'false');
    lupa.setAttribute('aria-label', on ? 'Fechar a busca' : 'Buscar');
    lupa.title = on ? 'Fechar a busca' : 'Buscar';
  }
  lupa.addEventListener('click', function () {
    if (root.classList.contains('is-buscando')) { fechaFolha(); lupa.focus(); }
    else { abreBusca(true); busca.focus(); }
  });
  lupa.hidden = false;

  function abreLista() {} // a lista fica sempre à mostra

  // Cards da lista: "Detalhes" abre e fecha os itens do local, dentro do próprio card
  function abreCard(li, on) {
    if (!li) return;
    var b = li.querySelector('.local__abrir');
    if (!b) return;
    li.classList.toggle('is-aberto', on);
    b.setAttribute('aria-expanded', on ? 'true' : 'false');
  }

  /* Carrossel: 9 cards por página, só entre os que o filtro deixa à mostra */
  // 12 por página: múltiplo das 1, 2, 3 ou 4 colunas da grade (css/style.css), as linhas sempre fecham
  var POR_PAGINA = 12, pagina = 0, filtroDaLista = '|'; // '|' = sem busca e sem destaques
  var paginasEl = document.querySelector('[data-lista-paginas]');
  var secaoLista = lista.closest('section');
  function visiveisNaLista() {
    return Array.prototype.filter.call(lista.children, function (li) { return !li.hidden; });
  }
  function paginar(dir) {
    var vis = visiveisNaLista(), total = Math.max(1, Math.ceil(vis.length / POR_PAGINA));
    pagina = Math.max(0, Math.min(pagina, total - 1));
    Array.prototype.forEach.call(lista.children, function (li) { li.classList.add('fora-da-pagina'); });
    vis.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA).forEach(function (li) { li.classList.remove('fora-da-pagina'); });
    desenhaPaginas(total, vis.length);
    lista.classList.remove('entra-dir', 'entra-esq');
    if (dir && !reduzMovimento) {
      void lista.offsetWidth; // reinicia a animação
      lista.classList.add(dir > 0 ? 'entra-dir' : 'entra-esq');
    }
  }
  function irParaPagina(n) {
    var antes = pagina;
    pagina = n;
    paginar(n - antes);
    // Se o topo da lista saiu da tela, volta até ele
    var topo = secaoLista.querySelector('.lista__barra') || lista;
    if (topo.getBoundingClientRect().top < 0) topo.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' });
  }
  function botaoPagina(texto, alvo, rotulo, extra) {
    var b = el('button', 'lista__pag' + (extra || ''), texto);
    b.type = 'button';
    b.setAttribute('data-pagina', String(alvo));
    if (rotulo) b.setAttribute('aria-label', rotulo);
    return b;
  }
  function desenhaPaginas(total, n) {
    paginasEl.textContent = '';
    paginasEl.hidden = total <= 1;
    if (total <= 1) return;
    var ant = botaoPagina('‹ Anterior', pagina - 1, 'Página anterior', ' lista__pag--seta');
    ant.disabled = pagina === 0;
    paginasEl.appendChild(ant);
    // Números: primeira, última e as vizinhas da atual
    var ultimo = -1;
    for (var i = 0; i < total; i++) {
      if (i !== 0 && i !== total - 1 && Math.abs(i - pagina) > 1) continue;
      if (ultimo !== -1 && i - ultimo > 1) paginasEl.appendChild(el('span', 'lista__pag-gap', '…'));
      var b = botaoPagina(String(i + 1), i, 'Página ' + (i + 1));
      if (i === pagina) b.setAttribute('aria-current', 'page');
      paginasEl.appendChild(b);
      ultimo = i;
    }
    var prox = botaoPagina('Próxima ›', pagina + 1, 'Próxima página', ' lista__pag--seta');
    prox.disabled = pagina === total - 1;
    paginasEl.appendChild(prox);
    var de = pagina * POR_PAGINA + 1, ate = Math.min(n, de + POR_PAGINA - 1);
    paginasEl.appendChild(el('p', 'lista__pag-info', 'Mostrando ' + de + '–' + ate + ' de ' + n + (n === 1 ? ' local' : ' locais')));
  }
  paginasEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pagina]');
    if (b && !b.disabled) irParaPagina(+b.getAttribute('data-pagina'));
  });
  // Deslizar o dedo para o lado troca de página
  var toqueX = null;
  lista.addEventListener('pointerdown', function (e) { toqueX = e.pointerType === 'touch' ? e.clientX : null; });
  lista.addEventListener('pointerup', function (e) {
    if (toqueX === null) return;
    var dx = e.clientX - toqueX, total = Math.ceil(visiveisNaLista().length / POR_PAGINA);
    toqueX = null;
    if (Math.abs(dx) < 60) return;
    if (dx < 0 && pagina < total - 1) irParaPagina(pagina + 1);
    else if (dx > 0 && pagina > 0) irParaPagina(pagina - 1);
  });
  // Chamada depois de filtrar (aplicaFiltro): com outro filtro, volta à primeira página
  function atualizaPaginas() {
    var chave = estado.busca.trim() + '|' + estado.destaques.join(',');
    if (chave !== filtroDaLista) { filtroDaLista = chave; pagina = 0; }
    paginar(0);
  }
  // Leva a lista até o card de um local: abre a lista, vai à página dele e abre os detalhes
  function mostraNaLista(id) {
    var li = document.getElementById('local-' + id);
    if (!li) return;
    abreLista(true);
    var idx = visiveisNaLista().indexOf(li);
    if (idx !== -1) { pagina = Math.floor(idx / POR_PAGINA); paginar(0); }
    abreCard(li, true);
    li.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'center' });
    li.classList.add('is-realce');
    window.setTimeout(function () { li.classList.remove('is-realce'); }, 2000);
  }
  function abreCardDoEndereco() {
    var m = /^#local-(.+)$/.exec(window.location.hash);
    if (m) mostraNaLista(decodeURIComponent(m[1]));
  }
  window.addEventListener('hashchange', abreCardDoEndereco);
  paginar(0);
  abreCardDoEndereco();

  // "Ver na planta" na lista completa
  lista.addEventListener('click', function (e) {
    var abrir = e.target.closest('.local__abrir');
    if (abrir) { var li = abrir.closest('.local'); abreCard(li, !li.classList.contains('is-aberto')); return; }
    // Clique no card (fora dos botões) também abre e fecha os detalhes
    var card = e.target.closest('.local');
    if (card && !e.target.closest('button, a') && card.querySelector('.local__abrir')) {
      abreCard(card, !card.classList.contains('is-aberto'));
      return;
    }
    var b = e.target.closest('[data-ver-local]');
    if (!b) return;
    // Rola até a planta e só então escolhe a sala: o enquadramento depende de onde a planta
    // e o cartão do pé da tela ficam na tela, e antes da rolagem a sala parava embaixo do cartão
    var id = b.getAttribute('data-ver-local');
    var jaNoLugar = Math.abs(root.getBoundingClientRect().top - (parseFloat(getComputedStyle(root).scrollMarginTop) || 0)) < 2;
    root.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' });
    pilha = [];
    if (jaNoLugar) seleciona(id, true);
    else depoisDaRolagem(function () { seleciona(id, true); });
  });
  function depoisDaRolagem(fn) {
    var feito = false, tempo;
    function vai() {
      if (feito) return;
      feito = true;
      clearTimeout(tempo);
      window.removeEventListener('scrollend', vai);
      fn();
    }
    if (reduzMovimento) { vai(); return; }
    if ('onscrollend' in window) window.addEventListener('scrollend', vai);
    tempo = setTimeout(vai, 'onscrollend' in window ? 1200 : 700); // sem scrollend ou sem rolagem
  }

  /* ---------- Busca e destaques ---------- */
  // Enquanto a pessoa digita, a planta e a lista são redesenhadas só numa pausa da digitação
  // (num celular simples, redesenhar a cada letra deixava a digitação lenta)
  var tempoBusca;
  busca.addEventListener('input', function () {
    estado.busca = busca.value;
    estado.local = null;
    desenhaSelecao(null);
    clearTimeout(tempoBusca);
    tempoBusca = setTimeout(function () {
      atualizaEndereco();
      render();
    }, busca.value.trim() ? 150 : 0);
  });
  busca.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      // Número de sala primeiro; depois pessoa, laboratório ou serviço, e sala
      var q = normalize(estado.busca.trim()), r = salasDaBusca();
      var exata = r.filter(function (l) { return normalize(l.id) === q; })[0];
      var ps = pessoasDaBusca(), us = unidadesDaBusca();
      pilha = [];
      if (exata) seleciona(exata.id, true);
      else if (ps.length) selecionaPessoa(ps[0].id);
      else if (us.length) selecionaUnidade(us[0].id);
      else if (r.length) seleciona(r[0].id, true);
      else return;
      if (celular.matches) busca.blur();
    } else if (e.key === 'Escape' && celular.matches) {
      fechaFolha(); lupa.focus();
    }
  });
  botoesDestaque.forEach(function (b) {
    b.addEventListener('click', function () {
      var c = b.getAttribute('data-destaque'), i = estado.destaques.indexOf(c);
      if (i === -1) estado.destaques.push(c); else estado.destaques.splice(i, 1);
      estado.local = null;
      desenhaSelecao(null);
      atualizaEndereco();
      render();
    });
  });
  limpar.addEventListener('click', function () {
    estado.destaques = [];
    atualizaEndereco();
    render();
  });

  /* ---------- Endereço compartilhável ---------- */
  function atualizaEndereco() {
    if (!window.history.replaceState) return;
    var p = new URLSearchParams();
    if (estado.local) p.set('local', estado.local);
    if (estado.pessoa) p.set('pessoa', estado.pessoa);
    if (estado.unidade) p.set('unidade', estado.unidade);
    if (estado.entrada) p.set('entrada', estado.entrada);
    if (estado.piso && !estado.local && !estado.entrada && !estado.pessoa && !estado.unidade) p.set('andar', '1');
    if (estado.destaques.length) p.set('destaque', estado.destaques.join(','));
    var q = p.toString();
    window.history.replaceState(null, '', window.location.pathname + (q ? '?' + q : '') + window.location.hash);
  }
  function leEndereco() {
    var p = new URLSearchParams(window.location.search);
    var validas = botoesDestaque.map(function (b) { return b.getAttribute('data-destaque'); });
    estado.destaques = (p.get('destaque') || '').split(',').filter(function (c) { return validas.indexOf(c) !== -1; });
    var local = p.get('local'), entrada = p.get('entrada'), pessoa = p.get('pessoa'), unidade = p.get('unidade');
    if (p.get('andar') === '1') mudaPiso(1);
    if (local && porId[local]) {
      estado.local = local;
      mudaPiso(porId[local].andar);
      desenhaSelecao(local);
    } else if (pessoa && porPessoa[pessoa]) {
      var pp = porPessoa[pessoa];
      if (pp.sala) { mudaPiso(porId[pp.sala].andar); desenhaSelecao(pp.sala); }
      estado.pessoa = pessoa;
    } else if (unidade && porUnidade[unidade]) {
      var uu = porUnidade[unidade];
      if (uu.salas && uu.salas.length) { mudaPiso(porId[uu.salas[0]].andar); desenhaSelecao(uu.salas); }
      estado.unidade = unidade;
    } else if (entrada && porEntrada[entrada]) {
      mudaPiso(porEntrada[entrada].andar);
      estado.entrada = entrada;
      marcaEntrada(entrada);
    }
  }

  /* ---------- Ampliar ---------- */
  function initAmpliar() {
    var btn = root.querySelector('[data-ampliar]');
    var texto = btn.querySelector('[data-ampliar-texto]');
    var pedir = root.requestFullscreen || root.webkitRequestFullscreen;
    var sair = document.exitFullscreen || document.webkitExitFullscreen;
    function telaCheia() { return (document.fullscreenElement || document.webkitFullscreenElement) === root; }
    function marca(on) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      texto.textContent = on ? 'Reduzir' : 'Ampliar';
      btn.title = on ? 'Reduzir' : 'Ampliar';
    }
    function fixa(on) {
      root.classList.toggle('is-expanded', on);
      document.documentElement.classList.toggle('mapa-ampliado', on);
      marca(on);
    }
    btn.addEventListener('click', function () {
      if (root.classList.contains('is-expanded')) { fixa(false); return; }
      if (pedir) {
        if (telaCheia()) { sair.call(document); return; }
        var r = pedir.call(root);
        if (r && r.catch) r.catch(function () { fixa(true); });
      } else {
        fixa(true);
      }
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
      document.addEventListener(ev, function () { marca(telaCheia()); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('is-expanded')) { fixa(false); btn.focus(); }
    });
    btn.hidden = false;
  }

  // Tela estreita (celular em pé): a planta inteira ficaria uma faixa fina no quadro.
  // Começa preenchendo a altura, a partir da ponta esquerda; arrasta-se para os lados.
  // Refeita quando o quadro muda de tamanho (girar o celular), até a pessoa mexer na planta.
  var mexeu = false;
  function vistaInicial() {
    if (mexeu || estado.local || antesDeImprimir) return; // na impressão, fica a planta toda
    var r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // Todos os tamanhos começam no trecho da entrada principal, no mesmo zoom
    if (!angulo) { aplica(vistaPadrao()); return; }
    aplica(vistaCheia());
  }
  if (window.ResizeObserver) new ResizeObserver(vistaInicial).observe(svg);
  svg.addEventListener('pointerdown', function () { mexeu = true; });
  root.querySelector('[data-planta-controles]').addEventListener('click', function () { mexeu = true; });

  /* ---------- Computador: barra de busca fixa no topo ao rolar ---------- */
  // Quando a barra sai da tela, o cabeçalho do site sobe e a barra desce presa ao topo
  // (classe barra-fixa em <html>; animações em css/style.css). Volta ao subir até ela.
  var computador = window.matchMedia('(min-width: 1400px), (min-width: 1024px) and (hover: hover), (min-width: 1024px) and (pointer: fine)');
  var barraEl = root.querySelector('.explorador__barra');
  var topoBarra = null;
  function medeBarra() {
    if (document.documentElement.classList.contains('barra-fixa')) return;
    topoBarra = barraEl.getBoundingClientRect().top + window.scrollY;
    root.style.setProperty('--barra-h', barraEl.offsetHeight + 'px');
  }
  function verificaBarra() {
    if (topoBarra === null) medeBarra();
    var fixa = computador.matches && !ampliado() && !antesDeImprimir && window.scrollY > topoBarra;
    if (fixa !== document.documentElement.classList.contains('barra-fixa')) {
      if (fixa) medeBarra();
      document.documentElement.classList.toggle('barra-fixa', fixa);
    }
  }
  medeBarra(); // já na abertura: no computador, os botões e o painel ficam abaixo da barra
  window.addEventListener('scroll', verificaBarra, { passive: true });
  window.addEventListener('resize', function () { topoBarra = null; document.documentElement.classList.remove('barra-fixa'); verificaBarra(); });

  /* ---------- Impressão ---------- */
  // Antes de imprimir: tema claro, planta inteira e, com um local escolhido, a sala em foco
  // (classe imprime-local em <html>; o layout está em css/style.css, seção 10). Depois, volta tudo.
  var antesDeImprimir = null;
  function preparaImpressao() {
    if (antesDeImprimir) return;
    var html = document.documentElement;
    antesDeImprimir = { vb: vb, tema: html.getAttribute('data-theme'), piso: estado.piso, giro: anguloAlvo };
    paraAnimacao();
    window.cancelAnimationFrame(animGiro);
    aplicaGiro(0); // no papel, a planta na posição original
    html.removeAttribute('data-theme');
    // No papel, os dois andares como no desenho original
    svg.classList.remove('vista-0', 'vista-1');
    aplica(TODA);
    var l = estado.local && porId[estado.local];
    if (l) {
      // Uma sala: só o andar dela, enquadrado inteiro (o preserveAspectRatio centraliza na folha)
      var n = l.andar ? 1 : 0;
      svg.classList.add('vista-' + n, 'imprime-andar');
      var c = caixaDe(svg.querySelectorAll('.piso--' + n + ' .area, .piso--' + n + ' .andar__nome, .piso--' + n + ' .entrada'));
      var folga = 90;
      var caixa = { x: c.x0 - folga, y: c.y0 - folga, w: c.x1 - c.x0 + 2 * folga, h: c.y1 - c.y0 + 2 * folga };
      aplica(caixa);
      // A folha usa a largura toda; a altura segue o formato do andar (css/style.css, seção 10)
      root.style.setProperty('--imp-aspecto', String(caixa.w / caixa.h));
    }
    html.classList.toggle('imprime-local', !!l);
    svg.classList.toggle('imprime-foco', !!l);
    if (l) {
      Array.prototype.forEach.call(svg.querySelectorAll('[data-local="' + esc(l.id) + '"]'), function (a) {
        a.classList.add('is-foco');
      });
    }
    var sub = document.querySelector('[data-impressao-sub]');
    if (sub) {
      sub.textContent = (l ? 'Sala ' + l.id + ' · ' + andarDe(l) + ' · ' : '') + 'dqufpr.github.io/mapa · impresso em ' +
        new Date().toLocaleDateString('pt-BR');
    }
  }
  function desfazImpressao() {
    if (!antesDeImprimir) return;
    var html = document.documentElement;
    if (antesDeImprimir.tema) html.setAttribute('data-theme', antesDeImprimir.tema);
    mudaPiso(antesDeImprimir.piso);
    aplicaGiro(antesDeImprimir.giro);
    INTEIRA = caixaNoAngulo(antesDeImprimir.giro);
    aplica(antesDeImprimir.vb);
    html.classList.remove('imprime-local');
    svg.classList.remove('imprime-foco', 'imprime-andar');
    root.style.removeProperty('--imp-aspecto');
    Array.prototype.forEach.call(svg.querySelectorAll('.is-foco'), function (a) { a.classList.remove('is-foco'); });
    antesDeImprimir = null;
  }
  window.addEventListener('beforeprint', preparaImpressao);
  window.addEventListener('afterprint', desfazImpressao);
  // Safari antigo não tem beforeprint/afterprint
  var mqPrint = window.matchMedia && window.matchMedia('print');
  if (mqPrint && mqPrint.addListener) mqPrint.addListener(function (m) { if (m.matches) preparaImpressao(); else desfazImpressao(); });

  /* ---------- Início ---------- */
  root.querySelector('[data-planta-controles]').hidden = false;
  root.querySelector('[data-planta-dica]').hidden = false;
  initAmpliar();

  root.setAttribute('aria-busy', 'true');
  fetch(DADOS_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (json) {
      dados = json;
      dados.categorias.forEach(function (c) { nomesCat[c.id] = c.nome; });
      nomesCat.outros = nomesCat.outros || 'Outros';
      (dados.andares || []).forEach(function (a) { nomesAndar[a.id] = a.nome; });
      dados.pessoas = dados.pessoas || [];
      dados.unidades = dados.unidades || [];
      dados.pessoas.forEach(function (p) { p._busca = textoPessoa(p); porPessoa[p.id] = p; });
      dados.unidades.forEach(function (u) { u.salas = u.salas || []; u._busca = textoUnidade(u); porUnidade[u.id] = u; });
      dados.locais.forEach(function (l) {
        l.pessoas = l.pessoas || [];
        l.unidades = l.unidades || [];
        l._sala = textoSala(l);
        l._busca = textoBusca(l);
        porId[l.id] = l;
      });
      var termos = {
        entrada: 'entrada porta acesso',
        rampa: 'rampa acessibilidade acessivel cadeira de rodas',
        escada: 'escada escadas subir descer degraus primeiro andar terreo'
      };
      pontos().forEach(function (e) {
        var extra = e.tipo === 'entrada' ? (e.id === 'principal' ? ' frente' : ' fundos') : '';
        e._busca = normalize(e.nome + ' ' + (termos[e.tipo] || '') + extra + ' ' + e.descricao);
        porEntrada[e.id] = e;
      });
      montaEntradasRapidas();
      vistaInicial(); // depois do carregamento: a página já tem o tamanho final
      leEndereco();
      render();
      if (estado.entrada) enquadraEntrada(estado.entrada);
      if (!estado.local && !estado.pessoa && !estado.unidade && !estado.entrada) chamaEntradaPrincipal();
      if (estado.local) enquadra(estado.local); // depois do render: no celular, o cartão já tem altura
      if (estado.pessoa && porPessoa[estado.pessoa].sala) enquadra(porPessoa[estado.pessoa].sala);
      if (estado.unidade && porUnidade[estado.unidade].salas.length) enquadraNos(areasDe(salasNoAndar(porUnidade[estado.unidade])));
    })
    .catch(function (err) {
      console.error('Mapa Digital: erro ao carregar ' + DADOS_URL, err);
      painel.textContent = '';
      var a = el('div', 'alert alert--danger');
      a.setAttribute('role', 'alert');
      var p = el('p');
      p.appendChild(el('strong', '', 'Não foi possível carregar os locais.'));
      p.appendChild(document.createTextNode(' A lista completa continua disponível abaixo da planta.'));
      a.appendChild(p);
      painel.appendChild(a);
    })
    .then(function () { root.removeAttribute('aria-busy'); });
})();
