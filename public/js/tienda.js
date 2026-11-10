/* Molde Vivo: catálogo, pedido por WhatsApp y videos.
   Reglas de seguridad de este archivo:
   - Todo dato externo (JSON, almacenamiento local) se valida antes de usarse.
   - La interfaz se arma con createElement y textContent. Nunca se usa innerHTML.
   - Los videos solo se incrustan desde Instagram, TikTok y YouTube, y solo al presionar reproducir.
   - No hay formularios ni peticiones a otros sitios: el pedido sale como un enlace de WhatsApp. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  var CLAVE = 'mv-pedido-v1';
  var cfg = { whatsapp: null, anticipo: 50, instagram: null, tiktok: null, videos: [] };
  var productos = [], porId = {}, categoria = 'Todo';
  var pedido = { codigo: null, items: [] };

  /* ---------- utilidades ---------- */
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
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }
  function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function texto(v, max) {
    return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
  }
  function numero(v, min, max, def) { v = Number(v); return isFinite(v) && v >= min && v <= max ? v : def; }
  function urlRed(u, dominios) {
    var x;
    try { x = new URL(u); } catch (e) { return null; }
    if (x.protocol !== 'https:') return null;
    return dominios.indexOf(x.hostname.replace(/^www\./, '')) >= 0 ? x.origin + x.pathname : null;
  }
  function abrir(d) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
  function cerrar(d) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); }
  function avisar(msg) { var s = $('#estado'); s.textContent = ''; setTimeout(function () { s.textContent = msg; }, 50); }
  function enlaceWA(msg) { return 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(msg); }

  /* ---------- validación de datos ---------- */
  function limpiarConfig(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    cfg.whatsapp = /^\d{10,15}$/.test(String(raw.whatsapp || '')) ? String(raw.whatsapp) : null;
    cfg.anticipo = Math.round(numero(raw.anticipo, 0, 100, 50));
    cfg.instagram = urlRed(raw.instagram, ['instagram.com']);
    cfg.tiktok = urlRed(raw.tiktok, ['tiktok.com']);
    cfg.videos = Array.isArray(raw.videos) ? raw.videos.slice(0, 12).map(function (v) {
      return { url: texto(v && v.url, 300), titulo: texto(v && v.titulo, 80) };
    }) : [];
  }
  function limpiarProducto(p) {
    if (!p || typeof p !== 'object') return null;
    var id = texto(p.id, 40);
    if (!/^[\w-]{1,40}$/.test(id)) return null;
    var nombre = texto(p.nombre, 80), precio = numero(p.precio, 1, 10000000, 0);
    if (!nombre || !precio) return null;
    var mats = (Array.isArray(p.materiales) ? p.materiales : []).slice(0, 8).map(function (m) {
      var n = texto(m && m.nombre, 30);
      if (!n) return null;
      var cols = (Array.isArray(m.colores) ? m.colores : []).slice(0, 16).map(function (c) { return texto(c, 30); }).filter(Boolean);
      return { nombre: n, colores: cols };
    }).filter(Boolean);
    return {
      id: id, nombre: nombre, categoria: texto(p.categoria, 40) || 'Otros', precio: Math.round(precio),
      foto: typeof p.foto === 'string' && /^img\/[a-z0-9._-]{1,80}\.(jpe?g|png|webp)$/i.test(p.foto) ? p.foto : '',
      disponible: p.disponible === true, ejemplo: p.ejemplo === true, materiales: mats
    };
  }

  /* ---------- pedido (se guarda solo en este navegador) ---------- */
  function nuevoCodigo() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(3), s = '', d = new Date(), i;
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
    else for (i = 0; i < 3; i++) b[i] = Math.floor(Math.random() * 256);
    for (i = 0; i < 3; i++) s += A.charAt(b[i] % A.length);
    return 'MV-' + String(d.getFullYear()).slice(2) + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '-' + s;
  }
  function cargarPedido() {
    try {
      var raw = JSON.parse(localStorage.getItem(CLAVE) || 'null'), items = [];
      if (!raw || !/^MV-\d{6}-[A-HJ-NP-Z2-9]{3}$/.test(raw.codigo) || !Array.isArray(raw.items)) return;
      raw.items.slice(0, 50).forEach(function (it) {
        if (!it || !porId[it.id]) return;
        items.push({ id: it.id, material: texto(it.material, 30), color: texto(it.color, 30), nota: texto(it.nota, 200), cantidad: Math.round(numero(it.cantidad, 1, 99, 1)) });
      });
      if (items.length) pedido = { codigo: raw.codigo, items: items };
    } catch (e) { /* sin almacenamiento: el pedido vive solo en esta visita */ }
  }
  function guardarPedido() {
    try {
      if (pedido.items.length) localStorage.setItem(CLAVE, JSON.stringify(pedido)); else localStorage.removeItem(CLAVE);
    } catch (e) { /* ignorar */ }
  }
  function agregarItem(it) {
    if (!pedido.codigo) pedido.codigo = nuevoCodigo();
    var igual = pedido.items.filter(function (x) {
      return x.id === it.id && x.material === it.material && x.color === it.color && x.nota === it.nota;
    })[0];
    if (igual) igual.cantidad = Math.min(99, igual.cantidad + it.cantidad);
    else if (pedido.items.length < 50) pedido.items.push(it);
    guardarPedido(); actualizarFab();
  }
  function total() { return pedido.items.reduce(function (s, it) { return s + porId[it.id].precio * it.cantidad; }, 0); }
  function actualizarFab() {
    var n = pedido.items.reduce(function (s, it) { return s + it.cantidad; }, 0), f = $('#fab');
    f.hidden = n === 0; $('#fab-n').textContent = String(n);
  }
  function mensaje() {
    var l = ['Hola Molde Vivo, quiero hacer este pedido (' + pedido.codigo + '):', ''];
    pedido.items.forEach(function (it, i) {
      var p = porId[it.id], o = [it.material, it.color].filter(Boolean).join(', ');
      l.push((i + 1) + '. ' + p.nombre + (o ? ' (' + o + ')' : '') + ', cantidad ' + it.cantidad + ', ' + COP.format(p.precio * it.cantidad));
      if (it.nota) l.push('   Nota: ' + it.nota);
    });
    l.push('', 'Total estimado: ' + COP.format(total()), '¿Me confirmas el precio final y el tiempo de entrega?');
    return l.join('\n');
  }

  /* ---------- catálogo ---------- */
  function renderFiltros() {
    var cont = $('#filtros'), cats = ['Todo'];
    productos.forEach(function (p) { if (cats.indexOf(p.categoria) < 0) cats.push(p.categoria); });
    vaciar(cont);
    cont.hidden = cats.length <= 2;
    cats.forEach(function (c) {
      var b = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(c === categoria), text: c });
      b.addEventListener('click', function () { categoria = c; renderFiltros(); renderGrilla(); });
      cont.appendChild(b);
    });
  }
  function tarjeta(p) {
    var media = h('div', { class: 'media' }), btn = h('button', { class: 'btn', type: 'button', text: 'Elegir opciones' });
    if (p.foto) media.appendChild(h('img', { src: p.foto, alt: p.nombre, loading: 'lazy', width: '640', height: '480' }));
    else {
      var m = h('span', { class: 'm', 'data-capas': '11', 'data-acento': '2', 'aria-hidden': 'true' });
      media.appendChild(m); window.MoldeVivo.dibujarMarca(m);
    }
    btn.addEventListener('click', function () { abrirProducto(p); });
    return h('article', { class: 'tarjeta' }, [media, h('div', { class: 'tarjeta-in' }, [
      h('h3', { text: p.nombre }),
      h('p', { class: 'cat', text: p.categoria }),
      h('p', { class: 'precio', text: COP.format(p.precio) }),
      h('span', { class: 'etiqueta' + (p.disponible ? ' ok' : ''), text: p.disponible ? 'Disponible' : 'A pedido' }),
      btn
    ])]);
  }
  function renderGrilla() {
    var g = $('#grilla'), lista = productos.filter(function (p) { return categoria === 'Todo' || p.categoria === categoria; });
    vaciar(g);
    if (!lista.length) { g.appendChild(h('p', { class: 'estado', text: 'No hay productos en esta categoría.' })); return; }
    lista.forEach(function (p) { g.appendChild(tarjeta(p)); });
  }

  /* ---------- ventana de opciones de un producto ---------- */
  function abrirProducto(p) {
    var cuerpo = $('#dp-cuerpo'), dlg = $('#dlg-producto'), selMat = null, selCol = null, colWrap = h('div');
    vaciar(cuerpo);
    function pintarColores() {
      vaciar(colWrap);
      var mat = p.materiales.length ? p.materiales[selMat ? selMat.selectedIndex : 0] : null;
      if (mat && mat.colores.length) {
        selCol = h('select', { id: 'dp-col' }, mat.colores.map(function (c) { return h('option', { value: c, text: c }); }));
        colWrap.appendChild(h('div', { class: 'campo' }, [h('label', { for: 'dp-col', text: 'Color' }), selCol]));
      } else {
        selCol = null;
        colWrap.appendChild(h('p', { class: 'aclara', text: p.materiales.length ? 'El color lo definimos contigo por WhatsApp.' : 'El material y el color los definimos contigo por WhatsApp.' }));
      }
    }
    cuerpo.appendChild(h('h3', { id: 'dp-titulo', text: p.nombre }));
    cuerpo.appendChild(h('p', { class: 'precio', text: COP.format(p.precio) }));
    if (p.materiales.length) {
      selMat = h('select', { id: 'dp-mat' }, p.materiales.map(function (m) { return h('option', { value: m.nombre, text: m.nombre }); }));
      selMat.addEventListener('change', pintarColores);
      cuerpo.appendChild(h('div', { class: 'campo' }, [h('label', { for: 'dp-mat', text: 'Material' }), selMat]));
    }
    cuerpo.appendChild(colWrap); pintarColores();
    var cant = h('input', { id: 'dp-cant', type: 'number', inputmode: 'numeric', min: '1', max: '99', value: '1' });
    var nota = h('textarea', { id: 'dp-nota', maxlength: '200', placeholder: 'Por ejemplo: para quién es o la fecha en que lo necesitas' });
    cuerpo.appendChild(h('div', { class: 'campo' }, [h('label', { for: 'dp-cant', text: 'Cantidad' }), cant]));
    cuerpo.appendChild(h('div', { class: 'campo' }, [h('label', { for: 'dp-nota', text: 'Notas (opcional)' }), nota]));
    var cancelar = h('button', { class: 'btn btn-ghost', type: 'button', text: 'Cancelar' });
    var agregar = h('button', { class: 'btn', type: 'button', text: 'Agregar al pedido' });
    cancelar.addEventListener('click', function () { cerrar(dlg); });
    agregar.addEventListener('click', function () {
      agregarItem({ id: p.id, material: selMat ? selMat.value : '', color: selCol ? selCol.value : '', nota: texto(nota.value, 200), cantidad: Math.round(numero(cant.value, 1, 99, 1)) });
      cerrar(dlg); avisar(p.nombre + ' agregado al pedido');
    });
    cuerpo.appendChild(h('div', { class: 'fila' }, [cancelar, agregar]));
    abrir(dlg);
  }

  /* ---------- ventana del pedido ---------- */
  function renderPedido() {
    var c = $('#dpe-cuerpo'), dlg = $('#dlg-pedido');
    vaciar(c);
    c.appendChild(h('h3', { id: 'dpe-titulo', text: 'Mi pedido' }));
    if (!pedido.items.length) {
      var seguir = h('button', { class: 'btn', type: 'button', text: 'Ver catálogo' });
      seguir.addEventListener('click', function () { cerrar(dlg); });
      c.appendChild(h('p', { text: 'Todavía no has agregado piezas.' })); c.appendChild(seguir);
      return;
    }
    c.appendChild(h('p', { class: 'aclara', text: 'Código del pedido: ' + pedido.codigo }));
    pedido.items.forEach(function (it, i) {
      var p = porId[it.id], det = [it.material, it.color].filter(Boolean).join(', ');
      var menos = h('button', { type: 'button', 'aria-label': 'Quitar una unidad de ' + p.nombre, text: '−' });
      var mas = h('button', { type: 'button', 'aria-label': 'Agregar una unidad de ' + p.nombre, text: '+' });
      var quitar = h('button', { class: 'link-chico', type: 'button', text: 'Quitar' });
      menos.addEventListener('click', function () { it.cantidad = Math.max(1, it.cantidad - 1); cambio(); });
      mas.addEventListener('click', function () { it.cantidad = Math.min(99, it.cantidad + 1); cambio(); });
      quitar.addEventListener('click', function () { pedido.items.splice(i, 1); if (!pedido.items.length) pedido.codigo = null; cambio(); });
      c.appendChild(h('div', { class: 'item' }, [
        h('div', { class: 'item-top' }, [
          h('span', {}, [p.nombre, det ? h('small', { text: det }) : null, it.nota ? h('small', { text: 'Nota: ' + it.nota }) : null]),
          h('span', { text: COP.format(p.precio * it.cantidad) })
        ]),
        h('div', { class: 'cant' }, [menos, h('output', { text: String(it.cantidad) }), mas, quitar])
      ]));
    });
    c.appendChild(h('div', { class: 'total' }, [h('span', { text: 'Total estimado' }), h('span', { text: COP.format(total()) })]));
    c.appendChild(h('p', { class: 'aclara', text: 'Te confirmamos el precio final y el tiempo de entrega por WhatsApp.' + (cfg.anticipo ? ' Para empezar se paga un anticipo del ' + cfg.anticipo + ' %.' : '') }));
    var enlace = cfg.whatsapp ? enlaceWA(mensaje()) : null;
    if (enlace && enlace.length > 1900) {
      c.appendChild(h('p', { class: 'aclara', text: 'Tu pedido es muy largo para un solo mensaje. Quita algunas piezas y envíalas en otro pedido.' }));
    } else if (enlace) {
      c.appendChild(h('a', { class: 'btn', href: enlace, target: '_blank', rel: 'noopener noreferrer', text: 'Enviar pedido por WhatsApp' }));
    } else {
      c.appendChild(h('p', { class: 'aclara', text: 'El envío por WhatsApp no está disponible en este momento.' }));
    }
    var seguir2 = h('button', { class: 'btn btn-ghost', type: 'button', text: 'Seguir viendo el catálogo' });
    var vaciarBtn = h('button', { class: 'link-chico', type: 'button', text: 'Vaciar pedido' });
    seguir2.addEventListener('click', function () { cerrar(dlg); });
    vaciarBtn.addEventListener('click', function () {
      if (window.confirm('¿Vaciar el pedido?')) { pedido = { codigo: null, items: [] }; guardarPedido(); actualizarFab(); cerrar(dlg); }
    });
    c.appendChild(h('div', { class: 'fila' }, [seguir2, vaciarBtn]));
  }
  function cambio() { guardarPedido(); actualizarFab(); renderPedido(); }

  /* ---------- videos ---------- */
  function videoDe(url) {
    var u, m, host;
    try { u = new URL(url); } catch (e) { return null; }
    if (u.protocol !== 'https:') return null;
    host = u.hostname.replace(/^www\./, '');
    if (host === 'instagram.com' && (m = u.pathname.match(/^\/(p|reel|reels)\/([A-Za-z0-9_-]{5,20})\/?$/)))
      return { red: 'Instagram', src: 'https://www.instagram.com/' + (m[1] === 'reels' ? 'reel' : m[1]) + '/' + m[2] + '/embed' };
    if (host === 'tiktok.com' && (m = u.pathname.match(/^\/@[A-Za-z0-9._]{1,40}\/video\/(\d{8,25})\/?$/)))
      return { red: 'TikTok', src: 'https://www.tiktok.com/embed/v2/' + m[1] };
    var yt = null;
    if ((host === 'youtube.com' || host === 'm.youtube.com') && u.pathname === '/watch') yt = u.searchParams.get('v');
    else if ((host === 'youtube.com' || host === 'm.youtube.com') && (m = u.pathname.match(/^\/shorts\/([\w-]{11})\/?$/))) yt = m[1];
    else if (host === 'youtu.be' && (m = u.pathname.match(/^\/([\w-]{11})\/?$/))) yt = m[1];
    if (yt && /^[\w-]{11}$/.test(yt)) return { red: 'YouTube', src: 'https://www.youtube-nocookie.com/embed/' + yt };
    return null;
  }
  function fachada(v) {
    var caja = h('div', { class: 'video' }), t = v.titulo || 'video de ' + v.d.red;
    var b = h('button', { class: 'fachada', type: 'button', 'aria-label': 'Reproducir ' + t }, [
      h('span', { class: 'play', text: '▶', 'aria-hidden': 'true' }),
      h('span', { text: v.titulo || 'Reproducir video' }),
      h('small', { text: 'Se carga desde ' + v.d.red })
    ]);
    b.addEventListener('click', function () {
      vaciar(caja);
      caja.appendChild(h('iframe', {
        src: v.d.src, title: t, loading: 'lazy', referrerpolicy: 'no-referrer', allowfullscreen: true,
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        sandbox: 'allow-scripts allow-same-origin allow-popups allow-presentation'
      }));
    });
    caja.appendChild(b);
    return caja;
  }
  function renderVideos() {
    var cont = $('#lista-videos'), vistos = 0;
    vaciar(cont);
    cfg.videos.forEach(function (v) {
      var d = videoDe(v.url);
      if (d) { cont.appendChild(fachada({ d: d, titulo: v.titulo })); vistos++; }
    });
    if (!vistos) cont.appendChild(h('p', { class: 'lead', text: 'Muy pronto subiremos videos aquí. Mientras tanto, míralos en nuestras redes.' }));
  }

  /* ---------- enlaces y arranque ---------- */
  function enlace(sel, href, txt) {
    var a = $(sel);
    if (!a) return;
    if (href) { a.href = href; if (txt) a.textContent = txt; a.hidden = false; } else a.hidden = true;
  }
  function aplicarConfig() {
    var wa = cfg.whatsapp ? enlaceWA('Hola Molde Vivo, quiero hacer una consulta.') : null;
    if (wa) { $('#wa-hero').href = wa; $('#wa-hero').target = '_blank'; $('#wa-hero').rel = 'noopener noreferrer'; $('#con-wa').href = wa; }
    else { $('#wa-hero').hidden = true; $('#con-wa').hidden = true; }
    enlace('#vid-ig', cfg.instagram, 'Ver en Instagram'); enlace('#vid-tt', cfg.tiktok, 'Ver en TikTok');
    enlace('#con-ig', cfg.instagram, 'Instagram'); enlace('#con-tt', cfg.tiktok, 'TikTok');
    $('#anticipo').textContent = String(cfg.anticipo);
    renderVideos();
  }
  function cargarJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }).catch(function () { return null; });
  }
  function iniciar() {
    Promise.all([cargarJSON('datos/config.json'), cargarJSON('datos/catalogo.json')]).then(function (r) {
      limpiarConfig(r[0]); aplicarConfig();
      var lista = r[1] && Array.isArray(r[1].productos) ? r[1].productos.slice(0, 200) : null;
      if (!lista) { var g = $('#grilla'); vaciar(g); g.appendChild(h('p', { class: 'estado', text: 'No pudimos cargar el catálogo. Escríbenos por WhatsApp y te lo enviamos.' })); return; }
      productos = lista.map(limpiarProducto).filter(Boolean);
      productos.forEach(function (p) { porId[p.id] = p; });
      $('#aviso-ejemplo').hidden = !productos.some(function (p) { return p.ejemplo; });
      cargarPedido(); actualizarFab(); renderFiltros(); renderGrilla();
      if (!productos.length) { vaciar($('#grilla')); $('#grilla').appendChild(h('p', { class: 'estado', text: 'Pronto tendremos productos aquí.' })); }
    });
  }

  ['#dlg-producto', '#dlg-pedido'].forEach(function (s) {
    var d = $(s);
    d.addEventListener('click', function (e) { if (e.target === d) cerrar(d); });
  });
  $('#fab').addEventListener('click', function () { renderPedido(); abrir($('#dlg-pedido')); });
  iniciar();
})();
