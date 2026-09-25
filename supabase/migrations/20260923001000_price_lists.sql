-- PriceLists de Shopify (docs/shopify-data-model.md:216): precios por moneda
-- aparte del precio base del producto/variante, para el storefront VES.
--
-- - price_lists: una lista por moneda objetivo; tiene un ajuste porcentual
--   (el price rule de Shopify es solo porcentual — los precios fijos van en
--   price_list_prices) y published_at para activarla. Un price list activo
--   por moneda: unique parcial sobre published_at is not null.
--   currency es text con CHECK (no char(3), no FK a fx_currencies): una lista
--   PEN es legítima aunque PEN no tenga tasa en fx_rates.
-- - price_list_prices: precio fijo por producto o variante dentro de la
--   lista. variant_id null = precio a nivel producto, como el "Default
--   Title" de Shopify (la mayoría de productos de este catálogo no tiene
--   variantes). La unicidad usa unique parciales porque una PK/constraint
--   no admite null en variant_id.
--
-- Resolución del precio VES en el storefront (en orden):
--   1. precio fijo en price_list_prices → ese.
--   2. conversión por tasa (fx_rates) × (1 + ajuste%).
--   3. sin precio VES (la UI decide: ocultar o "a consultar").
-- Seed: ninguno — las listas se crean cuando haya datos reales.

create table public.price_lists (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	currency text not null
		check (currency ~ '^[A-Z]{3,5}$'),
	-- null o 0 = conversión pura; +5 = +5% sobre el precio convertido;
	-- negativo = descuento. Se aplica solo a lo convertido por tasa.
	adjustment_percentage numeric(6, 3),
	published_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.price_list_prices (
	id uuid primary key default gen_random_uuid(),
	price_list_id uuid not null references public.price_lists (id) on delete cascade,
	product_id uuid not null references public.products (id) on delete cascade,
	variant_id uuid references public.product_variants (id) on delete cascade,
	price numeric(12, 2) not null
		check (price >= 0),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index price_lists_currency_active_idx
	on public.price_lists (currency)
	where published_at is not null;

-- FK de variante debe apuntar a variantes del mismo producto: lo asegura el
-- admin (el selector solo ofrece variantes del producto); el índice lookup
-- del storefront consulta por (lista, producto) con variant_id null primero.
create unique index price_list_prices_product_idx
	on public.price_list_prices (price_list_id, product_id)
	where variant_id is null;
create unique index price_list_prices_variant_idx
	on public.price_list_prices (price_list_id, product_id, variant_id)
	where variant_id is not null;
create index price_list_prices_product_lookup_idx
	on public.price_list_prices (product_id);

create trigger price_lists_set_updated_at
	before update on public.price_lists
	for each row
	execute function public.set_updated_at();

create trigger price_list_prices_set_updated_at
	before update on public.price_list_prices
	for each row
	execute function public.set_updated_at();

-- ── RLS: select público + staff gestiona (mismo patrón del catálogo) ───────

alter table public.price_lists enable row level security;
alter table public.price_list_prices enable row level security;

create policy "price_lists: lectura de publicadas"
	on public.price_lists for select
	to anon, authenticated
	using (published_at is not null or public.is_staff());

create policy "price_lists: staff gestiona"
	on public.price_lists for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

create policy "price_list_prices: lectura de listas publicadas"
	on public.price_list_prices for select
	to anon, authenticated
	using (
		exists (
			select 1 from public.price_lists pl
			where pl.id = price_list_id
				and pl.published_at is not null
		)
		or public.is_staff()
	);

create policy "price_list_prices: staff gestiona"
	on public.price_list_prices for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());