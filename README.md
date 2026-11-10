# Molde Vivo: sitio web

Página pública estática: catálogo, pedido por WhatsApp y videos. No tiene servidor, base de datos, login ni panel de administración, así que hay muy poco que atacar.

## Estructura

- `public/`: todo lo que se publica (páginas, estilos, scripts, fuentes, imágenes, datos y cabeceras de seguridad).
- `wrangler.jsonc`: le dice a Cloudflare que publique la carpeta `public/`.
- `.gitignore`: evita que se suban respaldos o archivos con datos internos.
- `README.md`: esta guía. No se publica en la web.

Dentro de `public/`:

- `index.html`, `privacidad.html`, `404.html`: las páginas.
- `estilos.css` y `tokens.css`: diseño y marca.
- `js/marca.js` y `js/tienda.js`: el símbolo animado y la lógica del catálogo y del pedido.
- `datos/config.json`: tu WhatsApp, el porcentaje de anticipo, tus redes y los videos.
- `datos/catalogo.json`: el catálogo. Trae 3 productos de ejemplo; se reemplaza con el que exporta la app.
- `fuentes/`, `img/`: tipografías propias, logo, favicons y fotos de productos.
- `_headers`: las cabeceras de seguridad.

## Publicarlo: GitHub y Cloudflare (Workers con archivos estáticos)

Cloudflare recomienda Workers con archivos estáticos para proyectos nuevos. Pages sigue funcionando, pero las novedades van a Workers. Los nombres de los menús pueden cambiar un poco.

1. **GitHub:** crea un repositorio nuevo (puede ser privado), por ejemplo `molde-vivo-sitio`. Sube el contenido de esta carpeta, de modo que en la raíz del repositorio queden `public/`, `wrangler.jsonc`, `README.md` y `.gitignore`. Desde la web puedes arrastrar las carpetas a "Add file, Upload files".
2. **Cloudflare:** entra a **Workers & Pages**, pulsa **Create application** y elige continuar con **GitHub**. Autoriza el acceso solo a ese repositorio y selecciónalo.
3. Deja el nombre del proyecto en `molde-vivo`. Debe ser igual al `name` de `wrangler.jsonc`, o la compilación falla.
4. Deja vacío el comando de compilación y deja el comando de despliegue por defecto (`npx wrangler deploy`). Pulsa **Deploy**.
5. Si te pide registrar un subdominio `workers.dev`, elige uno corto, por ejemplo `moldevivo`. Tu página quedará en `molde-vivo.<tu-subdominio>.workers.dev`.
6. Desde ahí, cada cambio que subas a la rama `main` de GitHub publica la página sola.

## Antes de publicar, en las dos cuentas

- Activa la verificación en dos pasos con llave de acceso (passkey) o una app autenticadora, no por SMS.
- Guarda los códigos de recuperación fuera de línea.
- Usa un correo que solo uses para estas cuentas.

## Actualizar el catálogo

1. En la app de gestión, entra a **Catálogo de diseños** y pulsa **Exportar para la página**. Se descarga `catalogo.json`.
2. Reemplaza `public/datos/catalogo.json` por ese archivo y súbelo a GitHub.
3. Para que un diseño tenga foto: copia la imagen (jpg, png o webp, liviana) a `public/img/` y, en la app, escribe su ruta en "Foto para la página pública", por ejemplo `img/dragon.jpg`.

El archivo exportado solo trae nombre, categoría, precio, foto, si hay disponibilidad, material y colores. Nunca trae costos, gramos, tiempos, existencias ni márgenes.

## Añadir videos

En `public/datos/config.json`, dentro de `"videos"`, agrega los enlaces de las publicaciones (no del perfil):

```json
"videos": [
  { "url": "https://www.instagram.com/reel/XXXXXXXXXXX/", "titulo": "Así imprimimos un dragón" },
  { "url": "https://www.tiktok.com/@moldevivo/video/1234567890123456789", "titulo": "Capibara en 3D" }
]
```

Se aceptan Instagram (`/p/`, `/reel/`), TikTok (enlace completo de la publicación; los enlaces cortos `vm.tiktok.com` no funcionan) y YouTube. Máximo 12.

## Cambiar el número de WhatsApp o el anticipo

Todo está en `public/datos/config.json`. Cuando tengas un número de negocio, cambia `"whatsapp"` (con el 57 adelante y sin espacios ni signos).

## Seguridad: lo que ya está hecho

- Política de seguridad estricta (`_headers`): solo se ejecuta código del propio sitio, no se permite incrustar la página en otras y solo se aceptan videos de Instagram, TikTok y YouTube. Cloudflare aplica este archivo a las respuestas de los archivos estáticos.
- La página no tiene formularios ni hace peticiones a otros sitios; el pedido sale como un enlace de WhatsApp.
- Todo dato (catálogo, configuración, pedido guardado) se valida antes de usarse, y la interfaz se dibuja como texto, nunca como HTML.
- Los videos no cargan hasta que alguien presiona reproducir, y van en un marco aislado.
- Fuentes y recursos propios: no hay scripts ni estilos de terceros.

## Pendientes

- Cuando tengas dominio propio, agrega las etiquetas `og:image` y `og:url` con direcciones completas para que se vea la vista previa al compartir el enlace.
- La política de privacidad es una base: que la revise un abogado o contador, y complétala con tu razón social y NIT cuando actualices el RUT.
- Después de publicar, abre la página, pulsa F12 y revisa en la pestaña Consola que no haya bloqueos de la política de seguridad.
