import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/database.types';

/**
 * Cliente de Supabase para el navegador (SvelteKit client-side).
 * La anon key es pública por diseño: la seguridad la pone RLS en la base.
 *
 * detectSessionInUrl en false: el intercambio del código PKCE del callback
 * de OAuth lo hacemos de forma explícita en el layout del admin; dejarlo en
 * auto haría un segundo intercambio en carrera con el nuestro.
 */
export const createSupabaseBrowserClient = () =>
	createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: { detectSessionInUrl: false }
	});
