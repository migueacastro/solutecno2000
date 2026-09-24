-- Rediseño del catálogo según el estudio Shopify (docs/shopify-data-model.md)
--
-- - products: ciclo de vida status ∈ {draft, active, archived, unlisted}
--   (se retira is_published), price nullable + price_on_request,
--   vendor / product_type / tags / seo.
-- - variantes y opciones de producto.
-- - media + product_media: galería (reemplaza products.images text[]).
-- - collections: manuales y smart (rule_set jsonb), M2M con position.
-- - metafields: tabla polimórfica única (patrón Metafield de Shopify).
-- - inquiries: columna status para gestionarlas desde el admin.
--
-- Desviación deliberada respecto al modelo puro de Shopify: products conserva
-- price/currency como "precio de muestra" porque la mayoría de productos de
-- este catálogo no tendrá variantes; las variantes llevan su propio precio
-- cuando existen. Visible en tienda = status ∈ {active, unlisted} con
-- published_at; las listas del storefront filtran solo 'active'.

create type public.product_status as enum ('draft', 'active', 'archived', 'unlisted');
create type public.inventory_policy as enum ('deny', 'continue');
create type public.media_kind as enum ('image', 'video', 'model');
create type public.media_status as enum ('uploaded', 'processing', 'ready', 'failed');
create type public.metafield_owner_type as enum ('product', 'variant', 'collection', 'customer', 'order', 'post');
create type public.inquiry_status as enum ('new', 'in_progress', 'done');

-- ── media: archivos de Supabase Storage (imágenes / video / modelos) ────────

create table public.media (
	id uuid primary key default gen_random_uuid(),
	kind public.media_kind not null default 'image',
	url text not null,
	alt text,
	width integer,
	height integer,
	mime_type text,
	status public.media_status not null default 'ready',
	created_at timestamptz not null default now()
);

create table public.product_media (
	product_id uuid not null references public.products (id) on delete cascade,
	media_id uuid not null references public.media (id) on delete cascade,
	position integer not null default 0,
	is_featured boolean not null default false,
	primary key (product_id, media_id)
);

-- ── products: ciclo de vida estilo Shopify ──────────────────────────────────

alter table public.products
	add column description_html text,
	add column vendor text,
	add column product_type text,
	add column tags text[] not null default '{}',
	add column seo jsonb,
	add column price_on_request boolean not null default false,
	add column status public.product_status not null default 'draft',
	add column published_at timestamptz;

-- Por si hubiera datos: lo publicado antes pasa a active + published.
update public.products
set status = 'active', published_at = coalesce(published_at, now())
where is_published;

-- La política pública vieja depende de is_published: hay que soltarla ANTES de
-- dropear la columna (PostgreSQL no dropea políticas con la columna; los
-- índices sí, como products_published_sort_idx).
drop policy "products: lectura pública de publicados" on public.products;

alter table public.products
	drop column is_published,
	drop column images, -- reemplazado por media/product_media
	drop column in_stock; -- pasa a las variantes (inventory_quantity / tracks_inventory)

alter table public.products
	alter column currency type char(3) using currency :: char(3),
	alter column currency set default 'PEN',
	alter column slug type citext;

-- El índice que usaba is_published se elimina solo al dropear la columna.
create index products_tags_idx on public.products using gin (tags);
create index products_storefront_idx on public.products (status, published_at desc, sort_order);

-- ── Opciones y variantes ────────────────────────────────────────────────────

create table public.product_options (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products (id) on delete cascade,
	name text not null,
	position integer not null default 0,
	values text[] not null default '{}',
	unique (product_id, name)
);

