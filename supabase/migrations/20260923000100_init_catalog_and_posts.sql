-- SolucionesTecno: esquema inicial (catálogo + blog híbrido)
--
-- Blog híbrido: el contenido vive como mdsvex en el repo (fuente de verdad);
-- esta tabla posts guarda la metadata sincronizada (slug, título, tags, vistas).
--
-- Seguridad: RLS en todas las tablas. Sin política = inaccesible para clientes.
-- Las escrituras van por service_role (servidor) o dashboard; el anon solo lee
-- lo publicado y puede crear consultas.

create extension if not exists pgcrypto;

-- ── Blog ────────────────────────────────────────────────────────────────────

create table public.posts (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	title text not null,
	excerpt text,
	cover_image_url text,
	tags text[] not null default '{}',
	locale text not null default 'es',
	published_at timestamptz,
	source_file text, -- ruta del .md en el repo (referencia para el sync)
	word_count integer not null default 0,
	views integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ── Catálogo ────────────────────────────────────────────────────────────────

create table public.categories (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	name text not null,
	description text,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.products (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	name text not null,
	description text,
	price numeric(12, 2), -- null = "consultar precio"
	currency text, -- ISO 4217 cuando haya precio (ej: PEN, USD)
	category_id uuid references public.categories (id) on delete set null,
	images text[] not null default '{}', -- URLs de Supabase Storage
	in_stock boolean not null default true,
	is_published boolean not null default false,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- Consultas estilo marketplace ("me interesa este producto")
create table public.inquiries (
	id uuid primary key default gen_random_uuid(),
	product_id uuid references public.products (id) on delete set null,
	name text not null,
	email text not null,
	phone text,
	message text not null,
	created_at timestamptz not null default now()
);

-- ── updated_at automático ───────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create trigger posts_set_updated_at
	before update on public.posts
	for each row
	execute function public.set_updated_at();

create trigger categories_set_updated_at
	before update on public.categories
	for each row
	execute function public.set_updated_at();

create trigger products_set_updated_at
	before update on public.products
	for each row
	execute function public.set_updated_at();

-- ── Índices ─────────────────────────────────────────────────────────────────

create index posts_published_at_idx on public.posts (published_at desc);
create index posts_tags_idx on public.posts using gin (tags);
create index products_category_idx on public.products (category_id);
create index products_published_sort_idx on public.products (is_published, sort_order);
create index inquiries_created_at_idx on public.inquiries (created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.posts enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inquiries enable row level security;

create policy "posts: lectura pública de publicados"
	on public.posts for select
	to anon, authenticated
	using (published_at is not null);

create policy "categories: lectura pública"
	on public.categories for select
	to anon, authenticated
	using (true);

create policy "products: lectura pública de publicados"
	on public.products for select
	to anon, authenticated
	using (is_published);

create policy "inquiries: creación pública"
	on public.inquiries for insert
	to anon, authenticated
	with check (true);