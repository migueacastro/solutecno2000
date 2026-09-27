import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/database.types';

/**
 * Cliente de Supabase para el navegador (SvelteKit client-side).
 * La anon key es pública por diseño: la seguridad la pone RLS en la base.
 *
 * detectSessionInUrl en false (INVARIANT, nunca activarlo): todo intercambio
 * del código PKCE es explícito y server-side en /auth/callback — sirve tanto
 * al email de verificación como al OAuth de Google. Dejarlo en auto haría un
 * segundo intercambio client-side en carrera y el código es de un solo uso.
 */
export const createSupabaseBrowserClient = () =>
	createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: { detectSessionInUrl: false }
	});
