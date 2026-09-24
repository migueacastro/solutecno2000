-- Storage: bucket público 'media' para las imágenes del catálogo
--
-- El bucket público sirve las URLs directas que consumen el storefront, el
-- admin y (a futuro) la API de publicación de Instagram, que exige media
-- alojado en un servidor de acceso público. La escritura queda solo para staff.
--
-- Nota: requiere 0002 (usa public.is_staff(), security definer sobre profiles).

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Lectura: pública (el bucket ya es public; la política habilita listar vía API).
create policy "media: lectura pública"
	on storage.objects for select
	to anon, authenticated
	using (bucket_id = 'media');

-- Escritura: solo staff.
create policy "media: staff sube"
	on storage.objects for insert
	to authenticated
	with check (bucket_id = 'media' and public.is_staff());

create policy "media: staff actualiza"
	on storage.objects for update
	to authenticated
	using (bucket_id = 'media' and public.is_staff())
	with check (bucket_id = 'media' and public.is_staff());

create policy "media: staff elimina"
	on storage.objects for delete
	to authenticated
	using (bucket_id = 'media' and public.is_staff());