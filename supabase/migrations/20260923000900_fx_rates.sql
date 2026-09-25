-- Tasas de cambio venezolanas: espejo del esquema de la API de montosve
-- (https://montosve.com/docs/api) + proveedores para failover.
--
-- - fx_currencies / fx_markets: catálogos fijos que imitan los valores de la
--   API (USD/EUR/USDT vs VES; bcv = oficial, binance_p2p/bybit_p2p = P2P).
--   Se extienden con migración, nunca desde el admin (RLS solo lectura).
-- - fx_providers: cada fuente de tasas (montosve hoy; otras mañana). El
--   api_key_env guarda el NOMBRE de la env var, nunca el valor (la key vive
--   solo en el server). is_primary con unique parcial = un solo primario a
--   nivel DB, sin acoplar app_settings.
-- - fx_rates: una fila por (proveedor, mercado, par, trade_type); el par
--   está separado en base/quote (no string "USD/VES") para poder indexar el
--   lookup del storefront. fetched_at alimenta el TTL de la caché y raw
--   guarda la fila cruda de la API por si cambia el shape (forense).
--
-- PEN NO se siembra: es moneda de precios de la tienda, no de la API; sin
-- fila en fx_currencies la FK impide crear por accidente una tasa PEN/VES
-- (el usuario decidió: por ahora solo USD, EUR y USDT tienen conversión).
-- Los códigos son text con CHECK (no char(3)) porque USDT son 4 letras.

create table public.fx_currencies (
	code text primary key
		check (code ~ '^[A-Z]{3,5}$'),
	name text not null,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.fx_markets (
	slug text primary key
		check (slug ~ '^[a-z][a-z0-9_]{1,29}$'),
	name text not null,
	kind text not null
		check (kind in ('official', 'p2p')),
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.fx_providers (
	id text primary key
		check (id ~ '^[a-z][a-z0-9_]{1,29}$'),
	name text not null,
	base_url text not null
		check (base_url ~ '^https://'),
	-- Nombre de la variable de entorno que contiene la API key (ej.
	-- 'MONTOSVE_API_KEY'); el valor real solo vive en el entorno del server.
	api_key_env text not null,
	enabled boolean not null default true,
	is_primary boolean not null default false,
	-- Menor = se prueba antes en el failover.
	priority integer not null default 100,
	-- Caché: 720 min (12 h) ≈ 60 req/mes con el plan free de 150 req/mes.
	ttl_minutes integer not null default 720
		check (ttl_minutes between 1 and 10080),
	last_synced_at timestamptz,
	last_status text not null default 'unknown'
		check (last_status in ('unknown', 'ok', 'error')),
	last_error text,
	-- Lease anti-fetch-paralelo entre instancias de adapter-vercel: quien
	-- logra el update condicional sincroniza; el resto sirve la DB.
	syncing_since timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.fx_rates (
	id uuid primary key default gen_random_uuid(),
	provider_id text not null references public.fx_providers (id) on delete cascade,
	market_slug text not null references public.fx_markets (slug) on delete cascade,
	base_currency text not null references public.fx_currencies (code) on delete cascade,
	quote_currency text not null references public.fx_currencies (code) on delete cascade,
	trade_type text not null
		check (trade_type in ('buy', 'sell')),
	rate numeric(14, 4) not null
		check (rate > 0),
	previous_rate numeric(14, 4),
	previous_date date,
	change_percentage numeric(8, 4),
	best_rate boolean not null default false,
	-- Fecha/updated_at según la API (pueden ser más viejos que fetched_at).
	api_date date,
	api_updated_at timestamptz,
	-- Momento del fetch: alimenta el TTL de la caché.
	fetched_at timestamptz not null default now(),
	-- Fila cruda de la API: forense si el proveedor cambia su shape.
	raw jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (base_currency <> quote_currency),
	check (quote_currency = 'VES')
);

-- Un solo primario a nivel DB (equivale a active_theme_id sin acoplar
-- app_settings): la migración de failover ya pide más de un proveedor.
create unique index fx_providers_primary_idx
	on public.fx_providers ((1))
	where is_primary;

-- Upsert directo desde el server (onConflict) y lookup indexado del
-- storefront (pickRate: base + quote + mercado + trade_type).
create unique index fx_rates_identity_idx
	on public.fx_rates (provider_id, market_slug, base_currency, quote_currency, trade_type);
create index fx_rates_lookup_idx
	on public.fx_rates (base_currency, quote_currency, market_slug, trade_type);

-- ── Seed: espejo de los valores actuales de la API de montosve ──────────────

insert into public.fx_currencies (code, name, sort_order) values
	('VES', 'Bolívar venezolano', 0),
	('USD', 'Dólar estadounidense', 10),
	('EUR', 'Euro', 20),
	('USDT', 'Tether (dólar digital)', 30)
on conflict (code) do nothing;

insert into public.fx_markets (slug, name, kind, sort_order) values
	('bcv', 'BCV', 'official', 0),
	('binance_p2p', 'Binance P2P', 'p2p', 10),
	('bybit_p2p', 'Bybit P2P', 'p2p', 20)
on conflict (slug) do nothing;

insert into public.fx_providers (id, name, base_url, api_key_env, is_primary, priority) values
	('montosve', 'MontosVE', 'https://api.montosve.com/v1', 'MONTOSVE_API_KEY', true, 10)
on conflict (id) do nothing;

-- ── updated_at automático ───────────────────────────────────────────────────

create trigger fx_currencies_set_updated_at
	before update on public.fx_currencies
	for each row
	execute function public.set_updated_at();

create trigger fx_markets_set_updated_at
	before update on public.fx_markets
	for each row
	execute function public.set_updated_at();

create trigger fx_providers_set_updated_at
	before update on public.fx_providers
	for each row
	execute function public.set_updated_at();

create trigger fx_rates_set_updated_at
	before update on public.fx_rates
	for each row
	execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.fx_currencies enable row level security;
alter table public.fx_markets enable row level security;
alter table public.fx_providers enable row level security;
alter table public.fx_rates enable row level security;

-- Select público en las 4: el storefront convierte precios sin sesión y no
-- hay secretos (la API key vive en el entorno del server, nunca en la DB).
create policy "fx_currencies: lectura pública"
	on public.fx_currencies for select
	to anon, authenticated
	using (true);

create policy "fx_markets: lectura pública"
	on public.fx_markets for select
	to anon, authenticated
	using (true);

create policy "fx_rates: lectura pública"
	on public.fx_rates for select
	to anon, authenticated
	using (true);

create policy "fx_providers: lectura pública"
	on public.fx_providers for select
	to anon, authenticated
	using (true);

-- El staff gestiona proveedores y tasas desde el admin (sync, failover,
-- prioridades). Los catálogos no tienen policies de escritura: se extienden
-- con migración, como los valores de un enum.
create policy "fx_providers: staff gestiona"
	on public.fx_providers for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

create policy "fx_rates: staff gestiona"
	on public.fx_rates for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());