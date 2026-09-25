/**
 * Integración con proveedores de tasas de cambio (montosve hoy, otros
 * mañana). La API key vive en fx_provider_keys (RLS staff-only: el anon no
 * la puede leer) y se edita desde el admin — sin redeploy. El server solo
 * la consume dentro de syncProvider y jamás la envía al cliente (la UI ve
 * un booleano apiKeyMissing).
 *
 * Caché y cuota (plan free = 150 req/mes): ttl_minutes en fx_providers
 * (720 ≈ 60 req/mes), cooldown de 60 s entre syncs y /health sin cuota
 * como pre-chequeo solo cuando el último intento falló.
 *
 * Failover: se recorren los proveedores enabled por (is_primary desc,
 * priority asc); si el activo falla, marca last_status/last_error y prueba
 * el siguiente. El snapshot SIEMPRE se devuelve (tasas viejas stale), los
 * fallos salen como errorKeys sin lanzar.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '$lib/database.types';
import type { FxRate, FxProviderHealth, FxSnapshot, HistorySeries } from '$lib/fx';

type Supabase = SupabaseClient<Database>;
type FxProviderRow = Database['public']['Tables']['fx_providers']['Row'];

/** Resultado de una sincronización (sin lanzar: errorKey traducible). */
type SyncResult = { ok: boolean; errorKey?: string };

/** Cada proveedor se integra con un adapter registrado por su id. */
type FxAdapter = {
	fetchRates(baseUrl: string, apiKey: string): Promise<{ status: number; json: unknown }>;
};

const montosveAdapter: FxAdapter = {
	async fetchRates(baseUrl, apiKey) {
		// Un request trae todos los mercados y pares (trade_type buy = default).
		const response = await fetch(`${baseUrl}/fx/rates?trade_type=buy`, {
			headers: { 'X-API-Key': apiKey },
			signal: AbortSignal.timeout(10_000)
		});
		return { status: response.status, json: await response.json() };
	}
};

const ADAPTERS: Record<string, FxAdapter | undefined> = { montosve: montosveAdapter };

const COOLDOWN_MS = 60_000;
const LEASE_MS = 2 * 60_000;

/** Lock in-proceso: dos requests simultáneos comparten la misma promesa. */
const inFlight = new Map<string, Promise<SyncResult>>();

function withLock(providerId: string, task: () => Promise<SyncResult>): Promise<SyncResult> {
	const existing = inFlight.get(providerId);
	if (existing) return existing;
	const promise = task().finally(() => {
		if (inFlight.get(providerId) === promise) inFlight.delete(providerId);
	});
	inFlight.set(providerId, promise);
	return promise;
}

/**
 * Valida el shape de la respuesta de /fx/rates con type guards (sin zod).
 * Filas con un mercado desconocido en fx_markets se descartan (la FK las
 * rechazaría); si no queda ninguna válida devuelve null (bad payload).
 *
 * Según el OpenAPI de montosve, SOLO market/type/currency_pair/rate/
 * updated_at son requeridos: previous_rate, change_percentage, date y
 * trade_type pueden venir ausentes o null (el BCV —tasa oficial— no tiene
 * trade_type). best_rate es NUMBER (0/1), no boolean.
 */
