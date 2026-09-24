# Arquitectura y convenciones del proyecto

Hallazgos de cómo está estructurado solutecno2000 y los patrones que seguimos.
Es el doc de referencia para escribir código nuevo: si algo de aquí choca con
lo que ves en el repo, actualiza este archivo en el mismo commit.

Los otros docs de `docs/` son **estudios** de patrones externos (Shopify/Polaris/Dawn);
este describe **lo que el proyecto realmente hace**.

---

## 1. Stack

| Pieza              | Elección                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| Framework          | SvelteKit 2 + Svelte 5 (**runes obligatorias**, sin stores legacy)        |
| Lenguaje           | TypeScript estricto (`svelte-check` debe quedar en 0)                     |
| Gestor de paquetes | `pnpm`                                                                    |
| Estilos            | Tailwind v4 + Skeleton (solo plugins forms/typography) + tokens `--app-*` |
| Contenido blog     | Híbrido: mdsvex en el repo + tabla `posts` en Supabase                    |
| i18n               | paraglide v2 (es/en), cookie-first (sin rutas /es)                        |
| Deploy             | `adapter-vercel`, runtime `nodejs22.x`                                    |
| Datos/auth         | Supabase (ref `icfjqeanbxvvrfooymuf`), OAuth Google, RLS siempre          |

## 2. Estructura

```
src/
├── lib/
│   ├── components/
│   │   ├── ui/          # Primitivas neutras (Button, Card, TextField, Badge…)
│   │   └── admin/       # Compuestos del panel (Sidebar, ConfirmModal, Toasts…)
│   ├── config/          # app.ts (APP_NAME) y theme.ts (tokens + helpers)
│   ├── stores/          # Estado global Svelte 5: theme.svelte.ts, toast.svelte.ts
│   ├── i18n/            # errors.ts: traducción de errorKey de las actions
│   ├── styles/          # admin-theme.css (bloques :root y :root[data-mode='dark'])
│   ├── supabase/        # client.ts (browser client)
│   └── paraglide/       # GENERADO — nunca editar; regenerar con el comando de §7
├── routes/
│   ├── +layout.server.ts # Load raíz: settings + tema activo + cookie theme-mode
│   ├── (public)/         # Zona pública (header Dawn-style, catálogo, blog)
│   └── admin/            # Panel Polaris-style, guard en +layout.server.ts
└── …
supabase/migrations/      # Numeradas por fecha; la BD es la fuente de verdad del esquema
docs/                     # Estudios de patrones + este documento
messages/                 # en.json y es.json (únicas fuentes de texto UI)
```

**Regla de carpetas de componentes:** las primitivas viven en `ui/` y son
neutras (la zona pública las reutilizará); los compuestos con lógica de panel
viven en `admin/`. No crear `admin/`-dentro-de-`ui/` ni al revés.

## 3. Patrones que seguimos

### 3.1 Componentes (Svelte 5)

- **Props con `$props()` tipado** en un `type Props` con JSDoc por prop.
- Snippets (`children`, `{@render}`) en vez de slots; `$bindable()` para
  inputs controlados; snippets `{#snippet nav(collapsed)}` para render doble.
- **`class: cls = ''` passthrough en TODAS las primitivas** — el caller añade
  márgenes/anchos (`max-w-sm`, `shrink-0`, `ml-2`); los componentes no fijan
  layout externo.
- **`untrack` para valores iniciales**: los borradores de formularios se
  inicializan con `untrack(() => …)` y el dirty-tracking va contra un
  `$derived` del dato guardado. Nunca `onMount` para "copiar props a estado".
- `cursor-pointer` explícito en todo botón/clickeable (Tailwind v4 ya no lo
  pone por defecto).
- Los `$derived` deben ser reactivos de verdad: un `Object.keys(props.x)`
  suelto en el body captura el valor inicial (warning
  `state_referenced_locally`) — envolver en `$derived(...)`.
- **Flex antes que grid** en el layout: contenedores con `flex flex-col` y
  filas que apilan con `flex-col → lg:flex-row`; listas de tarjetas con
  `flex flex-wrap` + anchos `calc(50%-gap)`/`calc(33.333%-gap)`. Se evita
  `grid` salvo caso imposible, pensando en responsive fluido.

### 3.2 Tokens de tema (regla dura)

**Ningún color fuera de los 19 tokens `--app-*`.** Nada de `bg-white`,
`text-[#...]` o paletas propias: solo `bg-(--app-surface)`,
`text-(--app-tone-critical-text)`, etc.

- Las 19 claves viven UNA sola vez en `src/lib/config/theme.ts`
  (`APP_TOKEN_DEFAULTS` / `APP_TOKEN_DARK_DEFAULTS`), espejadas por
  `admin-theme.css` (cada lado anota al otro) y por el CHECK de `app_themes`.
- El modo se conmuta con el **atributo `data-mode='dark'` en `<html>`** +
  cookie `theme-mode` (`'light' | 'dark'`); no se regenera CSS.
