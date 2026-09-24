-- Cuentas y staff: profiles (identidad auth) + customers (CRM) estilo Shopify
--
-- Como Shopify separa StaffMember de Customer: los usuarios de Supabase Auth
-- viven en profiles (con role), y los clientes de la tienda en customers
-- (opcionalmente ligados por user_id — puede existir antes del primer login).
-- El primer login (Google OAuth o email OTP) auto-provisiona ambas filas,
-- replicando el auto-provisioning de las "new customer accounts" de Shopify.
--
-- Seguridad: RLS en todas las tablas nuevas. Los helpers is_staff()/is_admin()
-- son security definer para leer profiles sin recursión de RLS.

create extension if not exists citext;

-- ── Tipos ───────────────────────────────────────────────────────────────────

create type public.profile_role as enum ('admin', 'staff', 'customer');
create type public.customer_state as enum ('invited', 'enabled', 'disabled', 'declined');

-- ── profiles: uno por usuario de auth ───────────────────────────────────────

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	display_name text,
	avatar_url text,
	locale text not null default 'es',
	role public.profile_role not null default 'customer',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ── customers: CRM de la tienda ─────────────────────────────────────────────

create table public.customers (
	id uuid primary key default gen_random_uuid(),
	user_id uuid unique references public.profiles (id) on delete set null,
	email citext not null unique,
	email_verified boolean not null default false,
	phone text,
	first_name text,
	last_name text,
	display_name text,
	note text, -- nota interna, solo visible para staff (Customer.note de Shopify)
	tags text[] not null default '{}',
	locale text,
	orders_count integer not null default 0, -- resumen para el puente de checkout
	total_spent numeric(12, 2) not null default 0,
	tax_exempt boolean not null default false,
	data_sale_opt_out boolean not null default false,
	state public.customer_state not null default 'enabled',
	identity_provider text, -- 'google' | 'email' (método usado en el signup)
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.customer_addresses (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid not null references public.customers (id) on delete cascade,
	first_name text,
	last_name text,
	company text,
	address1 text,
	address2 text,
	city text,
	province text,
	country_code char(2),
	zip text,
	phone text,
	is_default boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ── Helpers RLS ─────────────────────────────────────────────────────────────
-- security definer + auth.uid() calificado: leen profiles sin recursión de RLS.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1 from public.profiles
		where id = auth.uid() and role in ('admin', 'staff')
	);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1 from public.profiles
		where id = auth.uid() and role = 'admin'
	);
$$;

-- ── Auto-provisioning al crear usuario de auth ──────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.profiles (id, display_name, avatar_url)
	values (
		new.id,
		coalesce(
			new.raw_user_meta_data ->> 'full_name',
			new.raw_user_meta_data ->> 'name',
			new.email
		),
		new.raw_user_meta_data ->> 'avatar_url'
	)
	on conflict (id) do nothing;

	-- Si el staff ya creó el CRM con ese email, ligarlo; si no, crearlo.
	update public.customers
	set user_id = new.id,
		email_verified = email_verified or new.email_confirmed_at is not null
	where email = new.email
		and user_id is null;

	insert into public.customers (
		user_id, email, email_verified, display_name, first_name, last_name,
		identity_provider, state
	)
	select
		new.id,
		new.email,
		new.email_confirmed_at is not null,
		coalesce(
			new.raw_user_meta_data ->> 'full_name',
			new.raw_user_meta_data ->> 'name',
			new.email
		),
		new.raw_user_meta_data ->> 'given_name',
		new.raw_user_meta_data ->> 'family_name',
		coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
		'enabled'
	where not exists (
		select 1 from public.customers where user_id = new.id
	);

	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row
	execute function public.handle_new_user();

-- ── Guardas ─────────────────────────────────────────────────────────────────
-- Nadie se auto-promueve a staff/admin desde el cliente. Cuando auth.uid() es
-- null (dashboard / service_role / SQL editor) el cambio está permitido: es
-- contexto de servidor confiable.

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if
		new.role is distinct from old.role
		and not public.is_admin()
		and auth.uid() is not null
	then
		raise exception 'solo un admin puede cambiar roles';
	end if;
	return new;
end;
$$;

create trigger profiles_guard_role
	before update on public.profiles
	for each row
	execute function public.guard_profile_role();

-- El email de un cliente lo cambia solo el staff (el email "canónico" vive en
-- auth.users; en customers es un espejo).
create or replace function public.guard_customer_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if
		new.email is distinct from old.email
		and not public.is_staff()
		and auth.uid() is not null
	then
		raise exception 'solo el staff puede cambiar el email del cliente';
	end if;
	return new;
end;
$$;

create trigger customers_guard_email
	before update on public.customers
	for each row
	execute function public.guard_customer_email();

-- ── updated_at automático ───────────────────────────────────────────────────

create trigger profiles_set_updated_at
	before update on public.profiles
	for each row
	execute function public.set_updated_at();

create trigger customers_set_updated_at
	before update on public.customers
	for each row
	execute function public.set_updated_at();

create trigger customer_addresses_set_updated_at
	before update on public.customer_addresses
	for each row
	execute function public.set_updated_at();

-- ── Índices ─────────────────────────────────────────────────────────────────

create index customers_tags_idx on public.customers using gin (tags);
create index customers_state_idx on public.customers (state);
create index customer_addresses_customer_idx on public.customer_addresses (customer_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;

-- profiles: cada uno se ve a sí mismo; el staff ve a todos.
create policy "profiles: lectura propia o staff"
	on public.profiles for select
	to authenticated
	using (id = auth.uid() or public.is_staff());

create policy "profiles: actualización propia o admin"
	on public.profiles for update
	to authenticated
	using (id = auth.uid() or public.is_admin())
	with check (id = auth.uid() or public.is_admin());
-- El trigger profiles_guard_role evita la auto-promoción.

-- Sin política insert: los perfiles nacen del trigger de auth.

-- customers: el usuario ve su fila (si está ligada); el staff ve todas.
create policy "customers: lectura propia o staff"
	on public.customers for select
	to authenticated
	using (user_id = auth.uid() or public.is_staff());

create policy "customers: actualización propia o staff"
	on public.customers for update
	to authenticated
	using (user_id = auth.uid() or public.is_staff())
	with check (user_id = auth.uid() or public.is_staff());
-- El trigger customers_guard_email evita cambios de email sin staff.
-- Sin política insert: los clientes nacen del trigger de auth o del staff.

create policy "customer_addresses: dueño o staff"
	on public.customer_addresses for all
	to authenticated
	using (
		exists (
			select 1 from public.customers c
			where c.id = customer_id
				and (c.user_id = auth.uid() or public.is_staff())
		)
	)
	with check (
		exists (
			select 1 from public.customers c
			where c.id = customer_id
				and (c.user_id = auth.uid() or public.is_staff())
		)
	);