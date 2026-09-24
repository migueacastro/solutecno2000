# Modelo de datos de Shopify — referencia para el esquema de solutecno2000

> Estudio verificado contra la referencia de la Admin GraphQL API (versión **2026-07**) en shopify.dev y help.shopify.com, sept. 2026. Campos marcados como deprecados donde aplica. Para cualquier URL de shopify.dev se puede agregar `.md` al final para obtener el texto plano.

Objetivo: informar el diseño de nuestro esquema PostgreSQL (Supabase con RLS) para catálogo + blog + cuentas Google OAuth + admin estilo Shopify + puente para checkout futuro.

---

## 1. Customers

### 1a. Objeto `Customer` (Admin GraphQL)

Fuente: https://shopify.dev/docs/api/admin-graphql/latest/objects/Customer (~40 campos activos)

| Campo                      | Tipo                        | Notas                                                                                      |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| `id`                       | ID!                         | Globalmente único (`gid://shopify/Customer/…`)                                             |
| `firstName` / `lastName`   | String                      | Nullable                                                                                   |
| `displayName`              | String!                     | Derivado: cae al email, luego al phone                                                     |
| `defaultEmailAddress`      | CustomerEmailAddress        | Reemplazo V2 del deprecado `email`                                                         |
| `defaultPhoneNumber`       | CustomerPhoneNumber         | Reemplazo V2 del deprecado `phone`                                                         |
| `defaultAddress`           | MailingAddress              | Nullable                                                                                   |
| `addressesV2`              | MailingAddressConnection!   | Reemplaza el deprecado `addresses`                                                         |
| `note`                     | String                      | Nota libre del staff sobre el cliente                                                      |
| `tags`                     | [String!]!                  | Tags; el update sobrescribe los existentes                                                 |
| `numberOfOrders`           | UnsignedInt64!              | Conteo de órdenes de por vida (REST `orders_count`)                                        |
| `amountSpent`              | MoneyV2!                    | Gasto total de por vida (REST `total_spent`)                                               |
| `verifiedEmail`            | Boolean!                    | Default true al crear vía admin/API                                                        |
| `taxExempt`                | Boolean!                    | + `taxExemptions`, `taxSettings`                                                           |
| `state`                    | CustomerState!              | Enum: `DECLINED`, `DISABLED`, `ENABLED`, `INVITED` — solo relevante con cuentas _clásicas_ |
| `locale`                   | String!                     |                                                                                            |
| `image`                    | Image!                      | Avatar del cliente                                                                         |
| `identityProviderSubjects` | [IdentityProviderSubject!]! | IDs de sujetos de IdPs externos (cuentas nuevas)                                           |
| `lastOrder` / `orders`     | Order / OrderConnection!    | Customer ↔ orders es 1:N                                                                   |
| `metafields`               | MetafieldConnection!        | Datos custom                                                                               |
| `statistics`               | CustomerStatistics!         | Computado: `predictedSpendTier`, `rfmGroup`                                                |
| `canDelete`                | Boolean!                    | Un customer solo puede borrarse si **no tiene órdenes**                                    |
| `createdAt` / `updatedAt`  | DateTime!                   |                                                                                            |
| `dataSaleOptOut`           | Boolean!                    | Opt-out GDPR de venta de datos                                                             |

