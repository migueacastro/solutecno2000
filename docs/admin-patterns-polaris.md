# Patrones UX del panel admin — Polaris (Shopify Admin)

> Estudio verificado contra fuentes primarias, sept. 2026: la documentación de Polaris vive ahora en `shopify.dev/docs/api/polaris` (polaris.shop.com 301-redirects ahí; el repo React legacy se renombró `polaris-react-archive`), el paquete npm `@shopify/polaris-tokens@9.4.2` como fuente de verdad de los tokens, el changelog de Shopify y snapshots de Wayback Machine de la documentación clásica. polaris.shopify.com y help.shopify.com bloquean fetches scriptados; los docs React clásicos se recuperaron por Wayback y los actuales desde shopify.dev con sufijo `.md`.

Objetivo: patrones concretos para el panel admin de solutecno2000 (SvelteKit + Svelte 5), estilo Shopify.

---

## 1. Estructura global del admin

### 1.1 El shell de tres zonas

1. **Sidebar de navegación izquierda** — la columna vertebral. Desde el rediseño del **15 sept. 2026** es **colapsable** y absorbe lo que era la top bar: **búsqueda global, centro de notificaciones y el selector de tienda viven en la side nav** (https://shopify.dev/changelog/prepare-your-app-for-the-shopify-admins-new-look). Antes de 2026, la sidebar llevaba tienda/cuenta arriba y la top bar llevaba búsqueda, notificaciones, "View store" y el avatar.
2. **Área de contenido** — la página: header con título/acciones, banners, cards de contenido.
3. **Capa inferior** — save bar (barra sticky en páginas de edición), toasts (abajo-centro), modals/sheets.

**Sidekick**: el asistente AI de Shopify es un **control de chat flotante abajo** en el rediseño 2026 — persistente, no navegacional, visualmente separado del contenido.

### 1.2 Items de nav primaria (la IA canónica)

Confirmado desde la propia estructura de Shopify: **Home, Orders (Drafts, Abandoned checkouts), Products (Collections, Inventory, Transfers, Gift cards), Customers, Content (Menus, Pages, Blog posts, Files, Metaobjects), Financials, Analytics, Marketing (Campaigns, Automations), Discounts** — con **Sales channels** como secciones visualmente separadas, y **Settings migrado a la sidebar colapsable** en 2026.

Reglas de IA de https://shopify.dev/docs/apps/design/navigation:

- Usar la **arquitectura de información con menos categorías**; cada item de nav es un **sustantivo, no un verbo** ("Orders", no "Manage orders").
- Items en **sustantivo singular** para un tipo de recurso; cada uno abre el index (lista) del recurso.
- **No duplicar navegación en el cuerpo ni en el header de la página** — la sidebar es la única superficie de nav.
- Apps inyectan items en grupos designados (`admin_navigation.*`); declaran un `placement`.
- **Más de 7 items se trunca en un "View more"** — cap duro que vale la pena copiar.
- Tabs se usan con moderación; **los tabs nunca hacen wrap**.

### 1.3 Switcher de contexto de tienda

- Clásico: control con nombre de tienda en la sidebar con popover de tiendas + búsqueda + "Add store"; el avatar tenía cuenta/perfil.
- Sept 2026: el store picker vive **en la side nav colapsable**.

**Implicación para un admin en SvelteKit: tratar "top bar vs side rail" como UN sistema de navegación, no dos.**

---

## 2. Páginas de lista (el patrón IndexTable)

### 2.1 Dos patrones distintos

Polaris distingue (https://shopify.dev/docs/api/app-home/latest/patterns/compositions/index-table vs `.../compositions/resource-list`):

- **Index table** — gestión full-page de muchos recursos que **tienen página de detalles propia** (products, orders, customers). Es formato de contenido + sistema de acciones (bulk) + navegación a detalles. Guiar paginación a partir de ~50 ítems (guidance nueva: >100), con sort/filters para listas largas.
- **Resource list** — formato **compacto y escaneable dentro de una card, modal o picker** para colecciones pequeñas o cuando el usuario está **seleccionando** ítems en vez de gestionarlos. Filas avatar/texto, campo de búsqueda inline, filtros popover, selección checkbox.

Regla: **gestionar un tipo de entidad completo → index table; elegir algunos ítems → resource list.**

### 2.2 Esqueleto de página (clásico y actual)

De https://web.archive.org/web/2024*/polaris.shopify.com/patterns/resource-index-layout y la plantilla actual https://shopify.dev/docs/api/app-home/latest/patterns/templates/resource-index:

```
Título de página + acción primaria ("Add product") + acciones secundarias (Export, Import)
Tabs / saved views: All | Active | Draft | Archived
Toolbar: búsqueda + filtros (popover con ChoiceList checkboxes) + sort
Tabla (o lista en móvil)
Empty state / texto de ayuda en footer ("Learn more about products")
Paginación
```

API clásica que captura todo el patrón:

- `Page title="Products" primaryAction={{content:'Add product'}} secondaryActions=[{content:'Export'},{content:'Import'}]`
- Tabs = **saved views**: `['All','Active','Draft','Archived']`, tab 0 bloqueado (`isLocked`), cada tab soporta rename/duplicate/edit/delete; crear una view siempre empieza como "save as", editar solo en views propias.
- Sort con **labels de dirección**: `'A-Z'`/`'Z-A'` para nombres; `'Ascending'`/`'Descending'` para fechas/números.
- Filtros como `ChoiceList` (Status: Active/Draft/Archived, `allowMultiple`, marcados `shortcut:true` para que aparezcan como chips rápidos); los filtros aplicados se renderizan como **chips removibles** con un escape "Clear all".
- `IndexTable` + `useIndexResourceState`: columna de checkboxes, `selectedItemsCount` (`'All'` o n), `id`/`position` por fila, headers ordenables, thumbnails.

### 2.3 Plantilla actual de web components (`s-page` + `s-table`)

De la plantilla md actual:

- **Empty state primero** (imagen `aspectRatio 1/0.5`, `maxInlineSize 200px`, heading, párrafo, **button group** con slots `primary-action` / `secondary-actions` capped a `maxInlineSize 450px`).
- Celdas de `s-table-header-row` usan `listSlot="primary"` (qué celda sobrevive en vista lista) y `format="numeric"` para dinero alineado a la derecha.
- Filas: thumbnail ~40px + `s-link` título + `s-badge` de status. **Draft = `tone="neutral"`, Active = `tone="success"`** en la plantilla actual.
- `variant="auto" | "list"`: en pantallas chicas la tabla colapsa a **lista apilada**, usando `listSlot` para decidir qué campos se muestran (https://shopify.dev/docs/api/app-home/latest/web-components/tables/table).
- Filas soportan `clickDelegate` — un handler a nivel fila sirve a todos los links anidados; el slot `filters` aloja controles `s-filter`; **paginar >100 filas** con `hasPreviousPage/hasNextPage` y eventos `nextpage/previouspage`.
- Footer: texto de ayuda en tono subdued + un `s-link`.
- **Bulk actions**: checkboxes para selección, **barra de acciones bulk aparece sobre la tabla** cuando hay ítems seleccionados; operaciones bulk destructivas confirman via Modal; Toast da el feedback después.

### 2.4 Vocabulario de status para listas

De los docs clásicos de badge (Wayback polaris.shopify.com/components/badge) — statuses de una palabra, en pasado:

- Financiero: Authorized, Pending, Paid, Unpaid, Voided, Partially paid, Partially refunded, Refunded.
- Fulfillment: Fulfilled, Complete, Partial, Unfulfilled, Restocked.

Mapeo de tonos actual (https://shopify.dev/docs/api/app-home/latest/web-components/feedback-and-status-indicators/badge): **Fulfilled=auto, Draft=info, Active=success, Open=caution, "On hold"=warning, "Action required"=critical**; inventario: "Low stock"=warning con icono alert-triangle, "Out of stock"=critical.

---

## 3. Páginas de detalle/edición

### 3.1 El patrón resource-details

Documentado en https://web.archive.org/web/2024*/polaris.shopify.com/patterns/resource-details-layout y la plantilla actual https://shopify.dev/docs/api/app-home/latest/patterns/templates/details. Shopify llama al par index+details "uno de los patrones más fuertes del admin de Shopify".

Estructura:

- **Header de página, full width, siempre**: back link (breadcrumbs al padre, **nunca el back del navegador**), título, y acciones. `Page` clásico: `backAction={{content:'Products', url:'/products'}}`, `title="Product"`, `primaryAction` (Save), `secondaryActions` = menú dropdown (Duplicate, Archive, **Delete con `destructive`**), y **paginación de objeto** (`hasPrevious/hasNext`) para pasar al ítem anterior/siguiente del mismo tipo sin volver a la lista.
- **Cuerpo a dos columnas**: contenido primario ~2/3 izquierda (la información que define al objeto), secundario ~1/3 derecha (status, metadata, resúmenes — estado de publicación, disponibilidad por canal, insights). Implementado como `InlineGrid columns={{xs:1, md:'2fr 1fr'}} gap="400"`.
- **El contenido vive en cards, agrupado por similitud**: campos relacionados comparten una card con título de sección + help text; preocupaciones no relacionadas van en cards separadas. Las secciones pueden tener sub-cards.
- Títulos: el tipo de objeto en plural en listas ("Orders"), el nombre del objeto en detalles; labels de acciones verbo+sustantivo ("Create order"), verbo solo está bien en acciones secundarias inequívocas ("Import", "Export").

### 3.2 Badges de status en detalles

Mismo sistema de tonos que las listas (§2.4), con variantes `progress` (`incomplete`, `partiallyComplete`, `complete`) que renderizan un punto/glyph de progreso en el badge — usado para pipelines de fulfillment/publicación.

### 3.3 Banners en detalles

https://shopify.dev/docs/api/app-home/latest/web-components/feedback-and-status-indicators/banner + docs clásicos:

- Tones: **info | success | warning | critical | auto**.
- Banners de página van **arriba, debajo del header, full width**; banners de sección van **dentro de la sección, debajo de su heading**.
- **Banners informativos (info) siempre dismissibles**; banners success son raros (solo para feedback diferido o con CTA); **dismissible salvo critical**; máximo una acción primaria; heading requerido; hasta 2 botones de acción secundaria.
- Los banners **no son para marketing** (eso es CalloutCard) y deben usarse con moderación.

### 3.4 Save bar, confirmación destructiva, toast

- **Save Bar API** (https://shopify.dev/docs/api/app-home/latest/apis/user-interface-and-interactions/save-bar-api): barra sticky abajo que aparece **solo cuando el formulario está dirty**. Modo automático: atributo `data-save-bar` en el form — submit = Save, reset = Discard. Modo programático: `<ui-save-bar>` + `shopify.saveBar.show/hide/toggle`. Antes de salir, `shopify.saveBar.leaveConfirmation()` dispara el modal "Leave page with unsaved changes?". **Nunca mezclar ambos modos.**
- **Confirmación destructiva**: Archive/Delete abren un Modal con header en tono critical y cancel/confirm — **nunca un confirm del navegador**.
- **Toast** (https://shopify.dev/docs/api/app-home/latest/apis/user-interface-and-interactions/toast-api; docs clásicos): abajo-centro, **solo success**, **máximo tres palabras**, sustantivo+verbo ("Product updated", "Collection added"), acción opcional de un verbo (**Undo**/**Retry**) con duración **mínimo 10.000 ms** cuando tiene acción; `aria-live="polite"`. Los toasts **no son para errores** (salvo un mensaje persistente de conectividad como "Internet disconnected").

---

## 4. Formularios

Fuente: https://shopify.dev/docs/apps/design/user-experience/forms + plantilla de settings https://shopify.dev/docs/api/app-home/latest/patterns/templates/settings.

- **Una definición de objeto por página.** Una página de detalle/edición gestiona una sola instancia de recurso.
- **Más de 5 inputs → secciones con título**, ya sea una card con secciones o varias cards. Las secciones se agrupan por tema, no por tipo de widget.
- **Nunca formularios grandes en modals.** Los modals son para acciones pequeñas de un solo propósito.
- **Progressive disclosure**: campos avanzados/raros detrás de secciones expandibles, popovers o tabs secundarias.
- **Save explícito, no autosave.** Los docs son explícitos: "Forms should be saved using the Polaris Data Save Bar API... Continuous data validation or auto-save for forms is **incongruous with the standard Shopify admin save UX**." Es una decisión de producto deliberada y declarada.
- **Validación**: errores inline a nivel de campo, persistiendo hasta resolverse; `s-form` trackea dirty state, `onInput` para feedback por tecla, `onChange` (blur/commit) para validación.
- **Labels y help text**: todo input requiere label (requisito de accesibilidad built-in en Polaris web components); el help text va debajo del control, la ayuda contextual al lado de las secciones en páginas de settings.
- **Settings vs recursos**: settings usan grupos lógicos de controles con ayuda contextual, el mismo Save Bar, un Modal para confirmar el reset de settings y un Toast al guardar. La diferencia es el contenido, no el chrome — mismo header, mismo save bar, mismo feedback.

---

## 5. Design tokens (valores reales)

Fuente de verdad: `@shopify/polaris-tokens@9.4.2` `dist/css/styles.css` (npm). Valores del tema claro salvo nota; el tema oscuro invierte bg/surface/text/border.

### 5.1 Colores (roles semánticos)

**Superficies y estructura**

| Token                           | Valor     | Rol                |
| ------------------------------- | --------- | ------------------ |
| `--p-color-bg`                  | `#F1F1F1` | fondo de la app    |
| `--p-color-bg-surface`          | `#FFFFFF` | superficie de card |
| `--p-color-bg-surface-hover`    | `#F7F7F7` | hover de fila      |
| `--p-color-bg-surface-selected` | `#F1F1F1` | fila seleccionada  |
| `--p-color-border`              | `#E3E3E3` | borde default      |
| `--p-color-border-hover`        | `#CCC`    | borde hover        |
| `--p-color-border-secondary`    | `#EBEBEB` | divider sutil      |
| `--p-color-border-focus`        | `#005BD3` | focus ring         |

**Superficies semánticas (fondos tintados)**

| Token                           | Valor     |
| ------------------------------- | --------- |
| `--p-color-bg-surface-info`     | `#EAF4FF` |
| `--p-color-bg-surface-success`  | `#CDFED4` |
| `--p-color-bg-surface-caution`  | `#FFF8DB` |
| `--p-color-bg-surface-warning`  | `#FFF1E3` |
| `--p-color-bg-surface-critical` | `#FEE8EB` |
| `--p-color-bg-surface-emphasis` | `#F0F2FF` |
| `--p-color-bg-surface-magic`    | `#F8F7FF` |

**Colores de fill (botones/CTA sólidos)**

| Token                        | Valor                             |
| ---------------------------- | --------------------------------- |
| `--p-color-bg-fill-emphasis` | `#005BD3` — botón primario, links |
| `--p-color-bg-fill-critical` | `#C70A24`                         |
| `--p-color-bg-fill-success`  | `#047B5D`                         |
| `--p-color-bg-fill-warning`  | `#FFB800`                         |
| `--p-color-bg-fill-caution`  | `#FFE600`                         |
| `--p-color-bg-fill-info`     | `#91D0FF`                         |
| `--p-color-bg-fill-magic`    | `#8051FF`                         |

**Texto**

| Token                      | Valor                            |
| -------------------------- | -------------------------------- |
| `--p-color-text`           | `#303030`                        |
| `--p-color-text-secondary` | `#616161`                        |
| `--p-color-text-disabled`  | `#B5B5B5`                        |
| `--p-color-text-link`      | `#005BD3`                        |
| `--p-color-text-critical`  | `#8E0B21` (secundario `#C70A24`) |
| `--p-color-text-success`   | `#014B40` (secundario `#047B5D`) |
| `--p-color-text-warning`   | `#5E4200` (secundario `#956F00`) |
| `--p-color-text-caution`   | `#4F4700` (secundario `#827500`) |
| `--p-color-text-info`      | `#003A5A` (secundario `#007CB4`) |

**Bordes/iconos semánticos**: borders critical `#FEC1C7`, success `#92FCAC`, warning `#FFC879`; icons critical `#E22C38`, success `#047B5D`, warning `#B28400`, caution `#998A00`, info `#0094D5`, emphasis `#005BD3`.

**Nav** (la sidebar tiene su propia escala): `--p-color-nav-bg` `#EBEBEB`, `nav-bg-surface` `rgba(0,0,0,0.02)`, `nav-bg-surface-selected` `#FAFAFA`.

**Inputs**: `input-bg-surface` `#FDFDFD`, `input-border` `#8A8A8A`. **Backdrop** (modals): `rgba(0,0,0,0.71)`.

**Tema oscuro** (`.p-theme-dark-experimental`): bg `#1A1A1A`, surface `#303030`, text `#E3E3E3`, border-secondary `#4A4A4A`.

### 5.2 Tipografía

Font stack: `'Inter', -apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, ...` — **Inter es la fuente del admin en 2026**.

Escala de tamaños (token = px): 275=11, 300=12, 325=13, 350=14, 400=16, 450=18, 500=20, 550=22, 600=24, 750=30, 800=32, 900=36, 1000=40.

Weights: regular **450**, medium **550**, semibold **650**, bold **700**.

Estilos de texto (la capa aplicada):

| Estilo      | Tamaño | Weight   | Line-height |
| ----------- | ------ | -------- | ----------- |
| heading-3xl | 36px   | bold     | 48px        |
| heading-2xl | 30px   | bold     | 40px        |
| heading-xl  | 24px   | bold     | 32px        |
| heading-lg  | 20px   | semibold | 28px        |
| heading-md  | 14px   | semibold | —           |
| heading-sm  | 13px   | semibold | —           |
| heading-xs  | 12px   | semibold | —           |
| body-lg     | 14px   | 450      | 20px        |
| body-md     | 13px   | 450      | 20px        |
| body-sm     | 12px   | 450      | 16px        |
| body-xs     | 11px   | 450      | 12px        |

Overrides de móvil: body-lg→18, body-md→16, body-sm→14, heading-xl→22, heading-2xl→32. Títulos de página = heading-xl/2xl; texto de tabla = body-md (13px); texto subdued/de ayuda = body-sm con `--p-color-text-secondary`.

### 5.3 Spacing

Token = px: 025=1, 050=2, 100=4, 150=6, 200=8, 300=12, 400=16, 500=20, 600=24, 800=32, 1000=40, 1200=48, 1600=64, 2000=80, 2400=96, 2800=112, 3200=128.

Valores aplicados clave: **padding de card y gap de card = 16px** (`space-400`; gap móvil 8px), **padding de celda de tabla = 6px** (`space-150`), spacing de secciones dentro de cards = 16–24px, padding a nivel página 16–32px.

### 5.4 Radios

0, 0.125rem, **0.25rem (base, `100`)**, 0.375rem, 0.5rem, 0.75rem, 1rem, 1.25rem, 1.875rem, y `full` = 624.9375rem (pill). Botones/cards/inputs usan `base` (4px); badges y pills usan `full`.

### 5.5 Sombras

- 100: `0 1px 0 rgba(26,26,26,0.07)` — card en reposo
- 200: `0 3px 1px -1px rgba(26,26,26,0.07)` — hover
- 300: `0 4px 6px -2px rgba(26,26,26,0.20)` — popover/dropdown
- 400: `0 8px 16px -4px rgba(26,26,26,0.22)` — modal
- 500/600: overlays mayores; más `inset-100/200`, `bevel-100`, y `--p-shadow-button` / `--p-shadow-button-primary` para estados presionados.

### 5.6 Breakpoints

xs = 0, **sm = 30.625rem (490px)**, **md = 48rem (768px)**, **lg = 65rem (1040px)**, **xl = 90rem (1440px)**. El grid de detalles 2/3+1/3 colapsa a una columna debajo de `md`; `s-table` cambia tabla→lista según el ancho disponible, no solo el viewport.

### 5.7 Motion y z-index

Duraciones 0–5000ms con ease estándar `cubic-bezier(0.25, 0.1, 0.25, 1)`; escalera de z-index de 100 (1) a 520 (12) — toasts/modals/sheets arriba de todo, sobre el save bar.

Nota: los web components actuales usan deliberadamente una **escala nombrada middle-out** en vez de números — `small-500 … small-100, base, large-100 … large-500` — para padding/gap/size, con propiedades `tone` (`critical|success|info`…), `color` (`subdued|strong`) y `variant` controlando la semántica. Para un admin en Svelte, un sistema de variables CSS con escala nombrada en este espíritu es lo más cercano.

---

## 6. Empty states y onboarding

### 6.1 Empty states

Fuente: https://shopify.dev/docs/api/app-home/latest/patterns/compositions/empty-state — "convierte pantallas en blanco en oportunidades."

Composición (arriba → abajo):

1. **Ilustración/imagen** (en el index template: ratio 1/0.5, ~200px de ancho máx).
2. **Heading** — el outcome, no la feature ("No products yet" / "No orders yet").
3. **Párrafo** — una frase corta de explicación.
4. **Button group** — una acción primaria ("Add product"), acción secundaria opcional; grupo capped a 450px de ancho.
5. Los empty states también se usan para **resultados cero de búsqueda/filtros**, con un escape "clear filters" en vez de una acción de creación.

### 6.2 Setup guides (checklists)

Fuente: https://shopify.dev/docs/api/app-home/latest/patterns/compositions/setup-guide + https://shopify.dev/docs/apps/design/user-experience/onboarding:

- **Checklist interactivo** con heading, descripción, ilustración y acción por paso; pasos expanden/colapsan; los completados llevan checkbox y Toast.
- **Máximo 5 pasos** — los docs advierten que "additional steps can lead to merchant drop off."
- **Indicador visual de progreso** ("x of y complete").
- **Auto-mark complete** cuando la condición del paso se cumple objetivamente; los pasos son dismissibles y ofrecen **"Remind me later"**; dismiss de todo lo no esencial.
- Copia de onboarding breve y directa; **nunca bloquear al merchant de trabajar**.

### 6.3 El patrón Intents (bonus, muy transferible)

Los empty states pueden cablearse directo a flujos de creación via Intents API: `shopify.intents.invoke('create:shopify/Product')` resuelve con el objeto creado, luego `shopify.toast.show('Product created')` — el CTA del empty state es literalmente una acción que retorna un resultado.

---

## 7. Top 10 patrones a replicar en el admin de solutecno2000 (SvelteKit)

1. **Save explícito con save bar de dirty-state, nunca autosave.** Barra sticky abajo que aparece solo cuando el form está dirty, con Save (submit) / Discard (reset), más una intercepción "¿salir con cambios sin guardar?" en la navegación. En SvelteKit: un `save-bar.svelte` alimentado por un store `form.dirty` y un guard `beforeNavigate`. Es la decisión de UX declarada de Shopify (save-bar-api; design/user-experience/forms).

2. **Esqueleto de index: título + acciones primaria/secundaria, tabs de saved views (Todos/Activos/Borradores/Archivados), chips de filtro + búsqueda, tabla, empty state, paginación.** Un layout `IndexPage` reutilizable con slots por zona. Saved views = estado en URL (`?view=active&q=...&filters=...`) para que los tabs sean linkeables (patterns/templates/resource-index).

3. **Layout de detalles: header (back link + título + acciones + paginación de objeto) y luego grid de cards 2fr/1fr debajo de `md`.** Columna primaria = campos que definen el objeto; secundaria = status, metadata, insights. El back link nunca depende del historial del navegador. Route layout de SvelteKit + `DetailPage.svelte` con CSS grid `md: 2fr 1fr` (patterns/templates/details).

4. **Badge de status semántico con vocabulario de tonos fijo.** Un componente `Badge` con tonos `info, success, caution, warning, critical, neutral, auto` (+ punto de progreso opcional) y un mapa documentado status→tono (Draft=neutral/info, Active=success, Open=caution, On hold=warning, Action required=critical, Low stock=warning+icono). Statuses de una palabra en pasado. Este único mapeo hace más por la coherencia del admin que cualquier otro componente.

5. **CSS custom properties token-first con la paleta exacta de Shopify.** Copiar los nombres de token (`--color-bg`, `--color-bg-surface`, `--color-text-secondary`, `--color-bg-fill-emphasis`, las superficies semánticas tintadas `#EAF4FF`/`#CDFED4`/`#FFF8DB`/`#FFF1E3`/`#FEE8EB`) y las escalas de arriba (spacing 4/6/8/12/16/20/24/32, radius base 4px, sombras 100/200/300/400, breakpoints 490/768/1040/1440). Cada componente referencia tokens, nunca hex (polaris-tokens@9.4.2).

6. **Sistema de banners con reglas de placement y tonos.** Banners de página full-width debajo del header; banners de sección debajo del heading de la sección; tonos info/success/warning/critical; info siempre dismissible; máx una acción primaria; nunca para marketing. Un `Banner.svelte` con prop `section`.

7. **Disciplina de toast: solo success, tres palabras máx, sustantivo+verbo, Undo opcional con ≥10s, abajo-centro.** Restringir los toasts a success (los errores van a banners/inline) es lo que mantiene el admin silencioso; un store `toast` + `Toast.svelte` son ~50 líneas.

8. **Selección bulk con barra de acciones contextual y Modal de confirmación para bulk destructivo.** Columna de checkboxes, barra "n seleccionados" reemplazando la toolbar mientras está activa, acciones verbo+sustantivo, selección cross-page, confirm destructiva via modal.

9. **Empty states de ilustración + heading de outcome + una frase + un CTA — tanto para datos cero como para resultados de búsqueda cero.** Agregar la variante de setup-guide checklist (≤5 pasos, indicador de progreso, auto-complete, dismissible/"remind later") para la primera experiencia de uso.

10. **Nav sidebar-first con cap duro de items, sustantivos no verbos, sin nav duplicada en headers de página; tablas responsivas que colapsan a lista apilada en pantallas chicas.** Agrupar en las menos categorías posibles, truncar overflow en "View more" (regla de los 7 items de Shopify), un switcher de contexto de tienda/tenant visualmente separado en el rail, y darle al componente de tabla un modo `variant: auto|list` con celdas "primary" designadas para la vista colapsada.

---

## Aplicación a solutecno2000

- **Shell**: sidebar colapsable (items: Dashboard, Productos, Colecciones, Clientes, Blog, Consultas, Ajustes) + área de contenido + capa inferior (save bar / toasts / modals).
- **Calibración de Skeleton UI v5**: mapear los tokens Polaris a los de Skeleton (primario `#005BD3`, radios base 4px en botones/cards, pills `full` para badges, sombras 100–400, fondo de app `#F1F1F1` con cards blancas).
- **Tabla admin**: index pages con saved views por URL, chips de filtro removibles, bulk selection con barra contextual, colapso tabla→lista en móvil.
- **Productos admin**: página de detalle con grid 2fr/1fr (campos a la izquierda, status/publishing/metadata a la derecha), save bar con dirty tracking, Delete con modal critical.
- **Feedback**: toasts de success de tres palabras, banners con placement rules, errores inline en forms — nunca autosave.

---

## i18n del admin (paraglide)

Todo el texto del admin pasa por paraglide (`m.*` de `$lib/paraglide/messages.js`), es/en. Reglas:

- **Claves flat con prefijo por área, en inglés**: `admin_nav_*`, `admin_sidebar_*`, `admin_auth_*`, `admin_savebar_*`, `admin_settings_*`, `admin_toast_*`, `admin_errors_*`, `admin_modal_*`. Espejadas en `messages/es.json` y `messages/en.json`; con interpolación `{name}` cuando hace falta. El compilador aplana los puntos a `_` (`toSafeModuleId`), así que las claves se escriben ya aplanadas: `admin_nav_settings`, no `admin.nav.settings`.
- **Errores de actions = claves, no texto**: el servidor devuelve `fail(status, { errorKey: 'no_session' })` con códigos estables; el cliente los traduce en `src/lib/i18n/errors.ts` (`ERRORS` + `errorMessage()`). El server nunca contiene texto de UI, así que el idioma siempre sale del visitante.
- **Labels de nav derivados**: los arrays de items usan `$derived` sobre `m.admin_nav_*` para que cambiar de idioma re-renderice el menú sin recargar.
- **⚠️ Compilar paraglide antes de `pnpm check`**: las claves nuevas no existen hasta correr
  `rm -rf src/lib/paraglide/messages && npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide`

---

## Primitivas UI (`src/lib/components/ui/`)

Componentes base neutros (los consumen el admin y, más adelante, la zona pública). API en inglés, comentarios en español. Regla dura: **ningún color fuera de los tokens `--app-*`** — ni `bg-white` ni hex; en modo oscuro un hardcode se rompe.

- **`Button.svelte`**: `variant: 'primary' | 'secondary' | 'danger' | 'critical-text'` + `size: 'sm' | 'md'`, `onclick`, `disabled`, `class` passthrough (el caller define el tamaño tipográfico, ej. `class="text-[13px]"`). `danger` para confirms críticos; `critical-text` para acciones destructivas sin relleno ("Quitar").
- **`IconButton.svelte`**: `shape: 'circle' | 'square'`, `label` (aria-label obligatorio), `onclick`, children = svg.
- **`Card.svelte`**: superficie `bg-(--app-surface)` + radius 8px + sombra Polaris; `class` passthrough para padding/max-w.
- **`TextField.svelte`** / **`TextArea.svelte`**: label + input + help + error; `value = $bindable('')`; TextArea agrega `rows` y `mono` (editor JSON).
- **`FileButton.svelte`**: label-as-button con input file oculto; `onFile(file)`, `busy`/`busyLabel`; resetea `input.value` para re-subir el mismo archivo.
- **`Badge.svelte`**: `tone: 'info' | 'success' | 'caution' | 'warning' | 'critical' | 'neutral' | 'none'` + `size: 'md' | 'sm'`.
- **`Icon.svelte`**: `paths` (string SVG de 24px, stroke currentColor), `size`.

El nivel de arriba son compuestos: `components/admin/` (Sidebar, SaveBar, ConfirmModal, Toasts) usan estas primitivas en vez de estilos inline.

---

Fuentes: [changelog nuevo look del admin](https://shopify.dev/changelog/prepare-your-app-for-the-shopify-admins-new-look), [Polaris web components](https://shopify.dev/docs/api/polaris/using-polaris-web-components), [plantillas: resource-index](https://shopify.dev/docs/api/app-home/latest/patterns/templates/resource-index) / [details](https://shopify.dev/docs/api/app-home/latest/patterns/templates/details) / [settings](https://shopify.dev/docs/api/app-home/latest/patterns/templates/settings), [composiciones: index-table](https://shopify.dev/docs/api/app-home/latest/patterns/compositions/index-table) / [resource-list](https://shopify.dev/docs/api/app-home/latest/patterns/compositions/resource-list) / [empty-state](https://shopify.dev/docs/api/app-home/latest/patterns/compositions/empty-state) / [setup-guide](https://shopify.dev/docs/api/app-home/latest/patterns/compositions/setup-guide), [s-table](https://shopify.dev/docs/api/app-home/latest/web-components/tables/table), [badge](https://shopify.dev/docs/api/app-home/latest/web-components/feedback-and-status-indicators/badge), [banner](https://shopify.dev/docs/api/app-home/latest/web-components/feedback-and-status-indicators/banner), [save-bar-api](https://shopify.dev/docs/api/app-home/latest/apis/user-interface-and-interactions/save-bar-api), [toast-api](https://shopify.dev/docs/api/app-home/latest/apis/user-interface-and-interactions/toast-api), [design/navigation](https://shopify.dev/docs/apps/design/navigation), [design/user-experience/forms](https://shopify.dev/docs/apps/design/user-experience/forms), [onboarding](https://shopify.dev/docs/apps/design/user-experience/onboarding), [changelog left-navigation](https://shopify.dev/changelog/menu-item-updates-for-shopify-admin-left-navigation); tokens de `@shopify/polaris-tokens@9.4.2` (npm); docs clásicos de Polaris React vía Wayback Machine (polaris.shopify.com/patterns/resource-index-layout, /patterns/resource-details-layout, /components/page, /components/banner, /components/toast, /components/badge, /components/index-table, /design/typography) y help.shopify.com/en/manual/shopify-admin
