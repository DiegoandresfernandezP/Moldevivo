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
- `datos/config.json`: tu WhatsApp, tus redes (Instagram, TikTok y YouTube) y los videos.
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

## Actualizar el catálogo (todos los días)

Los archivos de código del sitio se suben una sola vez. Lo de todos los días son solo datos y fotos.

1. **Fotos primero.** En GitHub entra a la carpeta `public/img`, pulsa **Add file, Upload files**, arrastra las fotos y confirma.
2. **En la app de gestión**, en el diseño, abre la sección **Ficha para la página pública**:
   - **Fotos:** una ruta por línea, la primera es la principal, hasta 6. Por ejemplo `img/dragon-articulado-1.jpg`. El botón **Generar rutas** las arma por ti con un nombre base, la cantidad y el formato.
   - **Video:** el enlace de la publicación de Instagram, TikTok o YouTube.
   - **Descripción corta y medidas.**
   - **Mostrar este diseño en la página:** desmárcalo para dejarlo oculto mientras lo preparas.
3. En el catálogo pulsa **Exportar para la página**. Se descarga `catalogo.json` y la app te muestra qué fotos debes tener subidas y qué rutas o enlaces no fueron válidos.
4. En GitHub entra a `public/datos`, **Add file, Upload files**, sube `catalogo.json` (reemplaza el anterior) y confirma. En un minuto queda publicado; recarga con Ctrl + F5.

### Cómo nombrar las fotos

- Solo letras minúsculas, números, guiones y puntos. Sin espacios, tildes ni ñ: `arbol-navidad-1.jpg`, no `Árbol Navidad 1.jpg`.
- Termina en `.jpg`, `.jpeg`, `.png` o `.webp`.
- Debe coincidir exactamente con la ruta de la app, porque GitHub distingue mayúsculas de minúsculas.
- Foto horizontal 4:3, por ejemplo 1200 × 900 px, de menos de unos 300 KB. La tarjeta recorta el centro.
- Patrón recomendado: `nombre-del-diseno-1.jpg` es la principal y `-2`, `-3`, `-4` las demás.

### Categorías y colecciones

La categoría es el texto del campo **Categoría** de cada diseño. Para armar una colección (por ejemplo Navidad), escribe `Navidad` en esos diseños y exporta. Los filtros solo aparecen si hay al menos dos categorías. Un diseño sin categoría aparece como "Otros".

Puedes compartir un enlace que abre el catálogo ya filtrado: `https://tu-direccion/#cat=Navidad`.

## Añadir videos

En `public/datos/config.json`, dentro de `"videos"`, agrega los enlaces de las publicaciones (no del perfil):

```json
"videos": [
  { "url": "https://www.instagram.com/reel/XXXXXXXXXXX/", "titulo": "Así imprimimos un dragón" },
  { "url": "https://www.tiktok.com/@moldevivo/video/1234567890123456789", "titulo": "Capibara en 3D" }
]
```

Se aceptan Instagram (`/p/`, `/reel/`), TikTok (enlace completo de la publicación; los enlaces cortos `vm.tiktok.com` no funcionan) y YouTube. Máximo 12.

## Cambiar el número de WhatsApp o tus enlaces

Todo está en `public/datos/config.json`. Cuando tengas un número de negocio, cambia `"whatsapp"` (con el 57 adelante y sin espacios ni signos). Tus redes (`"instagram"`, `"tiktok"` y `"youtube"`) también se cambian ahí; si dejas una vacía, su botón no aparece.

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
