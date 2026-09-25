-- Histórico de tasas: append-only, una fila por cada tasa sincronizada.
--
-- fx_rates es CACHÉ: el upsert (unique compuesto) sobrescribe y solo queda
-- el último valor. fx_rate_history preserva la serie temporal completa para
-- gráficas, auditoría y forense de precios. Volumen acotado: ~9 filas por
-- sync y el TTL de 720 min limita las syncs automáticas (~60/mes ≈ 540
-- filas/mes); sin purga hace falta durante años.
--
-- Append-only de verdad: solo existe policy de SELECT (público, para charts
-- futuros del storefront) e INSERT (staff, la sesión con la que el server
-- sincroniza). Sin policies de update/delete: el histórico no se edita.

create table public.fx_rate_history (
	id bigint generated always as identity primary key,
	provider_id text not null references public.fx_providers (id) on delete cascade,
	market_slug text not null references public.fx_markets (slug) on delete cascade,
	base_currency text not null references public.fx_currencies (code) on delete cascade,
	quote_currency text not null references public.fx_currencies (code) on delete cascade,
	trade_type text not null
		check (trade_type in ('buy', 'sell')),
	rate numeric(14, 4) not null
		check (rate > 0),
	previous_rate numeric(14, 4),
	change_percentage numeric(8, 4),
	-- Fecha/updated_at según la API (pueden ser más viejos que fetched_at).
	api_date date,
	-- Momento del fetch: el eje temporal de la serie (igual que fx_rates).
	fetched_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	check (base_currency <> quote_currency),
	check (quote_currency = 'VES')
);

-- Serie por tasa: consulta ordenada por fecha para una (mercado, par,
-- trade_type) del proveedor — el shape de una gráfica.
create index fx_rate_history_series_idx
	on public.fx_rate_history (provider_id, market_slug, base_currency, quote_currency, trade_type, fetched_at desc);

alter table public.fx_rate_history enable row level security;

create policy "fx_rate_history: lectura pública"
	on public.fx_rate_history for select
	to anon, authenticated
	using (true);

create policy "fx_rate_history: staff inserta"
	on public.fx_rate_history for insert
	to authenticated
	with check (public.is_staff());