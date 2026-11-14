/* redirecionar.js — leva o endereço antigo /mapa/completo para /mapa/,
   mantendo ?local=…, ?destaque=… e #local-… (links e QR codes já compartilhados).
   Sem JavaScript, o <meta http-equiv="refresh"> da página leva para /mapa/. */
window.location.replace('/mapa/' + window.location.search + window.location.hash);
