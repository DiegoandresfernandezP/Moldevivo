/* Dibuja el símbolo de Molde Vivo (una M hecha de capas) dentro de cualquier .m[data-capas].
   - Versión normal: la V del centro, en naranja (la V de Vivo).
   - data-variante="boquilla": versión ilustrada para formatos grandes. La V del hueco superior es la boquilla
     de una impresora 3D que imprime la última capa, en naranja.
   Usa solo el CSSOM (element.style), que la política de seguridad permite; no hay estilos en línea. */
(function () {
  'use strict';
  var POLY = [[0,100],[0,0],[22,0],[50,45],[78,0],[100,0],[100,100],[78,100],[78,38],[56,72],[44,72],[22,38],[22,100]];
  var BOQUILLA = '34% 0.8%,66% 0.8%,66% 9.6%,58.5% 9.6%,53% 31%,52.5% 31%,50.7% 41.2%,49.3% 41.2%,47.5% 31%,47% 31%,41.5% 9.6%,34% 9.6%';

  function intervalos(y) {
    var xs = [], n = POLY.length, i, a, b;
    for (i = 0; i < n; i++) {
      a = POLY[i]; b = POLY[(i + 1) % n];
      if (a[1] === b[1]) continue;
      if (Math.min(a[1], b[1]) <= y && y < Math.max(a[1], b[1])) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
    }
    xs.sort(function (p, q) { return p - q; });
    var r = [];
    for (i = 0; i + 1 < xs.length; i += 2) r.push([xs[i], xs[i + 1]]);
    return r;
  }

  function dibujar(el) {
    var n = parseInt(el.getAttribute('data-capas') || '14', 10);
    if (!(n >= 3 && n <= 30)) n = 14;
    var boquilla = el.getAttribute('data-variante') === 'boquilla';
    while (el.firstChild) el.removeChild(el.firstChild);
    var paso = 100 / n, alto = paso * 0.7, filaNaranja = -1, i;
    if (boquilla) for (i = 0; i < n; i++) { if ((i + 0.5) * paso > 45) { filaNaranja = i; break; } }
    for (i = 0; i < n; i++) {
      (function (fila) {
        var cy = (fila + 0.5) * paso;
        intervalos(cy).forEach(function (iv) {
          var b = document.createElement('i'), centro = cy > 45 && iv[0] > 22.5 && iv[1] < 77.5;
          b.style.left = iv[0].toFixed(2) + '%';
          b.style.top = (cy - alto / 2).toFixed(2) + '%';
          b.style.width = (iv[1] - iv[0]).toFixed(2) + '%';
          b.style.height = alto.toFixed(2) + '%';
          b.style.setProperty('--i', String(n - 1 - fila));
          if (centro && (boquilla ? fila === filaNaranja : true)) b.className = 'acento';
          el.appendChild(b);
        });
      })(i);
    }
    if (boquilla) {
      var q = document.createElement('i');
      q.className = 'boq';
      q.style.clipPath = 'polygon(' + BOQUILLA + ')';
      q.style.setProperty('--i', String(n + 1));
      el.appendChild(q);
    }
  }

  window.MoldeVivo = { dibujarMarca: dibujar };
  Array.prototype.forEach.call(document.querySelectorAll('.m[data-capas]'), dibujar);
})();
