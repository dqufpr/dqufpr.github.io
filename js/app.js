/* app.js — interações comuns a todas as páginas do DQ Digital (tema, menu, link ativo, ano do rodapé).
   Carregue com defer: <script src="/js/app.js" defer></script>
   Os módulos (/mapa/, …) usam este mesmo arquivo. */
(function () {
  'use strict';
  var root = document.documentElement;
  var STORAGE_KEY = 'dq-theme';

  /* ---------- Tema: claro, escuro ou seguir o sistema ---------- */
  // O modo inicial é aplicado por theme-init.js, no <head>.
  var systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function getMode() {
    var m = root.getAttribute('data-theme-mode');
    return m === 'light' || m === 'dark' ? m : 'system';
  }

  function applyTheme() {
    var mode = getMode();
    var dark = mode === 'dark' || (mode === 'system' && !!systemDark && systemDark.matches);
    if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    document.querySelectorAll('[data-theme-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-theme-set') === mode ? 'true' : 'false');
    });
  }

  function setThemeMode(mode) {
    if (mode !== 'light' && mode !== 'dark') mode = 'system';
    root.setAttribute('data-theme-mode', mode);
    try {
      if (mode === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) { /* ignora: a escolha vale só nesta página */ }
    applyTheme();
  }

  // No modo "sistema", acompanha a troca do sistema operacional com a página aberta
  if (systemDark) {
    var onSystemChange = function () { if (getMode() === 'system') applyTheme(); };
    if (systemDark.addEventListener) systemDark.addEventListener('change', onSystemChange);
    else if (systemDark.addListener) systemDark.addListener(onSystemChange);
  }

  /* ---------- Menu do celular ---------- */
  function setMenu(open) {
    var btn = document.querySelector('[data-menu-toggle]');
    var nav = document.getElementById('site-nav');
    if (!btn || !nav) return;
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }

  function isMenuOpen() {
    var nav = document.getElementById('site-nav');
    return !!nav && nav.classList.contains('is-open');
  }

  /* ---------- Link da página atual ---------- */
  // Marca com aria-current o item do menu cujo endereço corresponde à página aberta.
  function normalize(path) {
    return path.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  }

  function markCurrentLink() {
    var here = normalize(window.location.pathname);
    document.querySelectorAll('#site-nav a').forEach(function (a) {
      var target = normalize(new URL(a.getAttribute('href'), window.location.href).pathname);
      // Itens de módulo (ex.: /mapa) também ficam ativos nas subpáginas (/mapa/sala-de-aula)
      var match = target === here || (target !== '/' && here.indexOf(target + '/') === 0);
      if (match) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme();
    markCurrentLink();

    // Menu de tema
    var themeMenu = document.querySelector('.theme-menu');
    if (themeMenu) {
      // Um menu de cada vez: abrir o de tema fecha o de navegação
      themeMenu.addEventListener('toggle', function () { if (themeMenu.open) setMenu(false); });
    }
    document.querySelectorAll('[data-theme-set]').forEach(function (b) {
      b.addEventListener('click', function () {
        setThemeMode(b.getAttribute('data-theme-set'));
        if (themeMenu) { themeMenu.open = false; themeMenu.querySelector('summary').focus(); }
      });
    });

    // Menu do celular
    var menuBtn = document.querySelector('[data-menu-toggle]');
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        setMenu(!isMenuOpen());
        if (themeMenu) themeMenu.open = false;
      });
      document.querySelectorAll('#site-nav a').forEach(function (a) {
        a.addEventListener('click', function () { setMenu(false); });
      });
    }

    // Fecha menus ao clicar fora
    document.addEventListener('click', function (e) {
      if (themeMenu && themeMenu.open && !themeMenu.contains(e.target)) themeMenu.open = false;
      var header = document.querySelector('.site-header');
      if (isMenuOpen() && header && !header.contains(e.target)) setMenu(false);
    });

    // Esc fecha menus e devolve o foco ao botão que os abriu
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (themeMenu && themeMenu.open) { themeMenu.open = false; themeMenu.querySelector('summary').focus(); }
      if (isMenuOpen()) { setMenu(false); if (menuBtn) menuBtn.focus(); }
    });

    // Ao passar para o desktop, o menu do celular não fica preso aberto
    if (window.matchMedia) {
      var desktop = window.matchMedia('(min-width: 960px)');
      var onResize = function () { if (desktop.matches) setMenu(false); };
      if (desktop.addEventListener) desktop.addEventListener('change', onResize);
      else if (desktop.addListener) desktop.addListener(onResize);
    }

    // Ano do rodapé
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  });

  window.dqSetTheme = setThemeMode;
})();
