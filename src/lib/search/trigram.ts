/**
 * Trigramas en TypeScript, espejo del convenio de pg_trgm: misma
 * normalización (case-insensitive) y mismo padding (dos espacios antes y
 * después) para que la similitud Dice que calculamos en cliente sea
 * comparable con similarity() del servidor.
 */

/** Normaliza texto para indexar: NFD sin diacríticos, lowercase, espacios colapsados. */
export function normalize(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ');
}

/** Set de trigramas con el padding '  text  ' de pg_trgm. */
export function trigramSet(text: string): Set<string> {
	const padded = `  ${normalize(text)} `;
	const set = new Set<string>();
	for (let i = 0; i < padded.length - 2; i++) {
		set.add(padded.slice(i, i + 3));
	}
	return set;
}

/**
 * Similitud Dice (2|A∩B| / (|A|+|B|)): idéntica a similarity() de pg_trgm.
 * Devuelve 0–1; dos sets vacíos se consideran idénticos (evita NaN).
 */
export function diceSimilarity(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 1;
	if (a.size === 0 || b.size === 0) return 0;
	let intersection = 0;
	// Iteramos el set más pequeño para minimizar lookups.
	const [small, large] = a.size <= b.size ? [a, b] : [b, a];
	for (const gram of small) {
		if (large.has(gram)) intersection++;
	}
	return (2 * intersection) / (a.size + b.size);
}
