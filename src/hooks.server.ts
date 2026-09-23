import { sequence } from '@sveltejs/kit/hooks';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import type { Database } from '$lib/database.types';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { env } from '$env/dynamic/private';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

const handleSupabase: Handle = ({ event, resolve }) => {
	const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = env;

	/**
	 * Si aún no hay credenciales en el entorno (ej: preview sin secrets),
	 * el hook se salta Supabase y la app arranca sin cliente.
	 */
	if (PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY) {
		/**
		 * Cliente de Supabase con las cookies del request, para que la sesión de
		 * Supabase Auth se mantenga sincronizada en el servidor.
		 */
		event.locals.supabase = createServerClient<Database>(
			PUBLIC_SUPABASE_URL,
			PUBLIC_SUPABASE_ANON_KEY,
			{
				cookies: {
					getAll: () => event.cookies.getAll(),
					setAll: (cookiesToSet) => {
						cookiesToSet.forEach(({ name, value, options }) => {
							event.cookies.set(name, value, { ...options, path: '/' });
						});
					}
				}
			}
		);
	}

	/**
	 * Valida la sesión contra el servidor de Supabase (getUser) en lugar de
	 * confiar solo en el JWT de la cookie. Devuelve null si no hay sesión o
	 * si Supabase no está configurado.
	 */
	event.locals.safeGetSession = async () => {
		if (!event.locals.supabase) return null;

		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return null;

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error || !user) return null;

		return { session, user };
	};

	return resolve(event);
};

export const handle: Handle = sequence(handleParaglide, handleSupabase);