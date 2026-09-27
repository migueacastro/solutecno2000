import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { Pathname } from '$app/types';
import type { Actions, PageServerLoad } from './$types';
import { mapAuthError, postLoginTarget } from '$lib/server/auth';

/**
 * Login clásico email/password (única puerta de entrada a la app junto con
 * el botón Google de la misma página). La sesión la establece el server
 * (signInWithPassword escribe las cookies vía el hook de Supabase) y el
 * redirect sale por rol: admin/staff al panel, el resto a la home.
 *
 * El callback de verificación/OAuth reporta sus fallos vía ?error=: solo se
 * aceptan claves conocidas (sin `next`, para evitar open-redirect).
 */

/** Claves de error que el callback puede mandar de vuelta a esta página. */
const CALLBACK_ERRORS = new Set(['code_expired']);

export const load: PageServerLoad = async ({ locals, url }) => {
	// Con sesión activa no hay motivo para ver el formulario.
	if (await locals.safeGetSession()) {
		redirect(303, resolve('/' as Pathname));
	}

	const error = url.searchParams.get('error');
	return { callbackError: error && CALLBACK_ERRORS.has(error) ? error : null };
};

export const actions: Actions = {
	/** Login email/password: fail con errorKey o redirect por rol. */
	login: async ({ request, locals }) => {
		if (!locals.supabase) {
			return fail(503, { login: { errorKey: 'no_config' } });
		}

		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!email.includes('@') || password.length === 0) {
			return fail(400, { login: { errorKey: 'invalid_field' } });
		}

		const { data, error } = await locals.supabase.auth.signInWithPassword({ email, password });

		if (error || !data.session) {
			return fail(401, { login: { errorKey: mapAuthError(error ?? {}) } });
		}

		// Redirect por rol: admin/staff al panel, el resto a la home pública.
		const target = await postLoginTarget(locals.supabase, data.session.user.id);
		redirect(303, resolve(target === 'admin' ? ('/admin' as Pathname) : ('/' as Pathname)));
	}
};
