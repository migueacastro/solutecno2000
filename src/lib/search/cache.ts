import type { SearchItem } from './types';

/**
 * Caché de búsquedas para fuentes REMOTAS (la local es tan barata con sets
 * preindexados que no la cacheamos). Map module-level: solo se llena desde
 * interacciones de usuario en el cliente, así que SSR no lo puebla.
 */

type CacheEntry = { items: SearchItem[]; expiresAt: number };

const MAX_ENTRIES = 30;
const TTL_MS = 60_000;
/** En vuelo por clave: evita requests duplicadas con la misma query. */
const inFlight = new Map<string, Promise<SearchItem[]>>();
const cache = new Map<string, CacheEntry>();

/**
 * Resuelve la búsqueda del fetcher con caché (TTL 60s, máx 30 entradas).
 * La eviction es FIFO del más viejo: Map conserva el orden de inserción,
 * así que un HIT refresca la posición con delete + re-set (LRU barato).
 * El callerSignal (abort del SearchBar) corta el fetch en vuelo, aunque el
 * resultado cacheado sigue sirviendo para la próxima búsqueda igual.
 */
export function cachedSearch(
	key: string,
	fetcher: (signal: AbortSignal) => Promise<SearchItem[]>,
	callerSignal?: AbortSignal
): Promise<SearchItem[]> {
	const hit = cache.get(key);
	const now = Date.now();
	if (hit) {
		if (hit.expiresAt > now) {
			// Refresca el orden (LRU) y devuelve sin red.
			cache.delete(key);
			cache.set(key, hit);
			return Promise.resolve(hit.items);
		}
		cache.delete(key);
	}

	const pending = inFlight.get(key);
	if (pending) return pending;

	const controller = new AbortController();
	callerSignal?.addEventListener('abort', () => controller.abort(), { once: true });
	const request = fetcher(controller.signal)
		.then((items) => {
			cache.set(key, { items, expiresAt: Date.now() + TTL_MS });
			// Eviction FIFO del más viejo al superar el máximo.
			while (cache.size > MAX_ENTRIES) {
				const oldest = cache.keys().next().value;
				if (oldest === undefined) break;
				cache.delete(oldest);
			}
			return items;
		})
		.finally(() => {
			inFlight.delete(key);
		});
	inFlight.set(key, request);
	return request;
}