export function parseRatesResponse(
	json: unknown,
	markets: Map<string, { name: string; kind: 'official' | 'p2p' }>
): FxRate[] | null {
	if (typeof json !== 'object' || json === null || !('data' in json)) return null;
	const data = (json as { data: unknown }).data;
	if (!Array.isArray(data)) return null;

	// null/undefined → null (Number(null) sería 0, no NaN); texto numérico ok.
	const num = (value: unknown): number | null => {
		if (value === null || value === undefined) return null;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	};

	const rates: FxRate[] = [];
	for (const item of data) {
		if (typeof item !== 'object' || item === null) continue;
		const row = item as Record<string, unknown>;

		const market = row.market;
		const pair = row.currency_pair;
		const rate = num(row.rate);

		if (typeof market !== 'string' || typeof pair !== 'string') continue;
		if (rate === null || rate <= 0) continue;

		// 'USD/VES' → { base: 'USD', quote: 'VES' }
		const slash = pair.indexOf('/');
		const base = slash > 0 ? pair.slice(0, slash).trim().toUpperCase() : '';
		const quote =
			slash > 0
				? pair
						.slice(slash + 1)
						.trim()
						.toUpperCase()
				: '';
		if (!base || quote !== 'VES') continue;

		const marketInfo = markets.get(market);
		if (!marketInfo) continue;

		// El BCV no reporta buy/sell: pedimos trade_type=buy, así que lo
		// ausente o inválido se guarda como 'buy' (la columna es NOT NULL).
		const tradeType = row.trade_type === 'sell' ? 'sell' : 'buy';

		rates.push({
			market,
			marketName: marketInfo.name,
			marketKind: marketInfo.kind,
			base,
			quote,
			tradeType,
			rate,
			previousRate: num(row.previous_rate),
			changePercentage: num(row.change_percentage),
			// number (0/1) según el OpenAPI; true legacy por si cambia.
			bestRate: row.best_rate === true || row.best_rate === 1,
			apiDate: typeof row.date === 'string' ? row.date : null,
			apiUpdatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
			// fetched_at lo pone el server (momento del fetch).
			fetchedAt: new Date().toISOString()
		});
	}

	return rates.length > 0 ? rates : null;
}

/** Health del proveedor (endpoint público, NO consume cuota). */
async function providerAllSourcesDown(baseUrl: string): Promise<boolean | null> {
	try {
		const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5_000) });
		if (!response.ok) return null;
		const json: unknown = await response.json();
		if (typeof json !== 'object' || json === null || !('sources' in json)) return null;
		const sources = (json as { sources: Record<string, unknown> }).sources;
		const statuses = Object.values(sources).map((s) => (s as { status?: string })?.status);
		if (statuses.length === 0) return null;
		// down | scheduled_down en todas = no tiene sentido gastar cuota.
		return statuses.every((s) => s === 'down' || s === 'scheduled_down');
	} catch {
		return null;
	}
}

/** Traduce el status HTTP de la API a errorKey (401/403/429, resto → red). */
function errorKeyForStatus(status: number): string {
	if (status === 401) return 'fx_auth';
	if (status === 403) return 'fx_quota';
	if (status === 429) return 'fx_rate_limited';
	return 'fx_unreachable';
}

/**
 * Sincroniza un proveedor: cooldown → lease en DB (anti-fetch paralelo
 * multi-instancia) → health gratis si el último intento falló → fetch →
 * upsert → marca last_synced_at/last_status. Nunca lanza.
 */
