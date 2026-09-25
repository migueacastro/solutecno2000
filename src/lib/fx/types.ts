/**
 * Tipos de tasas de cambio isomorfos: los consumen el server
 * ($lib/server/fx) y el storefront/admin, así que no importan nada de
 * $lib/server ni de database.types (los shapes van a mano, como FxRate).
 */

/** Fila de fx_rates ya mapeada (numeric llega como number). */
export type FxRate = {
	/** Slug del mercado (fx_markets.slug, ej. 'bcv'). */
	market: string;
	marketName: string;
	marketKind: 'official' | 'p2p';
	base: string;
	quote: string;
	tradeType: 'buy' | 'sell';
	rate: number;
	previousRate: number | null;
	changePercentage: number | null;
	bestRate: boolean;
	/** Fecha según la API (YYYY-MM-DD). */
	apiDate: string | null;
	/** updated_at según la API (puede ser más viejo que fetchedAt). */
	apiUpdatedAt: string | null;
	/** Momento del fetch (TTL de la caché). */
	fetchedAt: string;
};

/** Estado de un proveedor de tasas (fila fx_providers proyectada). */
export type FxProviderHealth = {
	id: string;
	name: string;
	enabled: boolean;
	isPrimary: boolean;
	lastStatus: 'unknown' | 'ok' | 'error';
	lastError: string | null;
	lastSyncedAt: string | null;
	/** true = no hay key guardada en fx_provider_keys para este proveedor. */
	apiKeyMissing: boolean;
};

/**
 * Snapshot de tasas listo para convertir. Se devuelve SIEMPRE (tasas viejas
 * con stale=true), nunca se lanza: los fallos de sync van en errorKey.
 */
export type FxSnapshot = {
	rates: FxRate[];
	providers: FxProviderHealth[];
	/** Proveedor cuyas tasas se sirven en rates. */
	activeProviderId: string | null;
	/** true = fetched_at superó el TTL del proveedor activo. */
	stale: boolean;
	syncedAt: string | null;
	/** Clave de error del último intento de sync (traducible en i18n/errors). */
	errorKey?: string;
};

/** Punto de la serie histórica (fila fx_rate_history proyectada). */
export type HistoryPoint = {
	/** Momento del fetch (eje temporal). */
	fetchedAt: string;
	rate: number;
};

/** Serie histórica completa de una tasa (mercado + par + trade_type). */
export type HistorySeries = {
	market: string;
	marketName: string;
	marketKind: 'official' | 'p2p';
	base: string;
	quote: string;
	tradeType: 'buy' | 'sell';
	/** Ordenados fetched_at ascendente (listos para graficar). */
	points: HistoryPoint[];
};

/** Referencia del price list activo de una moneda (PriceList de Shopify). */
export type PriceListRef = {
	id: string;
	name: string;
	currency: string;
	/** null = conversión pura; +5 = +5% sobre lo convertido. */
	adjustmentPercentage: number | null;
};

/**
 * Fila de price_list_prices tal como la consulta el storefront (variante
 * null = precio a nivel producto, el "Default Title" de Shopify).
 */
export type PriceListPriceRow = {
	product_id: string;
	variant_id: string | null;
	price: number;
};
