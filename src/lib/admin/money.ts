/**
 * Formato de dinero para la tabla de productos. Los montos viven como
 * `numeric(12,2)` (string en el cliente) — nunca float.
 */
import { getLocale } from '$lib/paraglide/runtime';
import { m } from '$lib/paraglide/messages.js';

/**
 * Formatea el precio de un producto. Devuelve el texto "a consultar"
 * cuando no hay precio o el producto es a consultar. `numeric(12,2)`
 * llega como number en los tipos generados (string aceptado por si el
 * caller lo maneja crudo).
 */
export function formatPrice(
	price: number | string | null,
	currency: string | null,
	onRequest: boolean
): string {
	if (onRequest || price === null || price === '') {
		return m.admin_products_price_on_request();
	}
	const amount = Number(price);
	if (!Number.isFinite(amount)) return m.admin_products_price_on_request();

	return new Intl.NumberFormat(getLocale(), {
		style: 'currency',
		currency: currency ?? 'PEN'
	}).format(amount);
}
