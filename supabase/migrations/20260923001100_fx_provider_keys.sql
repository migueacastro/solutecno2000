-- API keys de los proveedores de tasas en la DB (decisión del usuario: la
-- key se gestiona desde el admin, sin redeploy).
--
-- Tabla aparte (no columna de fx_providers) porque fx_providers es lectura
-- pública: el storefront lee su estado sin sesión y RLS es por FILA, no por
-- columna; una columna api_key con select público filtraría la key a
-- cualquier visitante con la anon key. En fx_provider_keys no hay policy
-- pública: solo el staff (o sea, el server durante una sync del admin) la
-- lee y la escribe.
--
-- La key se guarda en texto plano: la barrera es RLS + que nadie más que el
-- server la consume. Si mañana hace falta cifrado, el paso siguiente es
-- Supabase Vault + RPC security definer, no un hash (la key debe viajar
-- tal cual en el header X-API-Key).

create table public.fx_provider_keys (
	provider_id text primary key
		references public.fx_providers (id) on delete cascade,
	-- Rango conservador: keys reales (UUIDs, tokens JWT-like) caben de sobra;
	-- evita guardar basura o un blob gigante por error.
	api_key text not null
		check (length(api_key) between 8 and 256),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- updated_at automático.
create trigger fx_provider_keys_set_updated_at
	before update on public.fx_provider_keys
	for each row
	execute function public.set_updated_at();

-- ── RLS: sin lectura pública; el staff lee y gestiona ──────────────────────

alter table public.fx_provider_keys enable row level security;

create policy "fx_provider_keys: staff gestiona"
	on public.fx_provider_keys for all
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());

-- ── Transición de la key desde el entorno ───────────────────────────────────

-- La key ya no vive en el entorno (api_key_env era el NOMBRE de la variable):
-- se guarda aquí y se edita desde el admin.
alter table public.fx_providers drop column api_key_env;