create table public.product_variants (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products (id) on delete cascade,
	title text, -- se genera de las opciones (Shopify: "Default Title")
	position integer not null default 1,
	price numeric(12, 2), -- null + price_on_request = venta por cotización
	price_on_request boolean not null default false,
	compare_at_price numeric(12, 2), -- precio "original" para el tachado
	currency char(3) not null default 'PEN',
	sku text,
	barcode text,
	inventory_quantity integer not null default 0,
	tracks_inventory boolean not null default true,
	inventory_policy public.inventory_policy not null default 'deny',
	taxable boolean not null default true,
	selected_options jsonb not null default '[]', -- [{name, value}] por opción
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index product_variants_position_idx
	on public.product_variants (product_id, position);
create index product_variants_sku_idx on public.product_variants (sku);

-- ── Collections: manuales y smart ───────────────────────────────────────────

create table public.collections (
	id uuid primary key default gen_random_uuid(),
	slug citext not null unique,
	title text not null,
	description_html text,
	image_id uuid references public.media (id) on delete set null,
	sort_rule text not null default 'manual', -- manual | alpha_asc | alpha_desc | price_asc | price_desc | created_desc
	is_smart boolean not null default false,
	rule_set jsonb, -- {disjunctive: bool, rules: [{column, relation, condition}]}
	published_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.collection_products (
	collection_id uuid not null references public.collections (id) on delete cascade,
	product_id uuid not null references public.products (id) on delete cascade,
	position integer not null default 0,
	primary key (collection_id, product_id)
);

create index collections_published_idx on public.collections (published_at);
create index collection_products_product_idx on public.collection_products (product_id);

-- ── Metafields: datos custom polimórficos (el patrón más reutilizable) ──────

create table public.metafields (
	owner_type public.metafield_owner_type not null,
	owner_id uuid not null,
	namespace text not null default 'public', -- 'public' = visible en storefront
	key text not null,
	value text not null, -- siempre texto, como en Shopify; `type` define el parseo
	type text not null default 'single_line_text_field',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	primary key (owner_type, owner_id, namespace, key)
);

-- ── inquiries: estado de gestión para el admin ──────────────────────────────

alter table public.inquiries
	add column status public.inquiry_status not null default 'new';
create index inquiries_status_idx on public.inquiries (status);

-- posts: slugs case-insensitive (los ajustes grandes de posts llegan en la etapa blog)
alter table public.posts
	alter column slug type citext;

-- ── updated_at automático ───────────────────────────────────────────────────

create trigger product_variants_set_updated_at
	before update on public.product_variants
	for each row
	execute function public.set_updated_at();

create trigger collections_set_updated_at
	before update on public.collections
	for each row
	execute function public.set_updated_at();

create trigger metafields_set_updated_at
	before update on public.metafields
	for each row
	execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.media enable row level security;
alter table public.product_media enable row level security;
alter table public.product_options enable row level security;
alter table public.product_variants enable row level security;
alter table public.collections enable row level security;
alter table public.collection_products enable row level security;
alter table public.metafields enable row level security;

-- products: nueva política pública (la vieja, dependiente de is_published, ya
-- se soltó arriba junto al drop column). 'unlisted' es alcanzable por link
-- directo pero no aparece en listas (las listas filtran status = 'active').
create policy "products: lectura pública de visibles"
	on public.products for select
	to anon, authenticated
	using (
		(status in ('active', 'unlisted') and published_at is not null)
		or public.is_staff()
	);

create policy "products: staff gestiona"
	on public.products for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

create policy "product_variants: lectura de productos visibles"
	on public.product_variants for select
	to anon, authenticated
	using (
		exists (
			select 1 from public.products p
			where p.id = product_id
				and p.status in ('active', 'unlisted')
				and p.published_at is not null
		)
		or public.is_staff()
	);

create policy "product_variants: staff gestiona"
	on public.product_variants for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

create policy "product_options: lectura de productos visibles"
	on public.product_options for select
	to anon, authenticated
	using (
		exists (
			select 1 from public.products p
			where p.id = product_id
				and p.status in ('active', 'unlisted')
				and p.published_at is not null
		)
		or public.is_staff()
	);

create policy "product_options: staff gestiona"
	on public.product_options for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

-- media: visible si una foto suya pertenece a un producto visible o a una
-- colección publicada.
create policy "media: lectura de productos/colecciones visibles"
	on public.media for select
	to anon, authenticated
	using (
		exists (
			select 1
			from public.product_media pm
			join public.products p on p.id = pm.product_id
			where pm.media_id = media.id
				and p.status in ('active', 'unlisted')
				and p.published_at is not null
		)
		or exists (
			select 1 from public.collections c
			where c.image_id = media.id
				and c.published_at is not null
		)
		or public.is_staff()
	);

create policy "media: staff gestiona"
	on public.media for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

create policy "product_media: lectura de productos visibles"
	on public.product_media for select
	to anon, authenticated
	using (
		exists (
			select 1 from public.products p
			where p.id = product_id
				and p.status in ('active', 'unlisted')
				and p.published_at is not null
		)
		or public.is_staff()
	);

create policy "product_media: staff gestiona"
	on public.product_media for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

create policy "collections: lectura de publicadas"
	on public.collections for select
	to anon, authenticated
	using (published_at is not null or public.is_staff());

create policy "collections: staff gestiona"
	on public.collections for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

create policy "collection_products: lectura de colecciones publicadas"
	on public.collection_products for select
	to anon, authenticated
	using (
		exists (
			select 1 from public.collections c
			where c.id = collection_id
				and c.published_at is not null
		)
		or public.is_staff()
	);

create policy "collection_products: staff gestiona"
	on public.collection_products for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

create policy "metafields: lectura del namespace público"
	on public.metafields for select
	to anon, authenticated
	using (namespace = 'public' or public.is_staff());

create policy "metafields: staff gestiona"
	on public.metafields for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

-- categories: lectura pública ya existe (0001); el staff las gestiona.
create policy "categories: staff gestiona"
	on public.categories for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

-- posts: el staff gestiona el blog (la lectura pública de publicados ya existe).
create policy "posts: staff gestiona"
	on public.posts for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

-- inquiries: el staff lee y gestiona las consultas (la creación pública ya existe).
create policy "inquiries: staff lee"
	on public.inquiries for select
	to authenticated
	using (public.is_staff());

create policy "inquiries: staff actualiza"
	on public.inquiries for update
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());