- El layout raíz inyecta `buildThemeCss(light, dark)` en `<svelte:head>`:
  emite SIEMPRE los 19 de cada modo, así el orden de cascada con el CSS
  importado es irrelevante y los borradores parciales caen a defaults.
- Excepción aceptada: los **colores de datos** (swatches de temas, previews
  en `ThemePreview`) van inline con los VALORES de la DB; el chrome alrededor
  sí usa tokens.
- Sombras: Tailwind v4 no tiene token de sombra → tres sombras inline
  documentadas (Card, panel de ConfirmModal, popup de ProfileMenu). No crear
  más sin añadirlas aquí.

### 3.3 i18n (paraglide v2)

- Claves **snake_case inglesas y planas** (`admin_settings_tokens_for`): el
  compilador aplana los puntos a `_`; no intentes acceso anidado `m.a.b()`.
- Todo texto visible sale de `messages/en.json` + `messages/es.json`
  (mismas claves); el código nunca tiene texto de UI hardcodeado.
- Tras editar los json: `rm -rf src/lib/paraglide/messages && npx
@inlang/paraglide-js compile --project ./project.inlang --outdir
./src/lib/paraglide` (el `rm` limpia exports obsoletos).
- El locale vive en la cookie `PARAGLIDE_LOCALE` (cookie-first): se lee con
  `getLocale()`, no deduciendo del pathname.

### 3.4 Contrato de acciones admin (server ↔ cliente)

Las pages con acciones no usan `<form use:enhance>`; usan un helper
`callAction(name, fields)` que hace `POST ?/nombre`:

- El server **jamás devuelve texto de error**: `fail(status, { errorKey:
'clave' })` con claves de la lista de `src/lib/i18n/errors.ts`.
- El cliente traduce con `errorMessage(errorKey)` → paraglide, así el mensaje
  sale siempre en el idioma del visitante y el server queda sin UI.
- Respuestas de éxito llevan datos planos (`{ ok: true, newId }`).
- Nombres de campos de form = columnas de DB (`themeId`, `tokens_light`) o
  inglés explícito (`field`, `file`); los contratos internos se renombran
  server y cliente en el mismo commit.

### 3.5 Seguridad (reglas duras)

- **`sb_secret_*` JAMÁS en variables `PUBLIC_*`** ni en código cliente; solo
  `sb_publishable_*`/anon en `PUBLIC_SUPABASE_ANON_KEY`. `.env` está
  gitignoreado.
- El guard del admin vive en `admin/+layout.server.ts` (load de servidor);
  **cada action re-verifica sesión** con `fail(401, { errorKey: 'no_session' })`
  y **RLS es la segunda barrera** — nunca confiar solo en el guard del layout.
- Subidas al bucket `media` (público): whitelist de MIME (png/jpeg/webp/svg)
  - tope 2 MB + ruta con timestamp (`logo-<Date.now()>.png`) para invalidar
    caché al reemplazar.
- El MCP de Postgres del entorno apunta a OTRA base de datos (un proyecto
  Django): no usarlo para nada de este proyecto.

### 3.6 Convenciones de lenguaje

- **Identificadores en inglés** (variables, funciones, props, tipos, nombres
  de archivo, claves de paraglide, contratos internos, cookies).
- **Comentarios en español.**
- Strings visibles al usuario: solo valores de `messages/*.json`.
- Valores escritos en DB también en inglés (`-copy`, `" (copy)"`, roles
  `admin|staff|customer`).

### 3.7 Flujo de tema (público y admin)

1. Cookie `theme-mode` (leída en el load raíz) → `theme.mode` en el store.
2. Script inline de `app.html` aplica `data-mode` antes de hidratar (sin flash).
3. Toggles (`ThemeToggle`/`LanguageToggle`) son componentes reutilizados en
   público (header) y admin (cluster flotante: perfil, idioma, tema).

### 3.8 Estado global

Solo dos stores (`stores/*.svelte.ts`, patrón módulo con estado rune):
`theme` (modo claro/oscuro) y `toasts` (`push(tone, message)`). Todo lo demás
es estado local de página con dirty-tracking + `SaveBar` único.

## 4. Comandos del día a día

```bash
pnpm exec prettier --write src messages docs   # tabs; reformatea al guardar
pnpm exec eslint src                           # debe quedar en 0
pnpm check                                     # svelte-check, 0 errores
pnpm build                                     # verificación final
# tras editar messages/*.json:
rm -rf src/lib/paraglide/messages && \
  npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
```

Smoke manual con Playwright: script en `/tmp/smoke.mjs` (chromium del sistema,
`/usr/bin/chromium`, dev server en 5199).

## 5. Deuda y pendientes conocidos

- `/admin/profile` es un **placeholder** (avatar, nombre, rol) — el usuario
  define su diseño final.
- Cerrar sesión existe dos veces (popup de perfil y footer del sidebar);
  decidir si se elimina el del sidebar.
- Checkout futuro: solo enums de estado definidos; tablas `carts/orders/…`
  llegan después (ver `shopify-data-model.md` §5).
- Rutas `demo/` eliminadas del repo; no recrearlas.
