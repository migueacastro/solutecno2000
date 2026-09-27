import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { Pathname } from '$app/types';
import type { PageServerLoad } from './$types';
import { postLoginTarget } from '$lib/server/auth';

/**
 * Callback ÚNICO de auth: recibe el ?code= del email de verificación y del
 * OAuth de Google (PKCE: el verifier vive en una cookie de este origen que
 * llega en la misma navegación) y lo intercambia server-side. La sesión
 * queda en las cookies de la MISMA respuesta que redirige — sin
 * invalidateAll ni intercambio client-side (invariant: detectSessionInUrl
 * es false y este es el único actor que intercambia códigos).
 *
 * Siempre redirige; la página nunca renderiza contenido. Sin param `next`
 * (evita open-redirect): el destino sale solo del rol.
 */
export const load: PageServerLoad = async ({ url, locals }) => {
	// Sin cliente (env incompleta): al login, donde se ve el aviso no_config.
	if (!locals.supabase) {
		redirect(303, resolve('/login' as Pathname));
	}

	// El provider reporta fallos en la URL (link expirado, Google rechazado).
	if (url.searchParams.get('error') || url.searchParams.get('error_description')) {
		redirect(303, `${resolve('/login' as Pathname)}?error=code_expired`);
	}

	const code = url.searchParams.get('code');
	if (!code) {
		// Sin código no hay nada que intercambiar: al login sin error marcado.
		redirect(303, resolve('/login' as Pathname));
	}

	// El código es de un solo uso: expirado o reusado cae en el mismo estado.
	const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);
	if (error || !data.user) {
		redirect(303, `${resolve('/login' as Pathname)}?error=code_expired`);
	}

	// Sesión recién creada: redirect por rol (admin/staff al panel, resto a home).
	const target = await postLoginTarget(locals.supabase, data.user.id);
	redirect(303, resolve(target === 'admin' ? ('/admin' as Pathname) : ('/' as Pathname)));
};
