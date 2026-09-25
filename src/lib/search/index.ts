import { diceSimilarity, trigramSet } from './trigram';
import type { SearchItem } from './types';

/**
 * Búsqueda local sobre un array de SearchItem (modo JSON del frontend).
 * El índice de trigramas se precomputa UNA vez por array y queda en un
 * WeakMap por REFERENCIA: si el array se mantiene estable (p. ej. con un
 * $derived que no cambia por keystroke), ningún keystroke re-tokeniza.
 */

type IndexedItem = {
	item: SearchItem;
	/** Trigramas de label + keywords (pesado abajo). */
	set: Set<string>;
};

const indexCache = new WeakMap<SearchItem[], IndexedItem[]>();

/** Devuelve el índice del array, precomputándolo solo la primera vez. */
export function getIndexed(items: SearchItem[]): IndexedItem[] {
	let indexed = indexCache.get(items);
	if (!indexed) {
		indexed = items.map((item) => ({
			item,
			set: trigramSet([item.label, item.keywords ?? ''].filter(Boolean).join(' '))
		}));
		indexCache.set(items, indexed);
	}
	return indexed;
}

export type SearchLocalOptions = {
	/** Umbral Dice mínimo; 0.15 es tolerante a typos sin ruido excesivo. */
	threshold?: number;
	/** Máximo de resultados. */
	limit?: number;
};

const DEFAULT_THRESHOLD = 0.15;
const DEFAULT_LIMIT = 8;
/** Peso de keywords frente a label: ayudan, no dominan. */
const KEYWORD_WEIGHT = 0.7;

/**
 * Scorea la query contra label + keywords de cada item, ordena por score
 * descendente y corta a limit. Síncrono y sin red: para cientos de items
 * con sets precomputados es sub-milisegundo.
 */
export function searchLocal(
	query: string,
	items: SearchItem[],
	options: SearchLocalOptions = {}
): SearchItem[] {
	const normalized = query.trim();
	if (normalized.length < 2) return [];
	const querySet = trigramSet(normalized);
	const threshold = options.threshold ?? DEFAULT_THRESHOLD;
	const limit = options.limit ?? DEFAULT_LIMIT;

	const scored: { item: SearchItem; score: number }[] = [];
	for (const { item, set } of getIndexed(items)) {
		const labelSet = trigramSet(item.label);
		// Label manda; keywords entran atenuadas. Tomamos el máximo de ambos.
		const labelScore = diceSimilarity(querySet, labelSet);
		const keywordScore = item.keywords ? diceSimilarity(querySet, set) * KEYWORD_WEIGHT : 0;
		const score = Math.max(labelScore, keywordScore);
		if (score >= threshold) scored.push({ item, score });
	}
	scored.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));
	return scored.slice(0, limit).map(({ item }) => item);
}