export async function syncProvider(
	supabase: Supabase,
	provider: FxProviderRow
): Promise<SyncResult> {
	return withLock(provider.id, async () => {
		const adapter = ADAPTERS[provider.id];
		if (!adapter) return { ok: false, errorKey: 'fx_provider_not_found' };

		// Cooldown contra la DB (no contra la fila en memoria: el admin
		// puede ser otra instancia).
		if (provider.last_synced_at) {
			const since = Date.now() - new Date(provider.last_synced_at).getTime();
			if (since < COOLDOWN_MS) return { ok: false, errorKey: 'fx_cooldown' };
		}

		// Lease: quien logra el update condicional sincroniza; si el update
		// toca 0 filas, otra instancia ya va en camino y se sirve la DB.
		const leaseCutoff = new Date(Date.now() - LEASE_MS).toISOString();
		// El count va en las opciones del update: select() tras filtros no
		// acepta { count, head } en postgrest-js 2.
		const { count: leased } = await supabase
			.from('fx_providers')
			.update({ syncing_since: new Date().toISOString() }, { count: 'exact' })
			.eq('id', provider.id)
			.or(`syncing_since.is.null,syncing_since.lt.${leaseCutoff}`);

		if (leased !== 1) return { ok: false, errorKey: 'fx_cooldown' };

		// El lease se libera SIEMPRE (éxito, error de fetch o de validación).
		try {
			// La key vive en fx_provider_keys (RLS staff-only): solo una sesión
			// de staff (el admin) la alcanza; el storefront no llega a syncProvider.
			const { data: keyRow } = await supabase
				.from('fx_provider_keys')
				.select('api_key')
				.eq('provider_id', provider.id)
				.maybeSingle();
			const apiKey = keyRow?.api_key;
			if (!apiKey) return { ok: false, errorKey: 'fx_no_key' };

			// /health no gasta cuota: solo se consulta si el último intento
			// falló, para no llamar /fx/rates contra un proveedor caído.
			if (provider.last_status === 'error') {
				const allDown = await providerAllSourcesDown(provider.base_url);
				if (allDown === true) {
					await markProvider(supabase, provider.id, 'error', 'health: all sources down');
					return { ok: false, errorKey: 'fx_unreachable' };
				}
			}

			let response: { status: number; json: unknown };
			try {
				response = await adapter.fetchRates(provider.base_url, apiKey);
			} catch {
				await markProvider(supabase, provider.id, 'error', 'fetch failed or timeout');
				return { ok: false, errorKey: 'fx_unreachable' };
			}

			if (response.status !== 200) {
				await markProvider(supabase, provider.id, 'error', `HTTP ${response.status}`);
				return { ok: false, errorKey: errorKeyForStatus(response.status) };
			}

			const markets = await loadMarkets(supabase);
			const rates = parseRatesResponse(response.json, markets);
			if (!rates) {
				await markProvider(supabase, provider.id, 'error', 'unexpected payload shape');
				return { ok: false, errorKey: 'fx_bad_payload' };
			}

			const now = new Date().toISOString();
			const rows = rates.map((rate) => ({
				provider_id: provider.id,
				market_slug: rate.market,
				base_currency: rate.base,
				quote_currency: rate.quote,
				trade_type: rate.tradeType,
				rate: rate.rate,
				previous_rate: rate.previousRate,
				change_percentage: rate.changePercentage,
				best_rate: rate.bestRate,
				api_date: rate.apiDate,
				api_updated_at: rate.apiUpdatedAt,
				fetched_at: now,
				raw: response.json as Json
			}));

			const { error: upsertError } = await supabase.from('fx_rates').upsert(rows, {
				onConflict: 'provider_id,market_slug,base_currency,quote_currency,trade_type'
			});

			if (upsertError) {
				await markProvider(supabase, provider.id, 'error', `upsert: ${upsertError.message}`);
				return { ok: false, errorKey: 'fx_save' };
			}

			// Histórico append-only (fx_rate_history): una fila por tasa por
			// sync. Best-effort: si falla, la caché ya está fresca y la sync
			// sigue siendo ok (el histórico no bloquea el comercio).
			const { error: historyError } = await supabase.from('fx_rate_history').insert(
				rates.map((rate) => ({
					provider_id: provider.id,
					market_slug: rate.market,
					base_currency: rate.base,
					quote_currency: rate.quote,
					trade_type: rate.tradeType,
					rate: rate.rate,
					previous_rate: rate.previousRate,
					change_percentage: rate.changePercentage,
					api_date: rate.apiDate,
					fetched_at: now
				}))
			);
			if (historyError) {
				console.error('fx_rate_history insert:', historyError.message);
			}

			const { error: updateError } = await supabase
				.from('fx_providers')
				.update({
					last_synced_at: now,
					last_status: 'ok',
					last_error: null,
					syncing_since: null
				})
				.eq('id', provider.id);

			if (updateError) return { ok: false, errorKey: 'fx_save' };
			return { ok: true };
		} catch {
			await markProvider(supabase, provider.id, 'error', 'unexpected error');
			return { ok: false, errorKey: 'fx_unreachable' };
		} finally {
			await supabase.from('fx_providers').update({ syncing_since: null }).eq('id', provider.id);
		}
	});
}

