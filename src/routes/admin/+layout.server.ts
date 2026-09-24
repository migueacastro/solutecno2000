import type { LayoutServerLoad } from './$types';

/**
 * Guard del admin (load de SERVIDOR: aquí sí existe `locals`).
 * El +layout.svelte decide qué renderizar según tres estados:
 *
 * - `needsLogin` (sin sesión): tarjeta de login con Google OAuth.
 * - perfil inexistente o rol 'customer': tarjeta "sin permisos".
 * - staff/admin: el shell Polaris.
 *
 * Si Supabase no está configurado en el entorno, `supabaseReady` va en false
 * y el layout muestra un aviso en lugar de fingir una sesión vacía.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.supabase) {
		return { profile: null, needsLogin: false, supabaseReady: false };
	}

	const session = await locals.safeGetSession();
	if (!session) {
		return { profile: null, needsLogin: true, supabaseReady: true };
	}

	// RLS: cada usuario solo lee su propia fila (o el staff lee todas).
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, display_name, avatar_url, role')
		.eq('id', session.user.id)
		.single();

	return { profile: profile ?? null, needsLogin: false, supabaseReady: true };
};
