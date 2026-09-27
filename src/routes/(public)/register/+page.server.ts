import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { Pathname } from '$app/types';
import type { Actions, PageServerLoad } from './$types';
import { mapAuthError, postLoginTarget } from '$lib/server/auth';

/**
 * Registro email/password con verificación de correo. El trigger
 * handle_new_user auto-provisiona profiles + customers leyendo
 * raw_user_meta_data, por eso el signUp manda full_name/given_name/
 * family_name en options.data (nada más: provider y email_confirmed_at
 * los resuelve el trigger).
 *
 * Con "Confirm email" ON (prod) el signUp no trae sesión → pantalla
 * "revisa tu correo". Con OFF (dev) trae sesión → redirect por rol.
 * Email ya registrado (email_exists) devuelve el MISMO éxito ambiguo
 * (anti-enumeración).
 */

export const load: PageServerLoad = async ({ locals }) => {
	// Con sesión activa no hay nada que registrar.
	if (await locals.safeGetSession()) {
		redirect(303, resolve('/' as Pathname));
	}
	return {};
};

export const actions: Actions = {
	/** Registro: valida campos, signUp y éxito ambiguo "revisa tu correo". */
	register: async ({ request, locals, url }) => {
		if (!locals.supabase) {
			return fail(503, { register: { errorKey: 'no_config' } });
		}

		const form = await request.formData();
		const fullName = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const passwordConfirm = String(form.get('passwordConfirm') ?? '');

		if (!fullName || !email.includes('@')) {
			return fail(400, { register: { errorKey: 'invalid_field' } });
		}
		if (password !== passwordConfirm) {
			return fail(400, { register: { errorKey: 'passwords_differ' } });
		}
		if (password.length < 6) {
			return fail(400, { register: { errorKey: 'weak_password' } });
		}

		// Nombre → given/family (split simple en server; el trigger lee ambos
		// y full_name como fallback de display_name).
		const tokens = fullName.split(/\s+/);
		const familyName = tokens.slice(1).join(' ');

		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: {
				// PKCE: el email lleva ?code=... a este callback (server-side).
				emailRedirectTo: `${url.origin}/auth/callback`,
				data: {
					full_name: fullName,
					given_name: tokens[0],
					...(familyName ? { family_name: familyName } : {})
				}
			}
		});

		if (error) {
			const errorKey = mapAuthError(error);
			// Email ya registrado: mismo "revisa tu correo" (anti-enumeración).
			if (errorKey === 'email_exists') {
				return { register: { ok: true, checkEmail: true, email } };
			}
			return fail(errorKey === 'too_many_requests' ? 429 : 400, {
				register: { errorKey }
			});
		}

		// Confirmations OFF (dev): la sesión viene en la respuesta (cookies ya
		// escritas por el hook) → redirect por rol igual que el login.
		if (data.session) {
			const target = await postLoginTarget(locals.supabase, data.session.user.id);
			redirect(303, resolve(target === 'admin' ? ('/admin' as Pathname) : ('/' as Pathname)));
		}

		// Confirmations ON (prod): sin sesión hasta confirmar el correo.
		return { register: { ok: true, checkEmail: true, email } };
	}
};
