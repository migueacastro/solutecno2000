/**
 * Mapa de errores de Supabase Auth a claves estables (las mismas que
 * $lib/i18n/auth-errors.ts traduce). El server nunca devuelve texto de UI:
 * las actions de /login y /register llaman aquí y devuelven fail(status,
 * { errorKey }). Solo server-side (lo usa supabase de locals).
 */
export function mapAuthError(error: { code?: string; status?: number; message?: string }): string {
	// Rate limit del servidor de Auth (login, signUp o resend).
	if (error.status === 429 || error.code === 'over_request_rate_limit') {
		return 'too_many_requests';
	}

	switch (error.code) {
		case 'invalid_credentials':
			return 'invalid_credentials';
		case 'email_not_confirmed':
			return 'email_not_confirmed';
		case 'weak_password':
			return 'weak_password';
		case 'email_exists':
			return 'email_exists';
	}

	// Fallback por texto: algunas respuestas llegan sin code (proxy/edge).
	const text = error.message?.toLowerCase() ?? '';
	if (text.includes('invalid login credentials')) return 'invalid_credentials';
	if (text.includes('email not confirmed')) return 'email_not_confirmed';

	// Sin status HTTP suele ser un fallo de red (fetch no llegó a Supabase).
	if (!error.status || error.status === 0) return 'network';

	return 'unexpected';
}

/**
 * Rol del usuario con sesión recién creada, para el redirect post-login.
 * admin/staff van al panel; customer (o perfil inexistente) a la home.
 * Devuelve '/admin' o '/' como ruta canónica (el caller la pasa a resolve).
 */
export async function postLoginTarget(
	supabase: NonNullable<App.Locals['supabase']>,
	userId: string
): Promise<'admin' | 'public'> {
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', userId)
		.maybeSingle();

	return profile?.role === 'admin' || profile?.role === 'staff' ? 'admin' : 'public';
}