/** Marca el proveedor en error (sin tocar syncing_since: lo libera el finally). */
async function markProvider(
	supabase: Supabase,
	providerId: string,
	status: 'ok' | 'error',
	message: string
): Promise<void> {
	await supabase
		.from('fx_providers')
		.update({ last_status: status, last_error: status === 'ok' ? null : message })
		.eq('id', providerId);
}

/** Catálogo de mercados (para nombre/kind y para filtrar slugs desconocidos). */
async function loadMarkets(
	supabase: Supabase
): Promise<Map<string, { name: string; kind: 'official' | 'p2p' }>> {
	const { data } = await supabase.from('fx_markets').select('slug, name, kind');
	const map = new Map<string, { name: string; kind: 'official' | 'p2p' }>();
	for (const row of data ?? []) {
		if (row.kind === 'official' || row.kind === 'p2p') {
			map.set(row.slug, { name: row.name, kind: row.kind });
		}
	}
	return map;
}

/** Mapea filas fx_rates (+join de markets) al FxRate isomorfo. */
type RateJoin = Database['public']['Tables']['fx_rates']['Row'] & {
	fx_markets: { name: string; kind: string } | null;
};

function toFxRate(row: RateJoin): FxRate | null {
	const market = row.fx_markets;
	if (!market || (row.trade_type !== 'buy' && row.trade_type !== 'sell')) return null;
	if (market.kind !== 'official' && market.kind !== 'p2p') return null;

	return {
		market: row.market_slug,
		marketName: market.name,
		marketKind: market.kind,
		base: row.base_currency,
		quote: row.quote_currency,
		tradeType: row.trade_type,
		rate: row.rate,
		previousRate: row.previous_rate,
		changePercentage: row.change_percentage,
		bestRate: row.best_rate,
		apiDate: row.api_date,
		apiUpdatedAt: row.api_updated_at,
		fetchedAt: row.fetched_at
	};
}

async function loadRates(supabase: Supabase, providerId: string): Promise<FxRate[]> {
	const { data } = await supabase
		.from('fx_rates')
		.select('*, fx_markets(name, kind)')
		.eq('provider_id', providerId)
		.order('fetched_at', { ascending: false });

	const seen = new Map<string, FxRate>();
	for (const row of (data ?? []) as RateJoin[]) {
		const rate = toFxRate(row);
		// La fila más reciente por (mercado, par, trade_type) gana.
		if (rate) {
			const key = `${rate.market}|${rate.base}|${rate.quote}|${rate.tradeType}`;
			if (!seen.has(key)) seen.set(key, rate);
		}
	}
	return [...seen.values()];
}

/**
 * Serie histórica de tasas del proveedor (fx_rate_history) para el modal del
 * admin: agrupada por (mercado, par, trade_type), puntos en fetched_at
 * ascendente, listos para graficar. Solo lectura: nunca fetchea.
 */
export async function getRateHistory(
	supabase: Supabase,
	providerId: string,
	days = 90
): Promise<HistorySeries[]> {
	const since = new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();

	const { data } = await supabase
		.from('fx_rate_history')
		.select(
			'market_slug, base_currency, quote_currency, trade_type, rate, fetched_at, fx_markets(name, kind)'
		)
		.eq('provider_id', providerId)
		.gte('fetched_at', since)
		.order('fetched_at');

	type HistoryJoin = {
		market_slug: string;
		base_currency: string;
		quote_currency: string;
		trade_type: string;
		rate: number;
		fetched_at: string;
		fx_markets: { name: string; kind: string } | null;
	};

	const seriesMap = new Map<string, HistorySeries>();
	for (const row of (data ?? []) as HistoryJoin[]) {
		if (!row.fx_markets || (row.fx_markets.kind !== 'official' && row.fx_markets.kind !== 'p2p')) {
			continue;
		}
		if (row.trade_type !== 'buy' && row.trade_type !== 'sell') continue;

		const key = `${row.market_slug}|${row.base_currency}|${row.quote_currency}|${row.trade_type}`;
		let series = seriesMap.get(key);
		if (!series) {
			series = {
				market: row.market_slug,
				marketName: row.fx_markets.name,
				marketKind: row.fx_markets.kind,
				base: row.base_currency,
				quote: row.quote_currency,
				tradeType: row.trade_type,
				points: []
			};
			seriesMap.set(key, series);
		}
		series.points.push({ fetchedAt: row.fetched_at, rate: Number(row.rate) });
	}

	return [...seriesMap.values()];
}

