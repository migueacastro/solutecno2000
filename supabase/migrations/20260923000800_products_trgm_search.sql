-- Búsqueda de productos con pg_trgm para el SearchBar de la topbar admin.
-- similarity() mide similitud Dice de trigramas: tolera typos ("zapat" ≈
-- "zapatillas") a diferencia de ilike. El índice GIN gin_trgm_ops acelera
-- el operador % (trigram match) sin table scan.

create extension if not exists pg_trgm;

create index products_trgm_name_idx
	on public.products using gin (name gin_trgm_ops);
create index products_trgm_vendor_idx
	on public.products using gin (vendor gin_trgm_ops);
create index products_trgm_type_idx
	on public.products using gin (product_type gin_trgm_ops);
create index product_variants_trgm_sku_idx
	on public.product_variants using gin (sku gin_trgm_ops);

-- Una sola query (sin n+1): coincidencias en name/vendor/product_type o en
-- el sku de cualquiera de sus variantes; score = mayor similitud entre las 4.
-- SECURITY INVOKER: respeta las RLS del rol del usuario autenticado que llama.
create or replace function public.search_products(
	query text,
	max_results integer default 10
)
	returns table (
		id uuid,
		slug citext,
		name text,
		vendor text,
		product_type text,
		price numeric,
		currency char,
		status public.product_status,
		similarity real
	)
	language sql
	stable
	security invoker
	set search_path = public
	set pg_trgm.similarity_threshold = 0.2
	as $$
	select
		p.id,
		p.slug,
		p.name,
		p.vendor,
		p.product_type,
		p.price,
		p.currency,
		p.status,
		greatest(
			similarity(p.name, query),
			similarity(p.vendor, query),
			similarity(p.product_type, query),
			coalesce((
				select max(similarity(v.sku, query))
				from public.product_variants v
				where v.product_id = p.id and v.sku % query
			), 0)
		) as similarity
	from public.products p
	where
		p.name % query
		or p.vendor % query
		or p.product_type % query
		or exists (
			select 1 from public.product_variants v
			where v.product_id = p.id and v.sku % query
		)
	order by similarity desc, p.name asc
	limit least(max_results, 20);
$$;

-- La topbar es del admin: solo roles autenticados ejecutan la RPC.
grant execute on function public.search_products(text, integer) to authenticated;