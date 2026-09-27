import { m } from '$lib/paraglide/messages.js';

/**
 * Errores de auth (login/registro/callback): el servidor devuelve SOLO una
 * clave estable (fail(status, { errorKey: '...' })) y el cliente la traduce
 * aquí con paraglide. Espejo de $lib/i18n/errors.ts con fallback propio
 * (el de errors.ts es admin-scoped) para que la zona pública no dependa
 * de claves del admin.
 *
 * Cualquier clave desconocida cae en auth_errors_unexpected.
 */
export const AUTH_ERRORS: Record<string, () => string> = {
	invalid_credentials: () => m.auth_errors_invalid_credentials(),
	email_not_confirmed: () => m.auth_errors_email_not_confirmed(),
	weak_password: () => m.auth_errors_weak_password(),
	too_many_requests: () => m.auth_errors_too_many_requests(),
	code_expired: () => m.auth_errors_code_expired(),
	network: () => m.auth_errors_network(),
	invalid_field: () => m.auth_errors_invalid_field(),
	passwords_differ: () => m.auth_errors_passwords_differ(),
	no_config: () => m.auth_errors_no_config()
};

/** Traduce una clave de error de auth (o cae al genérico si es desconocida). */
export function authErrorMessage(errorKey?: string): string {
	return (errorKey && AUTH_ERRORS[errorKey]?.()) ?? m.auth_errors_unexpected();
}