/**
 * Snapshot de tasas para el admin y el storefront. Con allowFetch=true (solo
 * en admin/settings) puede refrescar por TTL o por force; el storefront
 * llama con allowFetch: false y sirve la caché tal cual.
 */
export async function getFreshRates(
	supabase: Supabase,
	opts: { force?: boolean; allowFetch?: boolean } = {}
): Promise<FxSnapshot> {
	const { data: providers } = await supabase
		.from('fx_providers')
		.select('*')
		.order('is_primary', { ascending: false })
		.order('priority');

	const rows = providers ?? [];

	// Mapa de providers CON key (no se lee el valor: solo sirve para el badge
	// "Sin API key"). Bajo sesión anon la tabla devolvería 0 filas (RLS
	// staff-only) y todo marcaría apiKeyMissing=true; es inofensivo: el
	// storefront no renderiza health ni fetchea, y syncProvider re-verifica.
	const { data: keys } = await supabase.from('fx_provider_keys').select('provider_id');
	const withKey = new Set((keys ?? []).map((row) => row.provider_id));

	const health: FxProviderHealth[] = rows.map((row) => ({
		id: row.id,
		name: row.name,
		enabled: row.enabled,
		isPrimary: row.is_primary,
		lastStatus:
			row.last_status === 'ok' || row.last_status === 'error' ? row.last_status : 'unknown',
		lastError: row.last_error,
		lastSyncedAt: row.last_synced_at,
		// La key se guarda desde el admin: guardarla basta para que el badge
		// "Sin API key" desaparezca (sin redeploy).
		apiKeyMissing: !withKey.has(row.id)
	}));

	const enabled = rows.filter((row) => row.enabled);
	const active = enabled[0];

	if (!active) {
		return {
			rates: [],
			providers: health,
			activeProviderId: null,
			stale: true,
			syncedAt: null,
			errorKey: 'fx_no_provider'
		};
	}

	let rates = await loadRates(supabase, active.id);
	const latest = rates.reduce<string | null>(
		(acc, rate) => (acc && acc > rate.fetchedAt ? acc : rate.fetchedAt),
		null
	);
	const stale = !latest || Date.now() - new Date(latest).getTime() > active.ttl_minutes * 60_000;
	const syncedAt = latest;

	// Fetch solo desde el admin (settings): el storefront NUNCA pasa por aquí.
	if ((stale || opts.force) && opts.allowFetch) {
		// Activo primero; si falla, los demás enabled por priority (failover).
		let errorKey: string | undefined = 'fx_no_provider';
		for (const provider of enabled) {
			const result = await syncProvider(supabase, provider);
			if (result.ok) {
				errorKey = undefined;
				if (provider.id !== active.id) {
					rates = await loadRates(supabase, provider.id);
					return {
						rates,
						providers: health,
						activeProviderId: provider.id,
						stale: false,
						syncedAt: new Date().toISOString()
					};
				}
				break;
			}
			errorKey = result.errorKey ?? errorKey;
		}

		// Si el activo falló y un secondary tampoco pudo: se sirven las viejas.
		if (errorKey) {
			return { rates, providers: health, activeProviderId: active.id, stale, syncedAt, errorKey };
		}
	}

	return { rates, providers: health, activeProviderId: active.id, stale, syncedAt };
}
