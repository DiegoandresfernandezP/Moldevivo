/* Catálogo imprimible de Molde Vivo.
   Lee datos/catalogo.json y datos/config.json, arma un documento A4 y se guarda como PDF desde el navegador.
   Todo se dibuja con createElement y textContent; los datos se validan antes de usarse. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  var productos = [], cfg = { whatsapp: null }, fecha = '';

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style' || k === 'srcdoc' || k.slice(0, 2) === 'on') return;
      else e.setAttribute(k, v === true ? '' : String(v));
    });
    (kids || []).forEach(function (c) { if (c !== null && c !== undefined) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function texto(v, max) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''; }
  function numero(v, min, max, def) { v = Number(v); return isFinite(v) && v >= min && v <= max ? v : def; }
  function telefono(n) {
    if (!/^\d{10,15}$/.test(n || '')) return '';
    return /^57\d{10}$/.test(n) ? '+57 ' + n.slice(2, 5) + ' ' + n.slice(5, 8) + ' ' + n.slice(8) : '+' + n;
  }
  function limpiar(p) {
    if (!p || typeof p !== 'object') return null;
    var id = texto(p.id, 40), nombre = texto(p.nombre, 80), precio = numero(p.precio, 1, 10000000, 0);
    if (!/^[\w-]{1,40}$/.test(id) || !nombre || !precio) return null;
    var mats = (Array.isArray(p.materiales) ? p.materiales : []).slice(0, 8).map(function (m) {
      var n = texto(m && m.nombre, 30);
      return n ? { nombre: n, precio: Math.round(numero(m.precio, 0, 10000000, 0)) } : null;
    }).filter(Boolean);
    var fotos = (Array.isArray(p.fotos) ? p.fotos : (p.foto ? [p.foto] : [])).slice(0, 6).filter(function (f) {
      return typeof f === 'string' && /^img\/[a-z0-9._-]{1,80}\.(jpe?g|png|webp)$/i.test(f);
    });
    return { id: id, nombre: nombre, categoria: texto(p.categoria, 40) || 'Otros', precio: Math.round(precio), fotos: fotos, descripcion: texto(p.descripcion, 400), medidas: texto(p.medidas, 80), materiales: mats, disponible: p.disponible === true };
  }
  function textoPrecio(p) {
    var ps = p.materiales.length ? p.materiales.map(function (m) { return m.precio > 0 ? m.precio : p.precio; }) : [p.precio];
    var min = Math.min.apply(null, ps), max = Math.max.apply(null, ps);
    return (min !== max ? 'Desde ' : '') + COP.format(min);
  }
  function norm(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function canonizar(lista) {
    var mapa = {};
    lista.forEach(function (p) {
      var k = norm(p.categoria);
      if (!mapa[k]) mapa[k] = p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1);
      p.categoria = mapa[k];
    });
  }
  function fijarHash(v) { try { window.history.replaceState(null, '', window.location.pathname + window.location.search + v); } catch (e) { /* sin historial */ } }

  function ficha(p) {
    var foto = h('div', { class: 'foto' });
    if (p.fotos.length) foto.appendChild(h('img', { src: p.fotos[0], alt: p.nombre, width: '800', height: '600' }));
    else { var m = h('span', { class: 'm', 'data-capas': '11', 'aria-hidden': 'true' }); foto.appendChild(m); window.MoldeVivo.dibujarMarca(m); }
    var cuerpo = h('div', { class: 'cuerpo' }, [h('h4', { text: p.nombre }), h('p', { class: 'precio', text: textoPrecio(p) })]);
    var det = [];
    if (p.medidas) det.push('Medidas: ' + p.medidas);
    if (p.materiales.length) det.push('Materiales: ' + p.materiales.map(function (m) { return m.nombre; }).join(', '));
    if (det.length) cuerpo.appendChild(h('p', { class: 'det', text: det.join('. ') + '.' }));
    if (p.descripcion) cuerpo.appendChild(h('p', { class: 'desc', text: p.descripcion }));
    cuerpo.appendChild(h('span', { class: 'estado-ficha' + (p.disponible ? ' ok' : ''), text: p.disponible ? 'Disponible' : 'Se imprime a pedido' }));
    return h('article', { class: 'ficha-pdf' }, [foto, cuerpo]);
  }

  function render() {
    var cat = $('#sel-cat').value, solo = $('#solo-fotos').checked, doc = $('#doc');
    var lista = productos.filter(function (p) { return (!cat || p.categoria === cat) && (!solo || p.fotos.length); });
    var tel = telefono(cfg.whatsapp), sitio = window.location.host || 'moldevivo';
    doc.textContent = '';
    var mk = h('span', { class: 'm', 'data-capas': '14', 'data-variante': 'boquilla', role: 'img', 'aria-label': 'Símbolo de Molde Vivo' });
    var portada = h('header', { class: 'portada' }, [mk, h('h2', { text: cat ? 'Colección ' + cat : 'Catálogo' }), h('p', { class: 'sub', text: 'Molde Vivo. Hecho en capas, hecho para ti.' }), h('p', { class: 'dato', text: 'Figuras y piezas impresas en 3D, en el material y el color que elijas.' })]);
    if (tel) portada.appendChild(h('p', { class: 'dato', text: 'Pedidos por WhatsApp: ' + tel }));
    if (window.location.host) portada.appendChild(h('p', { class: 'dato', text: 'Catálogo completo en ' + sitio }));
    if (fecha) portada.appendChild(h('p', { class: 'dato', text: 'Actualizado: ' + fecha }));
    doc.appendChild(portada); window.MoldeVivo.dibujarMarca(mk);
    if (!lista.length) doc.appendChild(h('p', { class: 'estado', text: 'No hay diseños con estos filtros. Prueba desmarcando "Solo diseños con foto".' }));
    var grupos = [], porCat = {};
    lista.forEach(function (p) { if (!porCat[p.categoria]) { porCat[p.categoria] = []; grupos.push(p.categoria); } porCat[p.categoria].push(p); });
    grupos.forEach(function (g) {
      var rej = h('div', { class: 'rejilla' }, porCat[g].map(ficha));
      doc.appendChild(h('section', { class: 'grupo' }, [cat ? null : h('h3', { text: g }), rej]));
    });
    $('#info').textContent = 'Incluye ' + lista.length + ' de ' + productos.length + ' diseños.';
    var pie = $('#pie'); pie.textContent = '';
    pie.appendChild(h('span', { text: 'Molde Vivo. Hecho en capas, hecho para ti.' }));
    pie.appendChild(h('span', { text: (tel ? 'WhatsApp ' + tel + '. ' : '') + sitio }));
  }

  function iniciar() {
    Promise.all([
      fetch('datos/catalogo.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('catalogo'); return r.json(); }),
      fetch('datos/config.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
    ]).then(function (r) {
      var c = r[0] && Array.isArray(r[0].productos) ? r[0].productos.slice(0, 200) : [];
      productos = c.map(limpiar).filter(Boolean);
      canonizar(productos);
      fecha = texto(r[0] && r[0].actualizado, 10);
      cfg.whatsapp = /^\d{10,15}$/.test(String(r[1] && r[1].whatsapp || '')) ? String(r[1].whatsapp) : null;
      var sel = $('#sel-cat'), cats = [];
      productos.forEach(function (p) { if (cats.indexOf(p.categoria) < 0) cats.push(p.categoria); });
      sel.appendChild(h('option', { value: '', text: 'Todo el catálogo' }));
      cats.forEach(function (c) { sel.appendChild(h('option', { value: c, text: c })); });
      var m = /^#cat=(.+)$/.exec(window.location.hash || ''), v = '';
      if (m) { try { v = decodeURIComponent(m[1]); } catch (e) { v = ''; } cats.forEach(function (c) { if (norm(c) === norm(v)) sel.value = c; }); }
      sel.addEventListener('change', function () { fijarHash(sel.value ? '#cat=' + encodeURIComponent(sel.value) : ''); render(); });
      $('#solo-fotos').addEventListener('change', render);
      $('#imprimir').addEventListener('click', function () { window.print(); });
      render();
    }).catch(function () { $('#doc').textContent = ''; $('#doc').appendChild(h('p', { class: 'estado', text: 'No pudimos cargar el catálogo. Intenta de nuevo en un momento.' })); });
  }
  iniciar();
})();
