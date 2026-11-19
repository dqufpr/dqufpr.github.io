/* hero-planta.js — luzes sobre a planta do térreo no fundo da abertura da página inicial.
   Feixes percorrem os corredores a partir das entradas e salas acendem e apagam.
   A faixa que varre os contornos é só CSS (css/pages.css). Com "menos movimento", nada se move;
   fora da tela ou com a aba escondida, tudo pausa. */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var svg = document.querySelector('.hero-planta');
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    var menos = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Celular: mostra o meio da planta (corredores e cruzamentos), em vez do canto direito
    var estreito = window.matchMedia ? window.matchMedia('(max-width: 639.98px)') : null;
    function enquadra() { svg.setAttribute('preserveAspectRatio', estreito && estreito.matches ? 'xMidYMid slice' : 'xMaxYMid slice'); }
    enquadra();
    if (estreito && estreito.addEventListener) estreito.addEventListener('change', enquadra);

    if (menos) return;

    // Rotas pelo eixo dos corredores do térreo (coordenadas do desenho da planta)
    var rotas = [
      [[4820, 2420], [4820, 905], [1355, 905]],          // entrada principal → corredor de cima
      [[2325, 640], [2325, 1950], [4900, 1950]],         // entrada C → corredor do meio
      [[6555, 905], [4820, 905], [4820, 1950], [820, 1950]],
      [[820, 1950], [2325, 1950], [2325, 905], [6555, 905]],
      [[4820, 640], [4820, 1950], [4820, 2420]]
    ];
    var grupo = svg.querySelector('.hero-planta__rotas');
    var animacoes = [];
    if (grupo && grupo.animate) {
      rotas.forEach(function (r, i) {
        var d = 'M' + r.map(function (p) { return p.join(' '); }).join('L');
        ['halo', 'meio', 'nucleo'].forEach(function (tipo) {
          var el = document.createElementNS(NS, 'path');
          el.setAttribute('d', d);
          el.setAttribute('class', 'hero-planta__rota hero-planta__rota--' + tipo);
          grupo.appendChild(el);
          var L = el.getTotalLength();
          var cauda = { halo: 700, meio: 600, nucleo: 520 }[tipo];
          el.style.strokeDasharray = cauda + ' ' + (L + cauda);
          el.style.strokeDashoffset = cauda;
          animacoes.push(el.animate(
            [{ strokeDashoffset: cauda }, { strokeDashoffset: -L }],
            { duration: (L + cauda) / 0.9, delay: i * 1700, endDelay: 2500, iterations: Infinity, easing: 'cubic-bezier(.45,.05,.55,.95)' }
          ));
        });
      });
    }

    // Salas acendendo e apagando
    var salas = Array.prototype.slice.call(svg.querySelectorAll('.hero-planta__sala'));
    function pisca() {
      var s = salas[Math.floor(Math.random() * salas.length)];
      s.classList.add('is-acesa');
      setTimeout(function () { s.classList.remove('is-acesa'); }, 2600 + Math.random() * 2000);
    }
    var timer = null;
    function liga() { if (!timer && salas.length) { for (var k = 0; k < 4; k++) pisca(); timer = setInterval(pisca, 700); } }
    function desliga() { clearInterval(timer); timer = null; }

    // Só anima com a abertura à vista e a aba aberta: poupa processador e bateria
    var visivel = true;
    function atualiza() {
      var roda = visivel && !document.hidden;
      svg.classList.toggle('is-pausada', !roda);
      animacoes.forEach(function (a) { if (roda) a.play(); else a.pause(); });
      if (roda) liga(); else desliga();
    }
    document.addEventListener('visibilitychange', atualiza);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entradas) {
        visivel = entradas[0].isIntersecting;
        atualiza();
      }).observe(svg);
    }
    atualiza();
  });
})();
