-- Cada tema lleva su propia paleta de modo claro y de modo oscuro (ambas
-- obligatorias, 19 tokens cada una). El preset 'polaris-noche' desaparece:
-- sus hex pasan a ser el tokens_dark de fábrica de todos los temas.

alter table public.app_themes
    add column tokens_light jsonb,
    add column tokens_dark jsonb;

-- Backfill: claro = tokens actuales, oscuro = la paleta del preset noche.
-- Se hace merge sobre los defaults completos porque un tema editado a mano
-- pudo quedar con un set parcial (el CHECK anterior lo permitía) y el
-- validador nuevo exige las 19 claves.
-- El trigger app_themes_guard_preset no bloquea: auth.uid() es null en el
-- contexto de migración.
update public.app_themes
set tokens_light = coalesce((select tokens from public.app_themes where slug = 'polaris'), '{}'::jsonb) || tokens,
    tokens_dark  = coalesce((select tokens from public.app_themes where slug = 'polaris-noche'), '{}'::jsonb) || tokens;

-- Si el tema activo fuera 'polaris-noche', reasignar a 'polaris' antes de
-- borrarla (app_settings.active_theme_id es on delete restrict).
update public.app_settings
set active_theme_id = (select id from public.app_themes where slug = 'polaris')
where active_theme_id = (select id from public.app_themes where slug = 'polaris-noche');

delete from public.app_themes where slug = 'polaris-noche';

-- Validador estricto por modo: las 19 claves son OBLIGATORIAS y cada valor
-- debe ser hex (#RRGGBB..#RRGGBBAA). Reemplaza a app_theme_tokens_valid,
-- que aceptaba objetos parciales.
create or replace function public.app_theme_mode_valid(tokens jsonb)
returns boolean
language sql
stable
set search_path = public
as $$
    with claves as (
        select unnest (array [
            'primary', 'primary-contrast', 'bg', 'surface', 'nav-bg', 'active-bg', 'border',
            'text', 'text-muted', 'tone-info-bg', 'tone-info-text', 'tone-success-bg',
            'tone-success-text', 'tone-caution-bg', 'tone-caution-text', 'tone-warning-bg',
            'tone-warning-text', 'tone-critical-bg', 'tone-critical-text'
        ]) as clave
    )
    select
        jsonb_typeof(tokens) = 'object'
        and not exists (
            select 1 from claves
            where jsonb_typeof(tokens -> clave) is distinct from 'string'
               or tokens ->> clave !~ '^#[0-9a-fA-F]{3,8}$'
        )
        and (select count(*) from jsonb_object_keys(tokens) k
             where k not in (select clave from claves)) = 0
$$;

alter table public.app_themes
    alter column tokens_light set not null,
    alter column tokens_dark set not null,
    add constraint app_themes_tokens_light_valid check (public.app_theme_mode_valid(tokens_light)),
    add constraint app_themes_tokens_dark_valid check (public.app_theme_mode_valid(tokens_dark));

alter table public.app_themes drop column tokens;

drop function public.app_theme_tokens_valid(jsonb);