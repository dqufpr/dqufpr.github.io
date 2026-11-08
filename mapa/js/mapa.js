/* mapa.js — planta interativa do Mapa Digital (/mapa/).
   Carregue com defer: <script src="/mapa/js/mapa.js" defer></script>

   A planta (SVG) e a lista de locais já vêm no HTML, geradas por scripts/gerar_mapa.py.
   Este script lê /mapa/dados/locais.json para o painel de detalhes e liga:
   - zoom e arraste na planta (mouse, toque e teclado pelos botões);
   - clique numa sala → contorno na planta + detalhes no painel;
   - busca e destaque por categoria (filtram a planta e a lista);
   - endereço compartilhável: ?local=45-B e ?destaque=sala-aula,servico;
   - botão Ampliar (tela cheia do navegador ou, sem ela, quadro fixo sobre a página);
   - compartilhar o local exibido (WhatsApp, Instagram e folha de compartilhar do sistema);
   - lista de locais recolhida (acordeão) e "Mostrar todos os locais" no painel;
   - tablet e desktop (500px+): painel flutuando à direita da planta; enquadramentos
     descontam a faixa que ele cobre;
   - no celular (até 499px): busca recolhida num botão e detalhes num cartão fixo no pé
     da tela (classes mapa-js, is-buscando e tem-folha). */
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
  var selecao = root.querySelector('[data-planta-selecao]');
  var painel = root.querySelector('[data-painel-corpo]');
  var busca = root.querySelector('[data-busca]');
  var limpar = root.querySelector('[data-limpar]');
  var lista = document.querySelector('[data-lista]');
  var listaStatus = document.querySelector('[data-lista-status]');
  var botoesDestaque = Array.prototype.slice.call(root.querySelectorAll('[data-destaque]'));
  var painelEl = root.querySelector('[data-painel]');
  var lupa = root.querySelector('[data-busca-abrir]');
  var listaAlternar = document.querySelector('[data-lista-alternar]');
  // Mesmo limite do @media de css/style.css
  var celular = window.matchMedia('(max-width: 499.98px)');
  document.documentElement.classList.add('mapa-js');

  var dados = null;               // conteúdo de locais.json
  var porId = {};                 // id do local → objeto do local
  var nomesCat = {};              // id da categoria → nome
  var estado = { local: null, busca: '', destaques: [], todos: false };

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
  var INTEIRA = { x: vb0.x, y: vb0.y, w: vb0.width, h: vb0.height };
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
  function zoomEm(f, px, py) {
    var w = Math.min(Math.max(vb.w * f, ZOOM_MIN_W), Math.max(INTEIRA.w * 1.2, vistaCheia().w * 1.1));
    f = w / vb.w;
    aplica({ x: px - (px - vb.x) * f, y: py - (py - vb.y) * f, w: vb.w * f, h: vb.h * f });
  }
  var fimAnimacao = null;
  function paraAnimacao() {
    window.cancelAnimationFrame(animacao);
    window.clearTimeout(fimAnimacao);
  }
  function animaPara(alvo) {
    paraAnimacao();
    // Sem animação com movimento reduzido ou com a aba oculta
    if (reduzMovimento || document.hidden) { aplica(alvo); return; }
    var ini = { x: vb.x, y: vb.y, w: vb.w, h: vb.h }, t0 = performance.now(), D = 400;
    function passo(agora) {
      var k = Math.min(1, (agora - t0) / D), e = 1 - Math.pow(1 - k, 3);
      aplica({ x: ini.x + (alvo.x - ini.x) * e, y: ini.y + (alvo.y - ini.y) * e,
        w: ini.w + (alvo.w - ini.w) * e, h: ini.h + (alvo.h - ini.h) * e });
      if (k < 1) animacao = window.requestAnimationFrame(passo);
    }
    animacao = window.requestAnimationFrame(passo);
    // Se o navegador pausar os quadros (janela minimizada), chega ao destino mesmo assim
    fimAnimacao = window.setTimeout(function () { paraAnimacao(); aplica(alvo); }, D + 100);
  }
  // Enquadra as áreas de um local, com folga em volta
  function enquadra(id) {
    var areas = svg.querySelectorAll('.area[data-local="' + esc(id) + '"]');
    if (!areas.length) return;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    Array.prototype.forEach.call(areas, function (a) {
      var b = a.getBBox();
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    });
    var r = svg.getBoundingClientRect(), prop = r.height / r.width || INTEIRA.h / INTEIRA.w;
    var w = Math.max((x1 - x0) * 4, 1600), h = w * prop;
    if (h < (y1 - y0) * 2) { h = (y1 - y0) * 2; w = h / prop; }
    var f = fracaoVisivel(), fx = fracaoVisivelX();
    animaPara({ x: (x0 + x1) / 2 - w * fx / 2, y: (y0 + y1) / 2 - h * f / 2, w: w, h: h });
  }
  // Tablet e desktop: onde começa, na tela, o painel que flutua sobre a direita da planta
  function limiteDireito() {
    var r = svg.getBoundingClientRect();
    if (celular.matches || !painelEl.offsetParent) return r.right;
    return Math.max(r.left + 120, Math.min(r.right, painelEl.getBoundingClientRect().left - 12));
  }
  function fracaoVisivelX() {
    var r = svg.getBoundingClientRect();
    return r.width ? (limiteDireito() - r.left) / r.width : 1;
  }
  // A planta inteira entre os botões de zoom e o painel (o viewBox cobre o quadro todo)
  function vistaCheia() {
    var r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return INTEIRA;
    var esq = celular.matches ? 0 : 60, vw = limiteDireito() - r.left - esq;
    var s = Math.min(vw / INTEIRA.w, r.height / INTEIRA.h);
    var w = r.width / s, h = r.height / s;
    return { x: INTEIRA.x - esq / s - (vw / s - INTEIRA.w) / 2, y: INTEIRA.y - (h - INTEIRA.h) / 2, w: w, h: h };
  }
  // Onde termina, na tela, a parte da planta que o cartão fixo não cobre
  function limiteVisivel() {
    var r = svg.getBoundingClientRect();
    if (!celular.matches || !root.classList.contains('tem-folha')) return r.bottom;
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
    var lim = limiteVisivel(), limX = limiteDireito(), folga = 16, dx = 0, dy = 0;
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
    zoomEm(Math.exp(e.deltaY * 0.0015), p.x, p.y);
  }, { passive: false });

  var ponteiros = new Map(), movido = 0, alvoInicial = null, pinca = null;
  svg.addEventListener('pointerdown', function (e) {
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
        var area = alvoInicial.closest && alvoInicial.closest('.area');
        if (area) seleciona(area.getAttribute('data-local'), false);
      }
      alvoInicial = null;
    }
  }
  svg.addEventListener('pointerup', solta);
  svg.addEventListener('pointercancel', solta);

  root.querySelector('[data-zoom-mais]').addEventListener('click', function () { zoomEm(ZOOM_PASSO, vb.x + vb.w / 2, vb.y + vb.h / 2); });
  root.querySelector('[data-zoom-menos]').addEventListener('click', function () { zoomEm(1 / ZOOM_PASSO, vb.x + vb.w / 2, vb.y + vb.h / 2); });
  root.querySelector('[data-zoom-inteira]').addEventListener('click', function () { animaPara(vistaCheia()); });

  /* ---------- Filtro: busca + destaques ---------- */
  function textoBusca(l) {
    var partes = [l.id, (l.categorias || []).map(function (c) { return nomesCat[c]; }).join(' ')];
    l.itens.forEach(function (i) { partes.push(i.nome, i.sigla, i.descricao); });
    return normalize(partes.join(' '));
  }
  function combina(l) {
    var q = normalize(estado.busca.trim());
    if (estado.destaques.length && !l.categorias.some(function (c) { return estado.destaques.indexOf(c) !== -1; })) return false;
    if (!q) return true;
    if (normalize(l.id) === q || normalize(l.id).indexOf(q) === 0) return true;
    return l._busca.indexOf(q) !== -1;
  }
  function filtroAtivo() { return !!(estado.busca.trim() || estado.destaques.length); }

  function resultados() {
    return dados.locais.filter(combina);
  }

  function aplicaFiltro() {
    var ativo = filtroAtivo();
    var ok = {};
    if (ativo) resultados().forEach(function (l) { ok[l.id] = true; });
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
    listaStatus.textContent = ativo
      ? (visiveis ? visiveis + (visiveis === 1 ? ' local' : ' locais') + ' de ' + dados.locais.length + '.' : 'Nenhum local encontrado.')
      : '';
    botoesDestaque.forEach(function (b) {
      b.setAttribute('aria-pressed', estado.destaques.indexOf(b.getAttribute('data-destaque')) !== -1 ? 'true' : 'false');
    });
    limpar.hidden = !estado.destaques.length;
  }

  /* ---------- Seleção ---------- */
  function desenhaSelecao(id) {
    selecao.textContent = '';
    if (!id) return;
    Array.prototype.forEach.call(svg.querySelectorAll('.area[data-local="' + esc(id) + '"]'), function (a) {
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      p.setAttribute('points', a.getAttribute('points'));
      selecao.appendChild(p);
    });
  }

  function seleciona(id, enquadrar) {
    if (!porId[id]) return;
    estado.local = id;
    desenhaSelecao(id);
    atualizaEndereco();
    render(); // antes de enquadrar: no celular, o cartão já ocupa o pé da tela
    if (enquadrar) enquadra(id); else garanteVisivel(id);
  }
  function desseleciona() {
    estado.local = null;
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
    var sub = subtitulo(l);
    if (sub) t.appendChild(el('span', 'painel__item-sub', sub));
    b.appendChild(t);
    li.appendChild(b);
    return li;
  }
  function titulo(l) {
    if (!l.itens.length) return 'Sem informações';
    var profs = l.itens.every(function (i) { return i.categoria === 'sala-prof'; });
    if (profs) return l.itens.length > 1 ? 'Sala de professores' : 'Sala de professor';
    // O primeiro item dá nome ao local (mesma regra de scripts/gerar_mapa.py)
    return l.itens.filter(function (i) { return i.categoria !== 'sala-prof'; })[0].nome;
  }
  function subtitulo(l) {
    var profs = l.itens.length && l.itens.every(function (i) { return i.categoria === 'sala-prof'; });
    if (profs) return l.itens.map(function (i) { return i.nome; }).join(', ');
    return l.categorias.map(function (c) { return nomesCat[c]; }).join(' · ');
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
    var r = resultados();
    painel.appendChild(botaoFechar('Fechar resultados'));
    painel.appendChild(el('p', 'painel__eyebrow', estado.busca.trim() ? 'Resultado da busca' : 'Destaques'));
    painel.appendChild(el('h2', 'painel__titulo', r.length + (r.length === 1 ? ' local encontrado' : ' locais encontrados')));
    if (!r.length) {
      painel.appendChild(el('p', 'painel__texto', 'Nada encontrado. Tente o número da sala, parte do nome ou a sigla.'));
      return;
    }
    var ul = el('ul', 'painel__lista');
    r.forEach(function (l) { ul.appendChild(botaoLocal(l)); });
    painel.appendChild(ul);
  }

  function renderLocal() {
    var l = porId[estado.local];
    painel.appendChild(botaoFechar('Fechar detalhes da sala ' + l.id));
    var voltar = el('button', 'btn btn--ghost btn--sm painel__voltar', '← Voltar');
    voltar.type = 'button';
    voltar.setAttribute('data-voltar', '');
    painel.appendChild(voltar);

    var cab = el('div', 'painel__cabeca');
    cab.appendChild(caixaNumero(l));
    var tt = el('div', 'painel__cabeca-txt');
    tt.appendChild(el('p', 'painel__eyebrow', 'Sala ' + l.id + ' · ' + l.categorias.map(function (c) { return nomesCat[c]; }).join(' · ')));
    tt.appendChild(el('h2', 'painel__titulo', titulo(l)));
    cab.appendChild(tt);
    painel.appendChild(cab);

    if (!l.itens.length) {
      painel.appendChild(el('p', 'painel__texto', 'Ainda não há informações sobre este local.'));
    } else {
      var ul = el('ul', 'painel__itens');
      l.itens.forEach(function (i) {
        var li = el('li');
        var nome = el('p', 'painel__item-nome', i.nome);
        if (i.sigla && i.nome.indexOf(i.sigla) === -1) {
          nome.appendChild(document.createTextNode(' '));
          nome.appendChild(el('span', 'badge', i.sigla));
        }
        li.appendChild(nome);
        if (i.descricao) li.appendChild(el('p', 'painel__item-sub', i.descricao));
        ul.appendChild(li);
      });
      painel.appendChild(ul);
    }

    var acoes = el('div', 'painel__acoes');
    var centra = el('button', 'btn btn--secondary btn--sm', 'Centralizar na planta');
    centra.type = 'button';
    centra.setAttribute('data-centralizar', '');
    acoes.appendChild(centra);
    var link = el('a', 'btn btn--ghost btn--sm', 'Ver na lista');
    link.href = '#local-' + l.id;
    link.setAttribute('data-ver-lista', l.id);
    acoes.appendChild(link);
    painel.appendChild(acoes);
    painel.appendChild(blocoCompartilhar(l));
  }

  /* ---------- Compartilhar o local exibido ---------- */
  function urlLocal(l) {
    return window.location.origin + window.location.pathname + '?local=' + encodeURIComponent(l.id);
  }
  function textoLocal(l) { return 'Sala ' + l.id + ' · ' + titulo(l) + ' | Mapa Digital, Química UFPR'; }
  // Ícones de traço (currentColor), no mesmo estilo do sprite do site
  var ICONES = {
    whatsapp: ['M3.5 20.5l1.2-4.1A8.6 8.6 0 1 1 8 19.5z',
      'M9.2 8.3c.3-.4.8-.4 1 0l.7 1.5c.1.3 0 .6-.2.8l-.5.5a5.6 5.6 0 0 0 2.7 2.7l.5-.5c.2-.2.5-.3.8-.2l1.5.7c.4.2.4.7 0 1-.6.6-1.4.9-2.2.7a7.6 7.6 0 0 1-5-5c-.2-.8.1-1.6.7-2.2z'],
    instagram: ['M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5z',
      'M12 8.2a3.8 3.8 0 1 0 0 7.6a3.8 3.8 0 1 0 0-7.6z', 'M17.3 6.7h.01'],
    enviar: ['M12 3v12', 'M7.5 7.5L12 3l4.5 4.5', 'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7']
  };
  function icone(nome) {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.setAttribute('class', 'icon painel__share-ico painel__share-ico--' + nome);
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    ICONES[nome].forEach(function (d) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      s.appendChild(p);
    });
    return s;
  }
  function blocoCompartilhar(l) {
    var box = el('div', 'painel__compartilhar');
    box.appendChild(el('p', 'painel__eyebrow', 'Compartilhar este local'));
    var row = el('div', 'painel__share');
    var wa = el('a', 'btn btn--secondary btn--sm');
    wa.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(textoLocal(l) + '\n' + urlLocal(l));
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.appendChild(icone('whatsapp'));
    wa.appendChild(document.createTextNode('WhatsApp'));
    row.appendChild(wa);
    [['instagram', 'Instagram'], ['enviar', 'Enviar']].forEach(function (o) {
      var b = el('button', 'btn btn--secondary btn--sm');
      b.type = 'button';
      b.setAttribute('data-compartilhar', o[0]);
      b.appendChild(icone(o[0]));
      b.appendChild(document.createTextNode(o[1]));
      row.appendChild(b);
    });
    box.appendChild(row);
    var st = el('p', 'painel__share-status');
    st.setAttribute('role', 'status');
    st.setAttribute('data-share-status', '');
    box.appendChild(st);
    return box;
  }
  function avisaShare(msg) {
    var st = painel.querySelector('[data-share-status]');
    if (st) st.textContent = msg;
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
    var l = porId[estado.local];
    if (!l) return;
    var url = urlLocal(l), dadosShare = { title: 'Mapa Digital · Sala ' + l.id, text: textoLocal(l), url: url };
    var podeShare = !!navigator.share && (!navigator.canShare || navigator.canShare(dadosShare));
    if (tipo === 'instagram') {
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

  function render() {
    aplicaFiltro();
    painel.textContent = '';
    if (estado.local) renderLocal();
    else if (filtroAtivo()) renderResultados();
    else renderVisaoGeral();
    // Celular: o cartão fixo aparece com uma sala escolhida ou uma busca digitada.
    // Só com destaques, a planta fica livre (as cores dos botões servem de legenda).
    var folha = !!(estado.local || estado.busca.trim());
    if (folha && !root.classList.contains('tem-folha')) painelEl.scrollTop = 0;
    root.classList.toggle('tem-folha', folha);
  }

  // Fechar o cartão: tira a seleção e a busca
  function fechaFolha() {
    estado.local = null;
    desenhaSelecao(null);
    if (estado.busca) { estado.busca = ''; busca.value = ''; }
    abreBusca(false);
    atualizaEndereco();
    render();
  }

  painel.addEventListener('click', function (e) {
    var t = e.target.closest('[data-ir], [data-voltar], [data-centralizar], [data-fechar], [data-ver-lista], [data-todos], [data-compartilhar]');
    if (!t) return;
    if (t.hasAttribute('data-compartilhar')) {
      compartilha(t.getAttribute('data-compartilhar'));
    } else if (t.hasAttribute('data-todos')) {
      estado.todos = !estado.todos;
      render();
      var b = painel.querySelector('[data-todos]');
      if (b) b.focus();
    } else if (t.hasAttribute('data-ir')) seleciona(t.getAttribute('data-ir'), true);
    else if (t.hasAttribute('data-voltar')) desseleciona();
    else if (t.hasAttribute('data-centralizar')) enquadra(estado.local);
    else if (t.hasAttribute('data-fechar')) fechaFolha();
    else if (t.hasAttribute('data-ver-lista')) {
      e.preventDefault();
      e.stopPropagation(); // senão o clique "fora" fecharia o card que vai abrir
      var id = t.getAttribute('data-ver-lista');
      abreLista(true);
      abreCard(document.getElementById('local-' + id), true);
      if (celular.matches) fechaFolha(); // o cartão cobriria a lista
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

  function abreLista(on) {
    lista.classList.toggle('is-aberta', on);
    listaAlternar.setAttribute('aria-expanded', on ? 'true' : 'false');
    listaAlternar.textContent = on ? 'Ocultar a lista' : 'Mostrar a lista (' + lista.children.length + ' locais)';
  }
  listaAlternar.addEventListener('click', function () { abreLista(!lista.classList.contains('is-aberta')); });
  abreLista(false);
  abreCardDoEndereco();
  listaAlternar.hidden = false;

  // Cards da lista: o nome abre e fecha os detalhes. O card aberto cresce por cima dos
  // de baixo (as linhas da grade têm altura fixa, ver css/style.css); um aberto por vez.
  var cardAberto = null;
  function alturaCheia(li) { return li.scrollHeight + li.offsetHeight - li.clientHeight; } // conteúdo + bordas
  function abreCard(li, on) {
    if (!li || li.classList.contains('is-aberto') === on) return;
    li.querySelector('.local__abrir').setAttribute('aria-expanded', on ? 'true' : 'false');
    window.clearTimeout(li._fim);
    if (on) {
      if (cardAberto) abreCard(cardAberto, false);
      li.classList.remove('is-fechando');
      li.classList.add('is-aberto');
      li.style.height = alturaCheia(li) + 'px'; // anima da altura fixa até a do conteúdo
      cardAberto = li;
    } else {
      li.classList.remove('is-aberto');
      li.classList.add('is-fechando'); // continua por cima enquanto encolhe
      li.style.height = '';
      li._fim = window.setTimeout(function () { li.classList.remove('is-fechando'); }, 320);
      if (cardAberto === li) cardAberto = null;
    }
  }
  // Clique fora ou Esc fecham o card aberto
  document.addEventListener('click', function (e) {
    if (cardAberto && !cardAberto.contains(e.target)) abreCard(cardAberto, false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cardAberto) {
      var b = cardAberto.querySelector('.local__abrir');
      abreCard(cardAberto, false);
      b.focus();
    }
  });
  // A largura mudou (girar o tablet): reajusta a altura do card aberto
  window.addEventListener('resize', function () {
    if (!cardAberto) return;
    cardAberto.style.height = 'auto';
    cardAberto.style.height = alturaCheia(cardAberto) + 'px';
  });
  function abreCardDoEndereco() {
    var m = /^#local-(.+)$/.exec(window.location.hash);
    if (m) { abreLista(true); abreCard(document.getElementById('local-' + decodeURIComponent(m[1])), true); }
  }
  window.addEventListener('hashchange', abreCardDoEndereco);

  // "Ver na planta" na lista completa
  lista.addEventListener('click', function (e) {
    var abrir = e.target.closest('.local__abrir');
    if (abrir) { var li = abrir.closest('.local'); abreCard(li, !li.classList.contains('is-aberto')); return; }
    var b = e.target.closest('[data-ver-local]');
    if (!b) return;
    seleciona(b.getAttribute('data-ver-local'), true);
    root.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- Busca e destaques ---------- */
  busca.addEventListener('input', function () {
    estado.busca = busca.value;
    estado.local = null;
    desenhaSelecao(null);
    atualizaEndereco();
    render();
  });
  busca.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var r = resultados();
      if (r.length) { seleciona(r[0].id, true); if (celular.matches) busca.blur(); }
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
    if (estado.destaques.length) p.set('destaque', estado.destaques.join(','));
    var q = p.toString();
    window.history.replaceState(null, '', window.location.pathname + (q ? '?' + q : '') + window.location.hash);
  }
  function leEndereco() {
    var p = new URLSearchParams(window.location.search);
    var validas = botoesDestaque.map(function (b) { return b.getAttribute('data-destaque'); });
    estado.destaques = (p.get('destaque') || '').split(',').filter(function (c) { return validas.indexOf(c) !== -1; });
    var local = p.get('local');
    if (local && porId[local]) {
      estado.local = local;
      desenhaSelecao(local);
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
    if (mexeu || estado.local) return;
    var r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (r.width / r.height > (INTEIRA.w / INTEIRA.h) * 0.6) aplica(vistaCheia());
    else aplica({ x: INTEIRA.x, y: INTEIRA.y, w: INTEIRA.h * r.width / r.height, h: INTEIRA.h });
  }
  if (window.ResizeObserver) new ResizeObserver(vistaInicial).observe(svg);
  svg.addEventListener('pointerdown', function () { mexeu = true; });
  root.querySelector('[data-planta-controles]').addEventListener('click', function () { mexeu = true; });

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
      dados.locais.forEach(function (l) { l._busca = textoBusca(l); porId[l.id] = l; });
      vistaInicial(); // depois do carregamento: a página já tem o tamanho final
      leEndereco();
      render();
      if (estado.local) enquadra(estado.local); // depois do render: no celular, o cartão já tem altura
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
