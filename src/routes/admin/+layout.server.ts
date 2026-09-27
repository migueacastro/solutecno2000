import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { Pathname } from '$app/types';
import type { LayoutServerLoad } from './$types';

/**
 * Guard del admin (load de SERVIDOR: aquí sí existe `locals`).
 * El +layout.svelte decide qué renderizar según dos estados:
 *
 * - perfil inexistente o rol 'customer': tarjeta "sin permisos".
 * - staff/admin: el shell Polaris.
 *
 * Sin sesión no hay tarjeta de login propia: redirige a /login (el único
 * punto de entrada; tras autenticar, el redirect por rol devuelve al panel).
 *
 * Si Supabase no está configurado en el entorno, `supabaseReady` va en false
 * y el layout muestra un aviso en lugar de fingir una sesión vacía.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.supabase) {
		return { profile: null, supabaseReady: false };
	}

	const session = await locals.safeGetSession();
	if (!session) {
		redirect(303, resolve('/login' as Pathname));
	}

	// RLS: cada usuario solo lee su propia fila (o el staff lee todas).
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, display_name, avatar_url, role')
		.eq('id', session.user.id)
		.single();

	return { profile: profile ?? null, supabaseReady: true };
};
