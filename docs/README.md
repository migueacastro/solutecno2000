# Estudio de diseño — solutecno2000

Estudio de patrones UI/UX y de modelo de datos basado en **Shopify** (fuente de patrones de e-commerce mejor documentada y verificada) con el **alcance sencillo estilo GoDaddy** (catálogo con "consultar precio" + blog, sin carrito por ahora).

**Alcance del producto:**
- Catálogo de productos con modelo de contacto/cotización (no checkout aún — pero con puente diseñado para agregarlo después)
- Blog híbrido: mdsvex en el repo (fuente de verdad) + tabla `posts` en Supabase
- Cuentas de usuario vía Supabase Auth con OAuth de Google (análogo directo a las Shopify Accounts)
- Panel admin estilo Shopify (patrones de Polaris)

## Documentos

| Doc | Contenido | Estado |
|---|---|---|
| [`storefront-patterns-dawn.md`](storefront-patterns-dawn.md) | Patrones del storefront: grid de catálogo, cards, PDP, header, tipografía, secciones de homepage | ✅ |
| [`shopify-data-model.md`](shopify-data-model.md) | Modelo de datos de Shopify (customers, staff, products, collections, checkout) y esquema PostgreSQL recomendado | ✅ |
| [`admin-patterns-polaris.md`](admin-patterns-polaris.md) | Patrones UX del panel admin (Polaris): shell, listas, detalles, formularios, tokens, top-10 a replicar | ✅ |

Fuentes: código fuente de Dawn v16 (GitHub), API Admin GraphQL 2026-07 (shopify.dev), Polaris tokens/docs (shopify.dev + `@shopify/polaris-tokens` npm), help.shopify.com. Todo verificado contra fuentes primarias, no blogs.

## Decisiones derivadas para el proyecto

1. **Roles**: `profiles.role ∈ {admin, staff, customer}` — el staff nunca vive en `customers` (como Shopify separa StaffMember de Customer).
2. **Producto con ciclo de vida**: reemplazar `is_published bool` por `status ∈ {draft, active, archived, unlisted}` (ver `shopify-data-model.md` §3).
3. **"Consultar precio"**: `price` nullable + `price_on_request bool` — sin migraciones futuras.
4. **Metafields** como tabla polimórfica única `(owner_type, owner_id, namespace, key)` desde el día uno.
5. **Checkout futuro**: solo definir enums de estado ahora; tablas `carts/orders/line_items/...` llegan después (ver §5 del modelo de datos).