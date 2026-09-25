/**
 * Barrel de tasas de cambio. Todo lo que toca la DB vive en $lib/server/fx;
 * esto solo exporta tipos y helpers de conversión isomorfos.
 *
 * ── Punto de conexión del storefront (aún sin precios en el storefront) ──
 *
 * El load del storefront (público, nunca /admin/settings) debe:
 *   1. `getFreshRates(locals.supabase, { allowFetch: false })` — solo
 *      lectura: sirve la caché con su TTL y NO gasta cuota (el refresco
 *      ocurre en settings con sync manual o al pasar el TTL en admin).
 *   2. leer el price list activo de la moneda objetivo (`price_lists` con
 *      published_at + `price_list_prices` por producto) — ver el comentario
 *      de resolveVesPrice para la resolución completa.
 *   3. por producto, `resolveVesPrice(...)` solo si currency USD/EUR
 *      (PEN no tiene tasa "por ahora", decisión del usuario).
 *
 * Tradeoff aceptado: el tráfico público puede servir tasas stale (el
 * snapshot lo marca con `stale`). La sync (y el fetch con cuota) SOLO
 * ocurre en el admin: syncProvider lee la API key de fx_provider_keys,
 * tabla que el anon no alcanza por RLS — el storefront nunca la necesita.
 */
export type {
	FxRate,
	FxProviderHealth,
	FxSnapshot,
	HistoryPoint,
	HistorySeries,
	PriceListPriceRow,
	PriceListRef
} from './types';
export { convertToVes, formatPriceVes, pickRate, resolveVesPrice } from './convert';
