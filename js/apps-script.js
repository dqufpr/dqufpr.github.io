/* Envio para o Google Apps Script (planilha do DQ Digital).
   Um único script recebe dois tipos de registro e grava cada um numa aba da planilha:
   - "avaliacao": o joinha do cartão do Mapa Digital, aba "Avaliações";
   - "contato": o formulário do Fale conosco, aba "Contato", com e-mail de confirmação.
   O código do script e o passo a passo ficam no repositório privado dqufpr/dq-apps-script.

   URL: a da implantação do script (termina em /exec). Vazia, o joinha não aparece
   e o Fale conosco avisa que não foi possível enviar. */
(function () {
  'use strict';

  var URL_SCRIPT = 'https://script.google.com/macros/s/AKfycbxHXeUGnjXuzrKWuO8CW5-8kviJ9tkT3mnGmagX2VWg2O5-jc2vAdyOxSyMK3Xx4yiX0g/exec';

  var TEMPO_LIMITE_MS = 20000;

  // Corpo "application/x-www-form-urlencoded": pedido simples, sem preflight de CORS
  // (o Apps Script não responde a OPTIONS). O script lê os campos em e.parameter.
  // Resposta: { ok, mensagem } ou { ok: false, erro }, com textos para o visitante.
  // Um erro vindo do servidor sai com err.servidor = true (o texto pode ser mostrado).
  function envia(dados) {
    if (!URL_SCRIPT) return Promise.reject(new Error('URL do Apps Script não configurada'));
    var corpo = new URLSearchParams();
    Object.keys(dados).forEach(function (k) {
      if (dados[k] != null) corpo.append(k, String(dados[k]));
    });
    corpo.append('pagina', window.location.href);
    var controle = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var cronometro = controle ? setTimeout(function () { controle.abort(); }, TEMPO_LIMITE_MS) : null;
    return fetch(URL_SCRIPT, {
      method: 'POST', body: corpo, credentials: 'omit', redirect: 'follow',
      signal: controle ? controle.signal : undefined
    })
      .then(function (res) {
        return res.text().then(function (t) {
          var r = null;
          try { r = JSON.parse(t); } catch (e) { r = null; }
          if (!res.ok || !r || typeof r.ok !== 'boolean') throw new Error('Resposta inesperada (HTTP ' + res.status + ')');
          if (!r.ok) {
            var err = new Error(r.erro || 'Não foi possível enviar.');
            err.servidor = true;
            throw err;
          }
          return r;
        });
      })
      .then(function (r) { clearTimeout(cronometro); return r; },
        function (err) { clearTimeout(cronometro); throw err; });
  }

  window.DQAppsScript = { ativo: !!URL_SCRIPT, envia: envia };

  /* ---------- Fale conosco ----------
     Valida cada campo ao sair dele e de novo no envio; o servidor repete todas as regras. */
  var form = document.querySelector('[data-form-contato]');
  if (!form) return;

  // Mesmas regras de apps-script/src/Codigo.gs (dq-apps-script): mantenha as duas cópias iguais.
  var MIN_MENSAGEM = 10, MAX_MENSAGEM = 3000;
  var REGEX_EMAIL = /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$/;
  var REGEX_NOME, REGEX_LINKS;
  try {
    // \p{L} e lookbehind: navegadores de 2023 em diante. Sem eles, o servidor valida.
    REGEX_NOME = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M}'’ .-]*$", 'u');
    REGEX_LINKS = new RegExp('(?:https?:\\/\\/|ftp:\\/\\/|www\\.|mailto:|(?<![@\\w.-])(?:[a-z0-9-]+\\.)+(?:com|net|org|info|biz|io|ru|cn|xyz|top|site|online|club|link|click|shop|br)\\b)', 'i');
  } catch (e) {
    REGEX_NOME = /^[^<>{}\[\]0-9]+$/;
    REGEX_LINKS = /(?:https?:\/\/|ftp:\/\/|www\.|mailto:)/i;
  }

  var campos = {
    nome: form.querySelector('#nome'),
    email: form.querySelector('#email'),
    mensagem: form.querySelector('#mensagem')
  };
  var isca = form.querySelector('#site_web');
  var status = form.querySelector('[data-form-status]');
  var botao = form.querySelector('[type="submit"]');
  var rotuloBotao = botao.querySelector('[data-rotulo]');
  var contador = form.querySelector('[data-contador]');
  var enviando = false;


  function erroDe(nome) {
    var v = campos[nome].value.trim();
    if (nome === 'nome') {
      if (!v) return 'Informe seu nome.';
      if (v.length < 2 || !REGEX_NOME.test(v) || REGEX_LINKS.test(v)) return 'Use apenas letras, espaços, apóstrofo, ponto ou hífen.';
    } else if (nome === 'email') {
      if (!v) return 'Informe seu e-mail.';
      if (!REGEX_EMAIL.test(v)) return 'Informe um e-mail válido, como nome@exemplo.com.';
    } else {
      if (!v) return 'Escreva sua mensagem.';
      if (v.length < MIN_MENSAGEM) return 'A mensagem precisa ter pelo menos ' + MIN_MENSAGEM + ' caracteres.';
      if (v.length > MAX_MENSAGEM) return 'A mensagem pode ter no máximo ' + MAX_MENSAGEM + ' caracteres.';
      if (REGEX_LINKS.test(v)) return 'Não é permitido enviar links. Escreva o endereço sem "www" ou "http".';
    }
    return '';
  }
  function valida(nome) {
    var campo = campos[nome], msg = erroDe(nome);
    var p = form.querySelector('#' + campo.id + '-erro');
    p.textContent = msg;
    p.hidden = !msg;
    if (msg) campo.setAttribute('aria-invalid', 'true');
    else campo.removeAttribute('aria-invalid');
    return !msg;
  }
  function atualizaContador() {
    if (contador) contador.textContent = campos.mensagem.value.length + ' de ' + MAX_MENSAGEM + ' caracteres';
  }
  function mostra(tipo, texto) {
    status.className = 'alert alert--' + tipo;
    status.textContent = '';
    var p = document.createElement('p');
    p.textContent = texto;
    status.appendChild(p);
    status.hidden = false;
  }

  // Ao apertar "Enviar", o campo perde o foco antes do clique terminar. Um erro
  // mostrado nesse instante empurraria o botão e o clique se perderia.
  var apertandoEnviar = false;
  botao.addEventListener('pointerdown', function () { apertandoEnviar = true; });
  ['pointerup', 'pointercancel'].forEach(function (t) {
    document.addEventListener(t, function () { setTimeout(function () { apertandoEnviar = false; }, 0); });
  });
  Object.keys(campos).forEach(function (nome) {
    var campo = campos[nome];
    campo.addEventListener('blur', function () {
      if (!apertandoEnviar && campo.value.trim() !== '') valida(nome);
    });
    // Depois de um erro, revalida enquanto a pessoa digita
    campo.addEventListener('input', function () {
      if (campo.getAttribute('aria-invalid') === 'true') valida(nome);
    });
  });
  campos.mensagem.addEventListener('input', atualizaContador);
  atualizaContador();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (enviando) return;
    status.hidden = true;
    var invalidos = Object.keys(campos).filter(function (n) { return !valida(n); });
    if (invalidos.length) {
      mostra('danger', 'Corrija os campos indicados e envie de novo.');
      campos[invalidos[0]].focus();
      return;
    }
    enviando = true;
    // O botão mostra um círculo girando até o servidor responder (validação, planilha e e-mails)
    botao.disabled = true;
    botao.classList.add('is-carregando');
    botao.setAttribute('aria-busy', 'true');
    if (rotuloBotao) rotuloBotao.textContent = 'Enviando…';
    envia({
      tipo: 'contato',
      nome: campos.nome.value.trim(),
      email: campos.email.value.trim(),
      mensagem: campos.mensagem.value.trim(),
      site_web: isca ? isca.value : '' // armadilha para robôs
    })
      .then(function (r) {
        form.reset();
        atualizaContador();
        mostra('success', r.mensagem || 'Mensagem enviada. Enviamos uma confirmação para o seu e-mail.');
        if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { form: 'fale_conosco' });
      })
      .catch(function (err) {
        console.error('Fale conosco: erro no envio', err);
        mostra('danger', err.servidor ? err.message
          : err.name === 'AbortError' ? 'O servidor demorou para responder. Tente de novo em instantes.'
            : 'Não foi possível enviar agora. Verifique a conexão e tente de novo.');
      })
      .then(function () {
        enviando = false;
        botao.disabled = false;
        botao.classList.remove('is-carregando');
        botao.removeAttribute('aria-busy');
        if (rotuloBotao) rotuloBotao.textContent = 'Enviar mensagem';
        status.focus();
      });
  });
})();