REST parity ([REST Customer](https://shopify.dev/docs/api/admin-rest/latest/resources/customer)): `first_name`, `last_name`, `email`, `phone`, `note`, `tags` (string), `orders_count`, `total_spent`, `verified_email`, `tax_exempt`, `state`, `default_address`, `addresses[]`, `email_marketing_consent{state, opt_in_level, consent_updated_at}`, `sms_marketing_consent`, `metafields`, timestamps.

### 1b. "New customer accounts" (sistema actual) — login y experiencia

Fuentes: https://help.shopify.com/en/manual/checkout-settings/customer-accounts , https://shopify.dev/docs/storefronts/themes/customer-accounts/login-page , https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/authenticate-customers

- **Email OTP sin password**: el cliente entra su email y recibe un **código de 6 dígitos de un solo uso**; sin password ni reset. Las sesiones persisten **hasta 365 días**.
- **OAuth social**: el template de login expone botones `verification_provider` para **Google y Apple**; el Help Center describe también **"Social sign-in: Google y Facebook"** + **"Sign in with Shop"** (Shop Pay + passkeys). Shopify Plus puede reemplazar el login con un IdP custom.
- **Auto-provisioning**: cualquier email que se loguea sin perfil existente **crea el customer automáticamente**; los perfiles existentes no necesitan activación.
- **Experiencia del cliente** ([Customer Account API](https://shopify.dev/docs/api/customer/latest/objects/Customer)): órdenes, suscripciones, draft orders (B2B), direcciones + default, edición de perfil (el cambio de email exige re-verificación y **está bloqueado si el login fue vía IdP externo**), store credit, metafields, tags.
- **Customer ↔ orders**: `Customer.orders` / `Order.customer`; las órdenes de guest checkout tienen `customer = null` pero llevan `email`/`phone` denormalizados en la Order.
- **Auth headless**: OAuth 2.0 + PKCE; los apps deben solicitar acceso a Protected Customer Data (nivel 2: nombre, apellido, email). Los access tokens son el artefacto de sesión.

---

## 2. Staff / usuarios admin y permisos

### 2a. Objeto `StaffMember` (recurso separado de Customer)

Fuente: https://shopify.dev/docs/api/admin-graphql/latest/objects/StaffMember

`id`, `email`, `firstName`/`lastName`/`name`, `initials`, `phone`, `avatar`, `locale`, `active`, `isShopOwner`, `accountType` (enum `AccountType`: `COLLABORATOR`, `COLLABORATOR_TEAM_MEMBER`, `INVITED`, `INVITED_STORE_OWNER`, `REGULAR`, `REQUESTED`, `RESTRICTED`, `SAML`), `privateData`. Las órdenes exponen `Order.staffMember` — atribución de quién creó/editó una orden manual.

**El staff es un reino de acceso completamente separado de los customers**: el staff entra al admin, los customers solo a su cuenta de la tienda.

### 2b. Roles y granularidad de permisos

Fuentes: [staff permissions](https://help.shopify.com/en/manual/your-account/staff-accounts/staff-permissions), [descripciones](https://help.shopify.com/en/manual/your-account/staff-accounts/staff-permissions/staff-permissions-descriptions), [roles](https://help.shopify.com/en/manual/your-account/users/roles)

- **Roles** = definición de trabajo que empaqueta permisos granulares; un usuario puede tener **múltiples roles con permisos acumulativos**; categorías: Store, Organization, POS, Partner; existen roles predefinidos (ej. _Merchandiser_: Home + Products + Catalogs + Content).
- **Categorías de permisos de tienda**: Home, Orders, Draft orders, Products, Inventory, Catalogs, Gift cards, Customers, Analytics, Marketing, Discounts, Content, Files, Online store, Checkout and customer accounts, Companies, App development, Store settings, Finance.
- **Granularidad ejemplo (split view/write)**:
  - Orders: View, Manage order information, Edit orders, Apply discounts, Set payment terms, Charge credit card, Record payments, Capture payments, Fulfill and ship, Buy shipping labels, Return, Refund..., Cancel, Export, Delete, Abandoned checkouts > Manage, Disputes > Manage.
  - Products: View, **View cost**, Create and edit, **Edit cost**, **Edit price**, Export, Delete — "Create and edit" explícitamente **no incluye** editar precio/costo (tres permisos separados).
  - Customers: View, Create and edit, Erase personal data, Request data, Export, Merge, View/Edit store credit, Delete.
  - Online store: Themes, Edit code, **Blog posts and pages**; Content (Menus, Metaobjects), Files (View/Create/Edit/Delete).
- **Semántica de dependencias**: elegir un permiso top-level auto-selecciona los requeridos; Content/Products/Online-store auto-seleccionan permisos de Files.
- **Límite de alcance**: los permisos de tienda aplican store-wide — no se pueden restringir a órdenes/productos individuales (excepciones: grants por app/canal; B2B "restrict to assigned company locations").

### 2c. Collaborators

Fuente: https://help.shopify.com/en/manual/your-account/staff-accounts/security/collaborator-accounts

Cuentas de agencias partner que piden acceso con un **código de 4 dígitos**; cada request genera un **rol autogenerado** según los permisos pedidos, que el owner edita antes de aceptar; el rol **Administrator no puede asignarse** a collaborators; el acceso **expira tras 90 días de inactividad**; no cuentan en el límite de usuarios.

---

## 3. Products

Fuentes: [Product](https://shopify.dev/docs/api/admin-graphql/latest/objects/Product), [ProductVariant](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariant), [ProductOption](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductOption), [MediaImage](https://shopify.dev/docs/api/admin-graphql/latest/objects/MediaImage), [Metafield](https://shopify.dev/docs/api/admin-graphql/latest/objects/Metafield)

### Product (campos clave)

| Campo                                  | Tipo                              | Notas                                                                                                                                                         |
| -------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                | String!                           | Genera el handle                                                                                                                                              |
| `handle`                               | String!                           | Slug único: letras, guiones, números; parte de la URL                                                                                                         |
| `description` / `descriptionHtml`      | String! / HTML!                   | Resumen plano / cuerpo rico                                                                                                                                   |
| `vendor`                               | String!                           | Texto libre                                                                                                                                                   |
| `productType`                          | String!                           | Tipo definido por el merchant                                                                                                                                 |
| `tags`                                 | [String!]!                        | Lista de keywords; update sobrescribe                                                                                                                         |
| `status`                               | ProductStatus!                    | **`ACTIVE` / `ARCHIVED` / `DRAFT` / `UNLISTED`** — UNLISTED agregado en 2025-10: activo pero solo alcanzable por link directo, oculto de búsqueda/collections |
| `publishedAt`                          | DateTime                          | Momento de publicación al online store                                                                                                                        |
| `onlineStoreUrl`                       | URL                               | **Null si no está publicado** — actúa como flag de publicado                                                                                                  |
| `variants` / `variantsCount`           | ProductVariantConnection! / Count |                                                                                                                                                               |
| `options`                              | [ProductOption!]!                 |                                                                                                                                                               |
| `media` / `featuredMedia`              | MediaConnection! / Media          | Imágenes, modelos 3D, videos                                                                                                                                  |
| `priceRangeV2` / `compareAtPriceRange` | ProductPriceRangeV2!              | Min/max de precio y compare-at                                                                                                                                |
| `totalInventory` / `tracksInventory`   | Int! / Boolean!                   |                                                                                                                                                               |
| `category`                             | TaxonomyCategory                  | Taxonomía estándar de Shopify                                                                                                                                 |
| `seo`                                  | SEO!                              | `title` + `description`                                                                                                                                       |
| `collections`                          | CollectionConnection!             | M2M                                                                                                                                                           |
| `metafields`                           | MetafieldConnection!              |                                                                                                                                                               |
| `createdAt` / `updatedAt`              | DateTime!                         |                                                                                                                                                               |

### ProductVariant

| Campo                                | Tipo               | Notas                                                  |
| ------------------------------------ | ------------------ | ------------------------------------------------------ |
| `title` / `displayName`              | String!            | Título de variante / "Producto + Variante"             |
| `position`                           | Int!               | Orden 1-based                                          |
| `price`                              | Money!             | Moneda default de la tienda                            |
| `compareAtPrice`                     | Money              | El "precio original" para el tachado                   |
| `sku`                                | String             |                                                        |
| `barcode`                            | String             | UPC/EAN                                                |
| `inventoryQuantity`                  | Int                | Total vendible                                         |
| `inventoryPolicy`                    | Enum!              | `DENY` (default: parar en 0) / `CONTINUE` (sobreventa) |
| `selectedOptions`                    | [SelectedOption!]! | `{optionName, name}` por opción                        |
| `taxable`                            | Boolean!           |                                                        |
| `availableForSale`                   | Boolean!           | Disponibilidad visible en storefront                   |
| `unitPrice` / `unitPriceMeasurement` | —                  | Precio por unidad (peso/volumen)                       |

### ProductOption

`id`, `name`, `position`, `values ([String!]!)`, `optionValues` (objetos completos incl. valores no usados por variantes), `linkedMetafield`.

### Media

`media` cubre **imágenes, modelos 3D y videos**; `MediaImage`: `id`, `alt`, `mediaContentType`, `status` (`READY`/`PROCESSING`/`FAILED`/`UPLOADED`), `image {src, width, height}` (null hasta READY). El orden va por las posiciones de la connection `media` del producto.

### Metafield (el patrón más reutilizable de Shopify)

`id`, `namespace`, `key` (único dentro del namespace), `value` (**siempre String**, sea cual sea el tipo), `type` (nombre del tipo, ej. `single_line_text_field`, `number_integer`), `jsonValue`, `owner` + `ownerType` (owner polimórfico), `createdAt`/`updatedAt`.

---

## 4. Collections

Fuente: [Collection](https://shopify.dev/docs/api/admin-graphql/latest/objects/Collection), [REST SmartCollection](https://shopify.dev/docs/api/admin-rest/latest/resources/smartcollection), [CollectionPublication](https://shopify.dev/docs/api/admin-graphql/latest/objects/CollectionPublication)

- En la última Admin GraphQL, `SmartCollection`/`ManualCollection` se **unificaron en `Collection`** (ambas legacy 404; `Collection.sources` describe cómo entran los productos).
- **Campos de Collection**: `id`, `title`, `handle` (autogenerado), `description`/`descriptionHtml`, `image`, `seo`, `sortOrder` (enum), `products` (M2M), `productsCount`, `metafields`, timestamps.
- **Smart collections (automáticas)** — el shape REST sigue siendo autoritativo para las reglas:
  - `rules: [{column, relation, condition}]`
  - `column`: texto → `title`, `type`, `vendor`, `variant_title`; numérico → `variant_price`, `variant_compare_at_price`, `variant_inventory`, `variant_weight`; tag → `tag`; metafield → `product_metafield_definition`
  - `relation`: `equals`, `not_equals`, `greater_than`, `less_than`, `starts_with`, `ends_with`, `contains`, `not_contains`
  - `disjunctive`: `true` = matchea **cualquier** regla (OR), `false` = **todas** (AND)
- **Product ↔ Collection es many-to-many**. La publicación es por canal: `CollectionPublication { collection, publication, isPublished, publishDate }` — mismo patrón `ResourcePublication` para productos.

---

## 5. Entidades de checkout (puente futuro)

### Order (campos clave)

Fuente: [Order](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order)

| Campo                                       | Tipo                | Notas                                                                                                                                                    |
| ------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                                      | String!             | ID visible, ej. `#1001` (con prefijo/sufijo)                                                                                                             |
| `number`                                    | Int!                | Secuencial usado para construir `name`                                                                                                                   |
| `confirmationNumber`                        | String              | ID aleatorio para el cliente                                                                                                                             |
| `currencyCode` / `presentmentCurrencyCode`  | CurrencyCode!       | Moneda de la tienda vs del comprador                                                                                                                     |
| `customer`                                  | Customer            | **Null en guest checkout**                                                                                                                               |
| `email` / `phone`                           | String              | Contacto denormalizado del checkout                                                                                                                      |
| `billingAddress` / `shippingAddress`        | MailingAddress      | **Snapshot por valor, no FK**                                                                                                                            |
| `lineItems`                                 | LineItemConnection! |                                                                                                                                                          |
| `*PriceSet`                                 | MoneyBag            | Shopify mantiene **totales current vs original** (tras edits/refunds); MoneyBag = montos de tienda + presentment                                         |
| `displayFinancialStatus`                    | Enum!               | `PENDING`, `AUTHORIZED`, `PAID`, `PARTIALLY_PAID`, `PARTIALLY_REFUNDED`, `REFUNDED`, `VOIDED`, `EXPIRED`                                                 |
| `displayFulfillmentStatus`                  | Enum!               | `UNFULFILLED`, `PENDING_FULFILLMENT`, `OPEN`, `IN_PROGRESS`, `PARTIALLY_FULFILLED`, `FULFILLED`, `ON_HOLD`, `SCHEDULED`, `REQUEST_DECLINED`, `RESTOCKED` |
| `fulfillments` / `transactions` / `refunds` | —                   |                                                                                                                                                          |
| `cancelledAt`, `cancelReason`, `closedAt`   | —                   |                                                                                                                                                          |
| `note` (≤5000), `tags`, `customAttributes`  | —                   | Metadata merchant/cliente                                                                                                                                |
| `staffMember`                               | StaffMember         | Quién creó la orden manual                                                                                                                               |

### LineItem

`id`, `name`/`title`/`variantTitle` (**snapshot al momento de la orden**), `quantity`, `currentQuantity` (excl. refunded), `sku`, `vendor`, `originalUnitPriceSet`/`discountedUnitPriceSet`/`totalDiscountSet`, `taxLines`, `requiresShipping`, `customAttributes`, `image`, `variant → product` (**nullable — los line items sobreviven al borrado del producto**).

### Fulfillment

`id`, `order`, `status` (`SUCCESS`, `PENDING`, `OPEN`, `CANCELLED`, `FAILURE`, `ERROR`), `displayStatus` (18 estados visibles incl. `IN_TRANSIT`, `DELIVERED`, `OUT_FOR_DELIVERY`), `fulfillmentLineItems` (M2M — permite envíos parciales), `totalQuantity`, `location`, `trackingInfo` (company, number, URL), timestamps de in-transit/delivered.

### Transaction (`OrderTransaction`)

`id`, `order_id`, `kind` (`AUTHORIZATION`, `CAPTURE`, `SALE`, `REFUND`, `VOID`, `CHANGE`...), `amount`/`amountSet`, `currency`, `gateway`, `paymentId` (`#1001.2`), `status` (`success`/`pending`/`failure`), `parent_id` (capture → authorization), `authorization`, `payment_details` (**solo tarjeta enmascarada: `•••• 4242`** — jamás el PAN crudo), `receipt` (JSON gateway-specific, "no es un contrato estable"), `error_code`, `test`, `processed_at`.

### DraftOrder (también es el vehículo de cotizaciones)

`id`, `name` (`#D1223`), `customer`, `email`, lineItems con **precios sobrescritos custom** (`allVariantPricesOverridden`), `appliedDiscount`, `paymentTerms`, `deposit`, `invoiceUrl` + `invoiceSentAt` (el link de pago enviado al cliente), `completedAt`, `order` (link a la Order convertida). Ciclo de vida REST: `open` → `invoice_sent` → `completed`.

### AbandonedCheckout

`id`, `abandonedCheckoutUrl` (link de recuperación), `completedAt` (**null = no convertido**), `customer` (nullable), `billingAddress`/`shippingAddress`, `lineItems`, totales, `discountCodes`, `customAttributes`. Las orders llevan `cartToken`/`checkoutToken` para correlacionar orden ↔ checkout abandonado.

---

## 6. Precio: compare-at, precios ocultos, "price on request"

- **Price vs compare-at**: cada variante lleva `price` y `compareAtPrice`; los productos exponen rangos min/max. Los temas renderizan compare-at como precio tachado "was/regular".
- **No existe un campo nativo "price on request"**. Los enfoques soportados del ecosistema:
  1. **B2B catalogs + price lists** (Plus): ajustes por porcentaje o precios fijos por variante.
  2. **Draft orders con precios custom en cualquier plan**: crear un draft order con precios custom y enviar el `invoiceUrl` para que el cliente pague.
  3. **Ocultar precio a nivel de tema**: Liquid `{% if customer %}{{ product.price }}{% else %}…{% endif %}`.
  4. **Apps de terceros** (BSS Hide Price, Piper Quote Request...): reemplazan el precio por "Get a Quote", con gating por tags de cliente o login.
- **Implicación de esquema**: `price` debe ser nullable o acompañarse de un boolean `price_on_request`; el pricing por cliente (si algún día hace falta) es una tabla separada `price_lists`, no una columna en la variante.

---

## 7. Esquema PostgreSQL recomendado para Supabase

Contexto del stack: SvelteKit + Supabase, mdsvex + tabla `posts`, Google OAuth customers vía Supabase Auth (que además da email OTP/magic links — el análogo directo del código de 6 dígitos de Shopify).

### 7a. Crear AHORA

| Tabla                                                                 | Columnas clave                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Mapeo a Shopify                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`profiles`**                                                        | `id uuid PK = auth.users.id`, `display_name`, `avatar_url`, `locale`, `role` enum `('admin','staff','customer')` NOT NULL DEFAULT `'customer'`, timestamps                                                                                                                                                                                                                                                                                                                                                   | Separa staff/admin de customers exactamente como Shopify (StaffMember ≠ Customer). Una fila por usuario de auth.                                                                                                                                                                  |
| **`staff_permissions`** (solo si se quiere granularidad tipo Shopify) | `user_id FK→profiles`, `area` text (`products`,`customers`,`collections`,`content`,`files`,`settings`,`blog`,`checkout`), `can_view bool`, `can_write bool`, PK `(user_id, area)`                                                                                                                                                                                                                                                                                                                            | Categorías de permisos con split View/Create-and-edit; `role='admin'` lo bypasea (es el "Administrator"). Alternativa más simple: columna jsonb.                                                                                                                                  |
| **`products`**                                                        | `id uuid PK`, `title`, `handle citext UNIQUE NOT NULL`, `description text`, `description_html text`, `vendor text`, `product_type text`, `status` enum `('draft','active','archived','unlisted')` DEFAULT `'draft'`, `tags text[]` + GIN, `seo jsonb`, `published_at timestamptz`, timestamps                                                                                                                                                                                                                | Ciclo de vida draft/active/archived (incl. UNLISTED de 2025). `status='active' AND published_at IS NOT NULL` = "en tienda".                                                                                                                                                       |
| **`product_options`**                                                 | `id uuid PK`, `product_id FK`, `name`, `position int`, `values text[]`                                                                                                                                                                                                                                                                                                                                                                                                                                       | ProductOption                                                                                                                                                                                                                                                                     |
| **`product_variants`**                                                | `id uuid PK`, `product_id FK`, `title`, `position`, `price numeric(12,2)` **nullable**, `price_on_request bool DEFAULT false`, `compare_at_price numeric(12,2)`, `currency char(3) DEFAULT 'EUR'`, `sku`, `barcode`, `inventory_quantity int DEFAULT 0`, `tracks_inventory bool DEFAULT true`, `inventory_policy enum ('deny','continue') DEFAULT 'deny'`, `taxable bool DEFAULT true`, `selected_options jsonb[]`, timestamps                                                                               | ProductVariant. `price NULL + price_on_request=true` implementa la venta por cotización; `compare_at_price` para el tachado.                                                                                                                                                      |
| **`media`**                                                           | `id uuid PK`, `kind enum ('image','video','model')`, `url`, `alt`, `width`, `height`, `mime_type`, `status enum ('uploaded','processing','ready','failed') DEFAULT 'ready'`, `created_at`                                                                                                                                                                                                                                                                                                                    | MediaImage/File con ciclo de status                                                                                                                                                                                                                                               |
| **`product_media`**                                                   | `product_id`, `media_id`, `position int`, `is_featured bool`, PK `(product_id, media_id)`                                                                                                                                                                                                                                                                                                                                                                                                                    | Connection `media` con ordening; `is_featured` = featured image                                                                                                                                                                                                                   |
| **`collections`**                                                     | `id uuid PK`, `title`, `handle citext UNIQUE`, `description_html`, `image_id FK→media`, `sort_order text`, `is_smart bool DEFAULT false`, `rule_set jsonb` (`{disjunctive, rules[]}`), `published_at`, timestamps                                                                                                                                                                                                                                                                                            | Collection + ruleSet de smart collections en jsonb (evaluar en SQL/RPC: AND si `disjunctive=false`, OR si true)                                                                                                                                                                   |
| **`collection_products`**                                             | `collection_id`, `product_id`, `position int` (orden manual), PK compuesta                                                                                                                                                                                                                                                                                                                                                                                                                                   | M2M manual + ordering; la membresía smart queda computada de `rule_set`, sin denormalizar                                                                                                                                                                                         |
| **`metafields`**                                                      | `owner_type` enum `('product','variant','collection','customer','order','post')`, `owner_id uuid`, `namespace`, `key`, `value text`, `type text`, PK `(owner_type, owner_id, namespace, key)`                                                                                                                                                                                                                                                                                                                | Patrón Metafield: owner polimórfico, value siempre string, namespace/key/type — una sola tabla para todo                                                                                                                                                                          |
| **`customers`**                                                       | `id uuid PK`, `user_id uuid UNIQUE FK→profiles NULL`, `email citext UNIQUE`, `email_verified bool`, `phone`, `first_name`, `last_name`, `display_name`, `note text` (solo staff), `tags text[]` + GIN, `locale`, `orders_count int DEFAULT 0`, `total_spent numeric(12,2) DEFAULT 0`, `tax_exempt bool DEFAULT false`, `data_sale_opt_out bool DEFAULT false`, `state enum ('invited','enabled','disabled','declined') DEFAULT 'enabled'`, `identity_provider text` (`'google'`/`'email_otp'`/…), timestamps | Admin `Customer` + REST. `user_id` **nullable** para que el staff pueda crear perfiles CRM antes del primer login; auto-crear al signup (trigger sobre `auth.users`) — replica el auto-provisioning de Shopify. `orders_count`/`total_spent` como columnas de resumen mantenidas. |
| **`customer_addresses`**                                              | `id uuid PK`, `customer_id FK`, `first_name`, `last_name`, `company`, `address1`, `address2`, `city`, `province`, `country_code char(2)`, `zip`, `phone`, `is_default bool`                                                                                                                                                                                                                                                                                                                                  | MailingAddress                                                                                                                                                                                                                                                                    |

### 7b. Blog (ya existe parcialmente — ajustar, no reconstruir)

Mantener mdsvex + `posts`; agregar `status enum ('draft','published','archived')` + `published_at` (espejo del status de productos), `tags text[]`, `author_id → profiles`, y opcionalmente `seo jsonb`. El permiso "Blog posts and pages" de Shopify mapea a un área `blog` en `staff_permissions`.

### 7c. Crear DESPUÉS (puente de checkout — solo hooks por ahora)

| Tabla                        | Columnas clave                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Mapeo                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **`carts`**                  | `id`, `customer_id FK NULL`, `email`, `token uuid UNIQUE`, `currency_code`, `total_price`, `subtotal_price`, `completed_at timestamptz` (NULL = abandonado), `abandoned_url`, timestamps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | AbandonedCheckout (`completed_at IS NULL` = abandonado; link de recuperación)      |
| **`cart_line_items`**        | `cart_id`, `variant_id`, `product_title` snapshot, `quantity`, `unit_price`, `custom_attributes jsonb`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | AbandonedCheckoutLineItem                                                          |
| **`orders`**                 | `id uuid PK`, `order_number bigserial`, `order_name text` (`#1001`), `customer_id FK NULL` (guest ⇒ NULL), `email`, `phone`, `billing_address jsonb`, `shipping_address jsonb` (**snapshots, nunca FK**), `currency_code`, `presentment_currency_code`, `financial_status enum ('pending','authorized','paid','partially_paid','partially_refunded','refunded','voided','expired')`, `fulfillment_status enum ('unfulfilled','in_progress','partially_fulfilled','fulfilled','on_hold','scheduled','restocked')`, `subtotal_price`, `total_price`, `total_tax`, `total_discounts`, `total_shipping`, `taxes_included`, `tax_lines jsonb`, `note`, `tags`, `custom_attributes jsonb`, `source_name`, `test bool`, `cancelled_at`, `cancel_reason`, `closed_at`, `processed_at`, `staff_member_id FK→profiles`, timestamps | Order (enums copiados textualmente; atribución `staffMember`)                      |
| **`order_line_items`**       | `order_id`, `variant_id FK NULL` (sobrevive borrado del producto), `product_title`, `variant_title`, `sku`, `image_url` (snapshots), `quantity`, `unit_price`, `total_price`, `total_discount`, `tax_lines jsonb`, `requires_shipping`, `custom_attributes jsonb`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | LineItem                                                                           |
| **`fulfillments`**           | `order_id`, `status enum ('pending','open','success','cancelled','error','failure')`, `display_status`, `tracking_company`, `tracking_number`, `tracking_url`, `total_quantity`, `in_transit_at`, `delivered_at`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Fulfillment + tracking                                                             |
| **`fulfillment_line_items`** | `fulfillment_id`, `order_line_item_id`, `quantity`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | M2M para envíos parciales                                                          |
| **`transactions`**           | `order_id`, `kind enum ('authorization','capture','sale','refund','void','change')`, `amount`, `currency`, `gateway`, `parent_transaction_id FK self` (capture→authorization), `status enum ('success','pending','failure')`, `payment_details jsonb` (**solo enmascarado**), `receipt jsonb`, `processed_at`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | OrderTransaction                                                                   |
| **`draft_orders`**           | `customer_id FK NULL`, `email`, `name`, `line_items jsonb` (con **precios sobrescritos**), `applied_discount jsonb`, `status enum ('open','invoice_sent','completed')`, `invoice_url`, `invoice_sent_at`, `completed_at`, `order_id FK NULL`, `note`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | DraftOrder — también es el vehículo de cotizaciones/RFQ para la venta por consulta |

### 7d. Decisiones de diseño a fijar ya

1. **Una sola tabla `metafields` con PK `(owner_type, owner_id, namespace, key)`** desde el día uno — es el concepto más reutilizable de Shopify y también beneficia a los posts del blog.
2. **Enum de status en todo**: `product_status` incluye `unlisted` desde el inicio (barato ahora, alineado con Shopify 2026).
3. **Dinero como `numeric(12,2)` + `currency char(3)` explícita**, nunca floats; `price nullable + price_on_request bool` para que la venta por cotización no requiera migración.
4. **Snapshots, no referencias** en órdenes/direcciones — los títulos y direcciones se copian a la orden al momento de la compra (los LineItem de Shopify guardan snapshots para que las órdenes sobrevivan ediciones del catálogo).
5. **Staff ≠ customers estructuralmente**: una tabla `profiles` con columna role (identidad auth), más una tabla `customers` opcionalmente ligada por `user_id`. Nunca guardar staff en `customers`. Hace RLS simple.
6. **Google OAuth + email OTP** son first-class en Supabase Auth (config de provider + magic link/OTP) — registrar el método de login usado en `customers.identity_provider` para replicar la regla de Shopify "email no editable si el login fue vía IdP externo".
7. **`tags` como `text[]` con índice GIN** y semántica de sobrescritura al guardar, como Shopify.

### 7e. Forma de las políticas RLS

- Helper `is_staff()`: `exists (select 1 from profiles where id = auth.uid() and role in ('admin','staff'))`.
- **Lectura pública** (anon/authenticated): products/variants/collections/media donde `status='active' AND published_at IS NOT NULL`.
- **Escritura**: solo staff/admin vía `is_staff()`.
- **`profiles`**: self-read; self-update solo `display_name`/`avatar_url`; admin/staff leen todos.
- **`customers`/`customer_addresses`**: el usuario lee/actualiza su propia fila (`user_id = auth.uid()`); el staff con permiso `customers` lee todas; `note`/`tags` solo visibles para staff.
- **`metafields`**: escritura staff-only; lectura pública solo para namespaces whitelisteados.

---

Fuentes: [Customer (Admin GraphQL)](https://shopify.dev/docs/api/admin-graphql/latest/objects/Customer), [Product](https://shopify.dev/docs/api/admin-graphql/latest/objects/Product), [ProductVariant](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariant), [ProductOption](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductOption), [Collection](https://shopify.dev/docs/api/admin-graphql/latest/objects/Collection), [Metafield](https://shopify.dev/docs/api/admin-graphql/latest/objects/Metafield), [MediaImage](https://shopify.dev/docs/api/admin-graphql/latest/objects/MediaImage), [MailingAddress](https://shopify.dev/docs/api/admin-graphql/latest/objects/MailingAddress), [Order](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order), [LineItem](https://shopify.dev/docs/api/admin-graphql/latest/objects/LineItem), [Fulfillment](https://shopify.dev/docs/api/admin-graphql/latest/objects/Fulfillment), [OrderTransaction](https://shopify.dev/docs/api/admin-graphql/latest/objects/OrderTransaction), [DraftOrder](https://shopify.dev/docs/api/admin-graphql/latest/objects/DraftOrder), [AbandonedCheckout](https://shopify.dev/docs/api/admin-graphql/latest/objects/AbandonedCheckout), [StaffMember](https://shopify.dev/docs/api/admin-graphql/latest/objects/StaffMember), [ProductStatus](https://shopify.dev/docs/api/admin-graphql/latest/enums/ProductStatus), [CustomerState](https://shopify.dev/docs/api/admin-graphql/latest/enums/CustomerState), [Customer Account API](https://shopify.dev/docs/api/customer/latest/objects/Customer), [Customer accounts (Help)](https://help.shopify.com/en/manual/checkout-settings/customer-accounts), [Staff permissions](https://help.shopify.com/en/manual/your-account/staff-accounts/staff-permissions), [Roles](https://help.shopify.com/en/manual/your-account/users/roles), [REST Customer](https://shopify.dev/docs/api/admin-rest/latest/resources/customer), [REST SmartCollection](https://shopify.dev/docs/api/admin-rest/latest/resources/smartcollection), [REST Transaction](https://shopify.dev/docs/api/admin-rest/latest/resources/transaction), [Manage B2B catalogs](https://shopify.dev/docs/apps/build/b2b/manage-catalogs), [Custom quotes via draft orders](https://help.shopify.com/en/manual/b2b/orders/quotes), [Hide-price community](https://community.shopify.com/t/custom-coding-to-hide-prices-except-when-logged-in/216137)
