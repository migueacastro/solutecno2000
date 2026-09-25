import { m } from '$lib/paraglide/messages.js';

/**
 * Errores de las actions del admin: el servidor devuelve SOLO una clave
 * estable (fail(status, { errorKey: '...' })) y el cliente la traduce aquí
 * con paraglide. Así el server no contiene texto de UI y el mensaje sale
 * siempre en el idioma del visitante.
 *
 * Cualquier clave desconocida cae en admin_errors_unexpected del caller.
 */
export const ERRORS: Record<string, () => string> = {
	no_session: () => m.admin_errors_no_session(),
	name_too_long: () => m.admin_errors_name_too_long(),
	save_name: () => m.admin_errors_save_name(),
	json_invalid: () => m.admin_errors_json_invalid(),
	tokens_invalid: () => m.admin_errors_tokens_invalid(),
	save_theme: () => m.admin_errors_save_theme(),
	source_theme: () => m.admin_errors_source_theme(),
	duplicate_theme: () => m.admin_errors_duplicate_theme(),
	activate_theme: () => m.admin_errors_activate_theme(),
	delete_preset: () => m.admin_errors_delete_preset(),
	theme_active: () => m.admin_errors_theme_active(),
	delete_theme: () => m.admin_errors_delete_theme(),
	invalid_field: () => m.admin_errors_invalid_field(),
	select_file: () => m.admin_errors_select_file(),
	format: () => m.admin_errors_format(),
	size: () => m.admin_errors_size(),
	upload_file: () => m.admin_errors_upload_file(),
	assign_file: () => m.admin_errors_assign_file(),
	remove_file: () => m.admin_errors_remove_file(),
	reset: () => m.admin_errors_reset(),
	name_required: () => m.admin_errors_name_required(),
	slug_invalid: () => m.admin_errors_slug_invalid(),
	slug_conflict: () => m.admin_errors_slug_conflict(),
	price_invalid: () => m.admin_errors_price_invalid(),
	currency_invalid: () => m.admin_errors_currency_invalid(),
	product_not_found: () => m.admin_errors_product_not_found(),
	create_product: () => m.admin_errors_create_product(),
	update_product: () => m.admin_errors_update_product(),
	delete_product: () => m.admin_errors_delete_product(),
	fx_cooldown: () => m.admin_errors_fx_cooldown(),
	fx_no_key: () => m.admin_errors_fx_no_key(),
	fx_key_invalid: () => m.admin_errors_fx_key_invalid(),
	fx_auth: () => m.admin_errors_fx_auth(),
	fx_quota: () => m.admin_errors_fx_quota(),
	fx_rate_limited: () => m.admin_errors_fx_rate_limited(),
	fx_unreachable: () => m.admin_errors_fx_unreachable(),
	fx_bad_payload: () => m.admin_errors_fx_bad_payload(),
	fx_no_provider: () => m.admin_errors_fx_no_provider(),
	fx_provider_not_found: () => m.admin_errors_fx_provider_not_found(),
	fx_provider_disabled: () => m.admin_errors_fx_provider_disabled(),
	fx_save: () => m.admin_errors_fx_save()
};

/** Traduce una clave de error (o cae al genérico si es desconocida). */
export function errorMessage(errorKey?: string): string {
	return (errorKey && ERRORS[errorKey]?.()) ?? m.admin_errors_unexpected();
}
