/* locais.js — lista de locais do Mapa Digital, lida da planilha do Google.
   Uso: <div class="locais" data-locais="NomeDaAba"> com, dentro dele,
   [data-locais-busca] (campo de busca), [data-locais-status] e [data-locais-lista].
   Acrescente data-locais-categoria para mostrar o nome da categoria em cada local (mapa completo).
   Carregue com defer: <script src="/mapa/js/locais.js" defer></script>

   Planilha: cada aba tem as colunas id · nome · abrev · local · desc · tipo (linha 1 = cabeçalho).
   A planilha precisa estar compartilhada como "qualquer pessoa com o link pode ver". */
(function () {
  'use strict';

  var SHEET_ID = '1ym99Rtiw74VlWNmVA2PzIIkSxbZ54mT9XkKgUuASybQ';

  // Coluna "tipo" da planilha → classe de cor (global.css) e nome da categoria
  var TIPOS = {
    salaaula: { loc: 'sala-aula', nome: 'Sala de aula' },
    salaprof: { loc: 'sala-prof', nome: 'Sala de professor' },
    labensino: { loc: 'lab-ensino', nome: 'Laboratório de ensino' },
    labpesquisa: { loc: 'lab-pesquisa', nome: 'Laboratório de pesquisa' },
    servico: { loc: 'servico', nome: 'Serviço' },
    banheiro: { loc: 'banheiro', nome: 'Banheiro' },
    outros: { loc: 'outros', nome: 'Outros' }
  };

  function sheetUrl(aba) {
    return 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
      '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(aba);
  }

  // A resposta vem como "/*O_o*/ google.visualization.Query.setResponse({...});"
  function parseGviz(text) {
    var m = text.match(/setResponse\(([\s\S]*)\)\s*;?\s*$/);
    if (!m) throw new Error('Formato de resposta inesperado');
    var data = JSON.parse(m[1]);
    if (data.status === 'error' || !data.table || !data.table.rows) throw new Error('Aba não encontrada na planilha');
    return data.table.rows;
  }

  function cell(row, i) {
    var c = row.c && row.c[i];
    if (!c || c.v === null || c.v === undefined) return '';
    return String(c.f !== undefined && c.f !== null ? c.f : c.v).trim();
  }

  function toLocal(row) {
    var tipo = cell(row, 5).toLowerCase();
    return {
      id: cell(row, 0),
      nome: cell(row, 1),
      abrev: cell(row, 2),
      local: cell(row, 3),
      desc: cell(row, 4),
      tipo: TIPOS[tipo] || TIPOS.outros
    };
  }

  // Busca sem diferenciar maiúsculas nem acentos
  function normalize(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  // Monta o item com textContent: o conteúdo da planilha nunca vira HTML
  function renderItem(l, mostrarCategoria) {
    var li = el('li', 'local loc--' + l.tipo.loc);

    var num = el('span', 'local__num');
    num.appendChild(el('span', 'visually-hidden', 'Número no mapa: '));
    num.appendChild(document.createTextNode(l.id || '–'));
    li.appendChild(num);

    var body = el('div', 'local__body');
    body.appendChild(el('h3', 'local__nome', l.nome));

    var meta = [];
    if (mostrarCategoria) meta.push(el('span', 'local__cat', l.tipo.nome));
    // A sigla já aparece em nomes como "Sala de aula - PQ07"; só repete quando traz informação nova
    if (l.abrev && normalize(l.nome).indexOf(normalize(l.abrev)) === -1) meta.push(el('span', 'badge', l.abrev));
    if (l.local) meta.push(el('span', 'local__onde', l.local));
    if (meta.length) {
      var p = el('p', 'local__meta');
      meta.forEach(function (m) { p.appendChild(m); });
      body.appendChild(p);
    }
    if (l.desc) body.appendChild(el('p', 'local__desc', l.desc));

    li.appendChild(body);
    li.setAttribute('data-busca', normalize([l.id, l.nome, l.abrev, l.local, l.desc, l.tipo.nome].join(' ')));
    return li;
  }

  function plural(n) {
    return n === 1 ? '1 local' : n + ' locais';
  }

  function init(box) {
    var aba = box.getAttribute('data-locais');
    var lista = box.querySelector('[data-locais-lista]');
    var status = box.querySelector('[data-locais-status]');
    var busca = box.querySelector('[data-locais-busca]');
    var mostrarCategoria = box.hasAttribute('data-locais-categoria');
    var total = 0;

    function filtrar() {
      var q = normalize(busca.value.trim());
      var visiveis = 0;
      Array.prototype.forEach.call(lista.children, function (li) {
        var ok = !q || li.getAttribute('data-busca').indexOf(q) !== -1;
        li.hidden = !ok;
        if (ok) visiveis++;
      });
      if (!q) status.textContent = plural(total) + '.';
      else if (visiveis) status.textContent = plural(visiveis) + ' de ' + total + ' para “' + busca.value.trim() + '”.';
      else status.textContent = 'Nenhum local encontrado para “' + busca.value.trim() + '”.';
    }

    function erro() {
      status.textContent = '';
      var alert = el('div', 'alert alert--danger');
      alert.setAttribute('role', 'alert');
      alert.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="/img/icons/sprite.svg#alert"></use></svg>';
      var p = el('p');
      p.appendChild(el('strong', '', 'Não foi possível carregar os locais.'));
      p.appendChild(document.createTextNode(' Verifique a conexão e '));
      var a = el('a', '', 'recarregue a página');
      a.href = window.location.href;
      p.appendChild(a);
      p.appendChild(document.createTextNode('.'));
      alert.appendChild(p);
      box.insertBefore(alert, lista);
      if (busca) busca.disabled = true;
    }

    if (busca) busca.disabled = true;
    box.setAttribute('aria-busy', 'true');

    fetch(sheetUrl(aba))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var locais = parseGviz(text).map(toLocal).filter(function (l) { return l.id || l.nome; });
        var frag = document.createDocumentFragment();
        locais.forEach(function (l) { frag.appendChild(renderItem(l, mostrarCategoria)); });
        lista.appendChild(frag);
        total = locais.length;
        if (busca) {
          busca.disabled = false;
          busca.addEventListener('input', filtrar);
        }
        filtrar();
      })
      .catch(function (err) {
        console.error('Mapa Digital: erro ao carregar a aba "' + aba + '"', err);
        erro();
      })
      .then(function () { box.removeAttribute('aria-busy'); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-locais]').forEach(init);
  });
})();
