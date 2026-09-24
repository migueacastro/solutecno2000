-- Ajustes de la app (singleton) + temas de la paleta, estilo Shopify
--
-- - app_settings: fila única (id = 1) con la "marca": nombre, logo, favicon
--   y el tema activo. Es la tabla de Settings del admin.
-- - app_themes: presets sembrados + clones editables. Cada tema guarda su
--   paleta como tokens JSONB (claves sin el prefijo --app-; el inyector de
--   CSS en el servidor las mapea a --app-{key}).
--
-- Los tokens desconocidos o no-hex se rechazan con el CHECK
-- app_theme_tokens_valid: un typo no rompe la paleta en silencio. Un token
-- faltante es válido: el default vive en src/lib/styles/admin-theme.css.
--
-- Lectura pública (anon): el storefront (Etapa 2) necesita nombre, logo,
-- favicon y paleta sin sesión. No hay secretos aquí: solo texto y hexes.

-- ── Validador de tokens ─────────────────────────────────────────────────────

create or replace function public.app_theme_tokens_valid(tokens jsonb)
returns boolean
language sql
stable
set search_path = public
as $$
	select jsonb_typeof(tokens) = 'object'
		and not exists (
			select 1
			from jsonb_each(tokens) as cada(clave, valor)
			where clave not in (
				'primary', 'primary-contrast',
				'bg', 'surface', 'nav-bg', 'active-bg', 'border',
				'text', 'text-muted',
				'tone-info-bg', 'tone-info-text',
				'tone-success-bg', 'tone-success-text',
				'tone-caution-bg', 'tone-caution-text',
				'tone-warning-bg', 'tone-warning-text',
				'tone-critical-bg', 'tone-critical-text'
			)
				-- Solo hex (3 a 8 dígitos): simplifica la validación de la Etapa 1.
				-- #>> '{}' convierte el escalar jsonb a texto; un objeto/array no
				-- matchea el patrón y por tanto también se rechaza.
				or valor #>> '{}' !~ '^#[0-9a-fA-F]{3,8}$'
		);
$$;

-- ── app_themes: presets + clones ────────────────────────────────────────────

create table public.app_themes (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	name text not null check (char_length(name) between 1 and 60),
	tokens jsonb not null default '{}' :: jsonb,
	is_preset boolean not null default false, -- presets no borrables desde el cliente
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint app_themes_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
	constraint app_themes_tokens_valid check (public.app_theme_tokens_valid(tokens))
);

create trigger app_themes_set_updated_at
	before update on public.app_themes
	execute function public.set_updated_at();

-- ── app_settings: singleton (id = 1, sembrado abajo) ────────────────────────

create table public.app_settings (
	id integer primary key default 1 check (id = 1),
	app_name text check (char_length(app_name) <= 60), -- null = usar env/fallback
	logo_url text,
	favicon_url text,
	active_theme_id uuid not null references public.app_themes (id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create trigger app_settings_set_updated_at
	before update on public.app_settings
	execute function public.set_updated_at();

-- ── Seeds: preset Polaris (los 19 hexes de admin-theme.css) + un dark ───────

with polaris as (
	insert into public.app_themes (slug, name, tokens, is_preset)
	values (
		'polaris', 'Polaris',
		$jsonb${
			"primary": "#005bd3", "primary-contrast": "#ffffff",
			"bg": "#f1f1f1", "surface": "#ffffff", "nav-bg": "#ebebeb",
			"active-bg": "#e3e3e3", "border": "#d5d5d5",
			"text": "#303030", "text-muted": "#616161",
			"tone-info-bg": "#eaf4ff", "tone-info-text": "#003a5a",
			"tone-success-bg": "#cdfed4", "tone-success-text": "#014b40",
			"tone-caution-bg": "#fff8db", "tone-caution-text": "#4f4700",
			"tone-warning-bg": "#fff1e3", "tone-warning-text": "#5e4200",
			"tone-critical-bg": "#fee8eb", "tone-critical-text": "#8e0b21"
		}$jsonb$ :: jsonb,
		true
	)
	returning id
), noche as (
	insert into public.app_themes (slug, name, tokens, is_preset)
	values (
		'polaris-noche', 'Polaris Noche',
		$jsonb${
			"primary": "#1f7aec", "primary-contrast": "#ffffff",
			"bg": "#1a1a1a", "surface": "#262626", "nav-bg": "#202020",
			"active-bg": "#303030", "border": "#3d3d3d",
			"text": "#e3e3e3", "text-muted": "#a8a8a8",
			"tone-info-bg": "#10273d", "tone-info-text": "#7cc7ff",
			"tone-success-bg": "#0c3327", "tone-success-text": "#6ff2a9",
			"tone-caution-bg": "#332d0c", "tone-caution-text": "#ffe066",
			"tone-warning-bg": "#33220c", "tone-warning-text": "#ffb267",
			"tone-critical-bg": "#33101a", "tone-critical-text": "#ff7a92"
		}$jsonb$ :: jsonb,
		true
	)
	returning id
)
insert into public.app_settings (id, active_theme_id)
select 1, id from polaris;
-- app_name queda null: la app muestra el fallback (env PUBLIC_APP_NAME).

-- ── Guarda de presets ───────────────────────────────────────────────────────
-- Los presets sembrados solo los puede modificar un admin (los clones, staff).
-- Con auth.uid() null (SQL editor / service_role) el cambio pasa: es contexto
-- de servidor confiable, mismo criterio que guard_profile_role (0002).

create or replace function public.guard_theme_preset()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if
		old.is_preset
		and not public.is_admin()
		and auth.uid() is not null
	then
		raise exception 'solo un admin puede modificar un tema preset';
	end if;
	return new;
end;
$$;

create trigger app_themes_guard_preset
	before update on public.app_themes
	for each row
	execute function public.guard_theme_preset();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.app_themes enable row level security;
alter table public.app_settings enable row level security;

-- Lectura pública: el storefront necesita nombre/logo/favicon/paleta sin sesión.
create policy "app_themes: lectura pública"
	on public.app_themes for select
	to anon, authenticated
	using (true);

create policy "app_themes: staff crea"
	on public.app_themes for insert
	to authenticated
	with check (public.is_staff());

create policy "app_themes: staff actualiza"
	on public.app_themes for update
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());
-- El trigger app_themes_guard_preset blinda los presets a nivel admin.

-- Los presets no se borran desde el cliente (solo los clones).
create policy "app_themes: staff borra no-preset"
	on public.app_themes for delete
	to authenticated
	using (not is_preset and public.is_staff());

create policy "app_settings: lectura pública"
	on public.app_settings for select
	to anon, authenticated
	using (true);

create policy "app_settings: staff actualiza"
	on public.app_settings for update
	to authenticated
	using (public.is_staff())
	with check (public.is_staff());
-- Sin política insert/delete: la fila es un singleton sembrado por esta
-- migración; el check (id = 1) además bloquea segundas filas incluso al
-- service_role accidental.