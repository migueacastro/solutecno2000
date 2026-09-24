# Patrones de storefront — Shopify Dawn v16

> Estudio verificado contra el código fuente de Dawn v16.0.0 (`main` de [github.com/Shopify/dawn](https://github.com/Shopify/dawn), leído sept. 2026): `settings_schema.json`, `assets/*.css`, `sections/*.liquid`, `snippets/*.liquid`, `templates/product.json`. Números leídos del código, no de blogs.

**Filosofía de diseño declarada en el README de Dawn:** *"HTML-first, JavaScript-only-as-needed"*, *"functional, not pixel-perfect"*. Todo elemento visual (bordes, sombras, radios, animaciones) es un setting cuyo default es **0/ninguno** — por eso Dawn se ve casi brutalista out of the box. La elegancia viene de la tipografía y el spacing, no de la decoración.

**Gotcha de unidades:** Dawn define `html { font-size: calc(var(--font-body-scale) * 62.5%) }` ([theme.liquid](https://github.com/Shopify/dawn/blob/main/layout/theme.liquid)) — **1rem = 10px** en todo su CSS. Todos los valores abajo están convertidos a px.

---

## 1. Página de colección / catálogo

Fuentes: [`sections/main-collection-product-grid.liquid`](https://github.com/Shopify/dawn/blob/main/sections/main-collection-product-grid.liquid), [`snippets/card-product.liquid`](https://github.com/Shopify/dawn/blob/main/snippets/card-product.liquid), [`assets/base.css`](https://github.com/Shopify/dawn/blob/main/assets/base.css), [`assets/component-card.css`](https://github.com/Shopify/dawn/blob/main/assets/component-card.css)

### Grid

| Breakpoint | Columnas (default) | Rango configurable |
|---|---|---|
| Móvil < 750px | **2** | 1–2 |
| Tablet 750–989px | hereda las columnas móviles | — |
| Desktop ≥ 990px | **4** | 1–6 |

- Gap del grid: **8px horizontal y 8px vertical** (rango 4–24px).
- Productos por página: **16** (rango 8–36, paso 4).
- Padding de sección: **36px arriba / 36px abajo** (default de casi todas las secciones).
- Los ítems del grid usan anchos porcentuales (`width: calc(25% - var(--grid-desktop-horizontal-spacing) * 3 / 4)`) — alineación de filas trivial.

### Anatomía de la product card (arriba → abajo)

1. **Imagen** — dentro de un contenedor con ratio forzado, `object-fit: cover`.
2. **Badge(s)** — posicionado absoluto sobre la esquina de la imagen; default **bottom-left**; forma pill (`badge_corner_radius: 40px`); *Sale* usa el color scheme 5, *Sold out* el scheme 3. Texto en mayúsculas, tamaño caption.
3. **Título** — `<h3 class="h5">` = **13px desktop / 12px móvil**.
4. **Vendor** (apagado por default) — `caption-with-letter-spacing`: mayúsculas, 10px, letter-spacing 0.13rem.
5. **Precio** — 16px, letter-spacing 0.1rem; prefijo "From" en productos multivariante; en oferta = compare-at tachado + precio de oferta a **18px (más grande que el regular)** ([component-price.css](https://github.com/Shopify/dawn/blob/main/assets/component-price.css)).
6. Opcional: rating con estrellas, línea de descripción corta, botón quick-add.

- **No hay swatches de color en las cards** — Dawn los omite deliberadamente (existen en el variant picker del PDP y como filtros).
- **Ratios de imagen**: `square` = 1:1 (default), `portrait` = 0.8 (4:5), `adapt` = ratio nativo de cada imagen. Configurable por sección.
- **Hover (solo desktop ≥990px)**: si el producto tiene segunda imagen → **crossfade**; si solo tiene una → **scale(1.03)** en 500ms. Nada en móvil.
- Estilo de card `standard` (default): imagen desnuda + texto debajo, sin borde, radio 0, sombra al 10% (casi invisible). Alternativa `card` = card encajonada con fondo.
- Srcset: 165w / 360w / 533w / 720w / 1066w; **primeras 2 cards eager, resto lazy**.

### Sort & filter

Tres modos (`filter_type`), default **horizontal**:

- **Horizontal (default)**: barra superior con botón disclosure "Filters" + dropdown "Sort by"; cada faceta abre un panel desplegable; los filtros activos se muestran como **pills removibles** con "Clear all" debajo.
- **Vertical**: sidebar izquierda de acordeones (el grid se desplaza a la derecha).
- **Drawer**: drawer lateral en móvil.
- Las listas de valores muestran checkboxes **con conteo** `(12)`; en modo vertical, listas >12 ítems (productos) / 10 (otros) se colapsan con "+N more". Los filtros de color pueden renderizarse como **swatches** (círculo/cuadrado).
- Tipos de filtro: opciones de producto (con swatch), disponibilidad, rango de precio, marca/vendor, tipo, más metafields.

### Paginación

- **Paginación numerada clásica** con flechas prev/next y resaltado de la página actual ([snippets/pagination.liquid](https://github.com/Shopify/dawn/blob/main/snippets/pagination.liquid)). **No hay infinite scroll ni load-more en Dawn.** El filtrado/orden re-solicita la página server-side (por URL params, funciona sin JS).

### Empty state

"This collection is empty" + "**Use fewer filters or remove all**" — el "remove all" es un link subrayado a la URL sin filtros.

---

## 2. Página de producto (PDP)

Fuentes: [`sections/main-product.liquid`](https://github.com/Shopify/dawn/blob/main/sections/main-product.liquid), [`templates/product.json`](https://github.com/Shopify/dawn/blob/main/templates/product.json), [`assets/section-main-product.css`](https://github.com/Shopify/dawn/blob/main/assets/section-main-product.css)

### Galería

- Split desktop (`media_size: large`, default): **media 65% / info 35%** con gutter de 40px; `medium/small` = 55/45. Media a la izquierda por default; la columna de info puede ser sticky (`enable_sticky_info`).
- Layouts de galería: **stacked (default)** — columna vertical con scroll; `columns` (2 col); `thumbnail` (rail lateral); `thumbnail_slider` (carrusel de thumbs bajo la imagen principal).
- Móvil: slider único deslizable (scroll-snap) con contador/puntos; **thumbnails ocultos por default en móvil**.
- Fit de imagen `contain` (default) para que el producto entero se vea sobre blanco; zoom: **lightbox (default)**, hover-zoom o ninguno.

### Orden del buy box (template default)

1. **Vendor** (bloque de texto en mayúsculas — "eyebrow")
2. **Título**
3. **Precio** (16px + estilo de oferta; nota "impuestos incluidos, envío calculado al pagar" debajo de los botones)
4. **Variant picker** — pills por default (`picker_type: button`): radio-pills de **10px/20px padding, 14px texto, radio 40px**; swatches de color circulares; alternativa dropdown
5. **Selector de cantidad** (stepper ±, ancho máximo restringido)
6. **Botones de compra** — "Add to cart" full-width + botón de checkout dinámico (Wallet/Shop Pay) debajo
7. **Descripción**
8. **Compartir**
9. Debajo de la sección principal: **acordeones colapsables** (envío/devoluciones/políticas — cada uno con ~12 íconos opcionales como camión, caja, hoja) y **Productos relacionados** (4 productos, ratio `adapt`, 2 col móvil / 4 col desktop)

---

## 3. Header / navegación

Fuentes: [`sections/header.liquid`](https://github.com/Shopify/dawn/blob/main/sections/header.liquid), [`sections/announcement-bar.liquid`](https://github.com/Shopify/dawn/blob/main/sections/announcement-bar.liquid)

- **Announcement bar**: franja full-width sobre el header; mensaje en h5 (13px), letter-spacing 0.1rem, padding 10px 0, min-height **38px**; soporta mensajes rotativos con flechas + color scheme.
- **Sticky**: default `on-scroll-up` — el header se va con el scroll normal y **baja de nuevo al subir**; opciones: none / always / reduce-logo-size.
- **Menús desktop**: `dropdown` (default), `mega` (mega-menú en columnas) o `drawer` (toda la nav en drawer incluso en desktop).
- **Menú móvil**: hamburger abre un **drawer izquierdo** con submenús acordeón (basado en `<details>` nativo), links sociales y selector país/idioma al final.
- **Search**: icono lupa abre un modal (disclosure `<details>` nativo) con **búsqueda predictiva activada por default**; los resultados listan páginas + productos con thumbnail + título; vendor y precio apagados por default.
- **Cart**: icono en header con burbuja de contador. Opciones `cart_type`: **drawer / page / notification** (toast al agregar) — el esquema actual defaultea a `notification`, pero el **cart drawer** ([snippets/cart-drawer.liquid](https://github.com/Shopify/dawn/blob/main/snippets/cart-drawer.liquid)) sigue siendo el patrón icónico de Dawn. Drawer: line items con steppers de cantidad, nota del pedido, nota de impuestos/envío, botón "Checkout", y empty state ("Tu carrito está vacío" + colección sugerida).
- **Iconos**: set de SVG inline dibujados a mano (stroke de 1px, ~24px, sin icon font) — cart, hamburger, account, caret, filter, search, close, lock, heart, etc. Inlined vía `inline_asset_content` (sin requests extra).

---

## 4. Tipografía y espaciado

Fuentes: [`config/settings_schema.json`](https://github.com/Shopify/dawn/blob/main/config/settings_schema.json), [`assets/base.css`](https://github.com/Shopify/dawn/blob/main/assets/base.css)

- **Fuente default**: `assistant_n4` — **Assistant, weight 400 para headings Y body** (una sola familia; Google font humanista neutral). Heading weight configurable 300–700. Carga con `font-display: swap`.
- **Escalas**: `heading_scale` 100% (rango 60–150), `body_scale` 100%.

### Escala concreta (px, móvil → ≥750px)

| Clase | Tamaño | Line-height |
|---|---|---|
| `.hxxl` | clamp(56, 14vw, 72) | 1.1 |
| `.hxl` | 50 → 62 | ~1.3 |
| `.h0` | 40 → 52 | ~1.3 |
| h1 | 30 → **40** | ~1.3 |
| h2 | 20 → **24** | ~1.3 |
| h3 | 17 → 18 | ~1.3 |
| h4 | 15 | ~1.3 |
| h5 (títulos de card) | 12 → 13 | ~1.3 |
| **Body** | **15** | **1.8** |
| `.caption-large` / labels / inputs | 13 | ~1.5 |
| `.caption` | 10 → 12 | ~1.7 |
| `.caption-with-letter-spacing` | 10, **MAYÚSCULAS**, ls 0.13rem | ~1.2 |

- Letter-spacing de headings: 0.06rem × escala (levemente suelto); body 0.06rem.
- **Ancho de página**: default **1200px** (rango 1000–1600); padding lateral 15px móvil → **50px desktop**; `.page-width--narrow` limita texto a **726px**.
- **Ritmo de spacing**: grid gap 8px; padding de sección **36px arriba/abajo** (rango 0–100px); `spacing_sections: 0` global. Los sliders móviles tienen "peek" en el borde (scroll-snap).
- **Borders/radii defaults**: botones radio **0** (cuadrados) con borde 1px; inputs radio 0; variant pills radio **40px** (el único elemento redondeado); cards radio 0, sin borde, sombra 10%; media con borde 1px al 5% de opacidad. Focus outline 0.2rem con offset 0.3rem.
- **Animaciones**: reveal-on-scroll (slide-in) activado por default; duraciones 100–500ms, `--ease-out-slow: cubic-bezier(0,0,0.3,1)`.

---

## 5. Secciones de homepage (tema e-commerce típico)

Fuentes: directorio `sections/` — defaults de [`featured-collection.liquid`](https://github.com/Shopify/dawn/blob/main/sections/featured-collection.liquid), [`image-banner.liquid`](https://github.com/Shopify/dawn/blob/main/sections/image-banner.liquid), [`image-with-text.liquid`](https://github.com/Shopify/dawn/blob/main/sections/image-with-text.liquid), [`slideshow.liquid`](https://github.com/Shopify/dawn/blob/main/sections/slideshow.liquid), [`newsletter.liquid`](https://github.com/Shopify/dawn/blob/main/sections/newsletter.liquid)

| Sección | Layout default |
|---|---|
| **Slideshow (hero)** | Slides full-bleed, altura medium = **340px móvil / 560px desktop** (small 280/420, large 390/720, o adapt a imagen); overlay al 0% default; texto encajonado sobre imagen, centrado; contador (1/3) como pager; autorotación apagada |
| **Image banner** | Imagen única, caja de texto habilitada, posición **middle-center**, heading h1 |
| **Featured collection** | Heading h1 + link "View all" a la derecha; 4 productos, 4 col desktop / 2 col móvil; opcional slider horizontal en desktop y **carrusel scroll-snap con peek en móvil (activado por default)**; ratio `adapt` |
| **Collection list / Collage** | Cards de colecciones — mismo sistema de cards, 3–4 columnas |
| **Image with text** | 2 columnas: imagen (altura adapt) + bloque de texto, lados alternados (`image_first`), sin overlap, padding 36/36 |
| **Multicolumn** | 3 columnas con iconos opcionales + texto — el reemplazo usual de **logos / testimonials / valores** |
| **Rich text** | Bloque de texto centrado y angosto (726px) |
| **Newsletter / Email signup** | Heading h1 + input de email inline + botón flecha; padding 40/52 |
| **Featured product / Video / Blog / Contact form / Collage** | Secciones de soporte |

Nota: **Dawn no tiene sección dedicada de testimonials** — los merchants los arman con multicolumn o rich text.

---

## 6. Top 10 patrones para un catálogo simple (sin checkout, "consultar precio")

Ordenados por impacto/esfuerzo:

1. **Imágenes cuadradas 1:1 con `object-fit: cover` + srcset (165/360/533/720w), lazy-load desde la 3ª card** — la firma más distintiva del grid de Dawn; filas perfectamente alineadas sin sorpresas de recorte.
2. **Matemática del grid: 2 columnas móvil / 4 desktop, gaps de 8px, ancho máx 1200px, padding lateral 50px desktop** — densidad probada para escanear catálogos; adoptar 1rem=10px (root al 62.5%) para leer toda la escala en px.
3. **Card = imagen → título (13px) → precio/CTA, nada más.** Para "consultar precio": mantener el mismo slot pero renderizar "Consultar precio" como link subrayado o botón terciario en la posición del precio; el **pill badge** estilo "Sold out" solo para estados de disponibilidad. El único elemento redondeado (pill 40px) sirve como acento de badge/CTA.
4. **Hover = crossfade a segunda imagen o scale(1.03) si solo hay una — solo desktop (≥990px), 500ms ease.** Barato, elegante, sin JS.
5. **Barra de filtros horizontal: disclosure "Filters" + "Sort by" + pills de filtros activos con Clear-all; dirigido por URL, fallback sin JS.** Swatches circulares para facetas de color y conteos `(n)`. Para catálogos pequeños, omitir la sidebar.
6. **Paginación numerada (16/página) con flechas en vez de infinite scroll** — más simple, SEO-friendly y honesto para catálogos de cientos (no miles) de items.
7. **PDP split: media 65% / info 35% con gutter de 40px, galería apilada, zoom lightbox, thumbnails ocultos en móvil (swipe en su lugar).**
8. **Orden del buy box: eyebrow (uppercase 10px) → título → precio/CTA → variant pills → acordeones (descripción / envío / devoluciones)**. Para consultar precio: reemplazar variant picker + cantidad por un único botón full-width "Solicitar cotización / Contactarnos"; los acordeones con iconos de línea llevan el contenido de confianza.
9. **Sistema tipográfico: una familia (Assistant o system stack), weight 400 en todo, escala h1 40 / h2 24 / h3 18 / body 15 con line-height 1.8, headings ~1.3, captions uppercase 10–13px letter-spaced para eyebrows/labels.** Este sistema "quiet type" es lo que hace que Dawn se vea profesional sin decoración.
10. **Chrome: announcement bar de 38px (mensajes rotativos), header sticky-on-scroll-up, drawer móvil con hamburger, modal de búsqueda con resultados predictivos, iconos SVG de stroke.** Mantener el slot del icono cart para un icono de contacto/cotización u ocultarlo por completo.

**Menciones honoríficas:** empty state estilo paginación ("No hay productos — usa menos filtros"); carrusel featured-collection con peek móvil; footer = 3 columnas de links + newsletter + franja de pago/contacto; padding de sección 36px como ritmo vertical; todo cuadrado (radius 0) excepto pills.

**Nota para el stack (SvelteKit):** Dawn es Liquid server-rendered con progressive enhancement — sus patrones se traducen directo: SSR de páginas, filtros por URL params, JS mínimo. Encaja bien con SvelteKit + Supabase: SSR para páginas e interacciones como islas.

---

## Aplicación a solutecno2000

- **Grid de catálogo**: 2/4 columnas, 8px gaps, 1200px, imágenes 1:1, srcset, lazy desde la 3ª → componente `ProductCard.svelte`
- **Card**: badge de disponibilidad (pill) + título + "Consultar precio" (link/botón terciario) o precio real
- **PDP**: split 65/35, galería apilada con lightbox, botón "Solicitar cotización" full-width en vez de add-to-cart, acordeones de confianza
- **Filtros**: barra horizontal por URL params (categoría, tags) — funciona sin JS, SSR-friendly
- **Blog**: mismas lecciones de tipografía "quiet type" y ritmo de 36px; rich text angosto (726px) para el cuerpo de posts
- **Skeleton UI v5**: sus tokens pueden calibrarse con estos números (radius 0 en botones/cards, pills 40px para badges)