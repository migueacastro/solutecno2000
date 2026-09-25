/**
 * Conversión de precios a VES con las tasas de fx_rates. Isomorfo: lo usa
 * el admin (FxSection) y el storefront futuro para resolver el precio VES.
 */
import { getLocale } from '$lib/paraglide/runtime';
import type { FxRate, PriceListRef } from './types';

/**
 * Tasa de compra para un par (base → VES). Por defecto usa el mercado
 * `bcv` (oficial); si ese mercado no tiene la tasa, cae a la primera del
 * par disponible (los P2P de USDT).
 */
export function pickRate(rates: FxRate[], base: string, market = 'bcv'): FxRate | null {
	const buy = rates.filter((r) => r.tradeType === 'buy' && r.base === base);
	return buy.find((r) => r.market === market) ?? buy[0] ?? null;
}

/** Multiplica el monto por la tasa (el redondeo lo hace el caller). */
export function convertToVes(amount: number, rate: number): number {
	return amount * rate;
}

/** Formatea un monto ya convertido a bolívares. */
export function formatPriceVes(amount: number): string {
	return new Intl.NumberFormat(getLocale(), {
		style: 'currency',
		currency: 'VES'
	}).format(amount);
}

/**
 * Resolución del precio VES estilo PriceList de Shopify, en orden:
 *   1. precio fijo del price list (`fixedPrice`, de price_list_prices) → ese
 *      (siendo fijo, el ajuste porcentual no aplica).
 *   2. conversión por tasa × (1 + ajuste%) — solo USD/EUR: PEN no tiene
 *      tasa en fx_rates por decisión del usuario.
 *   3. sin precio VES → null (la UI decide: ocultar o "a consultar").
 */
export function resolveVesPrice(input: {
	price: number | string | null;
	currency: string | null;
	priceOnRequest: boolean | null;
	rates: FxRate[];
	priceList?: PriceListRef | null;
	/** Precio fijo del price list para este producto/variante (VES). */
	fixedPrice?: number | string | null;
}): number | null {
	if (input.priceOnRequest || input.price === null || input.price === '') {
		return null;
	}

	if (input.priceList) {
		const fixed = Number(input.fixedPrice);
		if (Number.isFinite(fixed)) return fixed;

		// El ajuste solo tiene sentido sobre una conversión por tasa; si el
		// listado apunta a la misma moneda del precio base no hay nada que
		// convertir (y una lista VES sin tasa disponible cae abajo igual).
		const rate = pickRate(input.rates, input.currency ?? '', 'bcv');
		if (rate) {
			return roundVes(
				convertToVes(Number(input.price), rate.rate) *
					(1 + (input.priceList.adjustmentPercentage ?? 0) / 100)
			);
		}
		return null;
	}

	const rate = pickRate(input.rates, input.currency ?? '', 'bcv');
	if (!rate) return null;

	return roundVes(convertToVes(Number(input.price), rate.rate));
}

/** Redondeo a 2 decimales (los montos VES se muestran con centavos). */
function roundVes(amount: number): number {
	return Math.round(amount * 100) / 100;
}
