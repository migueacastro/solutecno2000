import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/database.types';

/**
 * Cliente de Supabase para el navegador (SvelteKit client-side).
 * La anon key es pública por diseño: la seguridad la pone RLS en la base.
 */
export const createSupabaseBrowserClient = () =>
	createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);