/**
 * Estado de lista (página, búsqueda, filtro, orden) que vive en la URL.
 * `parseListParams` valida/clampea con whitelists (los params de URL nunca
 * se confían); `buildUrl` serializa omitiendo los defaults para que la
 * URL canónica no acumule `page=1` ni orden redundante.
 */

export type SortDir = 'asc' | 'desc';

export type ListParams = {
	page: number;
	q: string;
	/** Filtro de estado; null = sin filtro (Todos). */
	status: string | null;
	sort: { field: string; dir: SortDir };
};

/** Defaults de parse; buildUrl usa los que vienen en params. */
export type ListDefaults = { sort: { field: string; dir: SortDir }; status?: string | null };

/** Número máximo de página sensato: evita `?page=999999999`. */
const MAX_PAGE = 100_000;

/** Regex de orden aceptado en la URL (`campo-asc` | `campo-desc`). */
const SORT_RE = /^([a-z_]+)-(asc|desc)$/;

/** Lee y valida los params de una URL contra las whitelists dadas. */
export function parseListParams(
	searchParams: URLSearchParams,
	sortFields: string[],
	statuses: string[] | null,
	defaults: ListDefaults
): ListParams {
	const rawPage = Number(searchParams.get('page'));
	const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= MAX_PAGE ? rawPage : 1;

	const q = (searchParams.get('q') ?? '').trim().slice(0, 100);

	const rawStatus = searchParams.get('status');
	const status = rawStatus && statuses?.includes(rawStatus) ? rawStatus : (defaults.status ?? null);

	// Sort: solo campos de la whitelist; si el param es inválido, default.
	const sortMatch = SORT_RE.exec(searchParams.get('sort') ?? '');
	const sortField =
		sortMatch && sortFields.includes(sortMatch[1]) ? sortMatch[1] : defaults.sort.field;
	const sortDir: SortDir = sortMatch ? (sortMatch[2] as SortDir) : defaults.sort.dir;

	return { page, q, status, sort: { field: sortField, dir: sortDir } };
}

/** Claves de param presentes en params pero que igualan el default. */
function isDefault(params: ListParams, defaults: ListDefaults): boolean {
	return (
		params.page === 1 &&
		params.q === '' &&
		params.status === (defaults.status ?? null) &&
		params.sort.field === defaults.sort.field &&
		params.sort.dir === defaults.sort.dir
	);
}

/**
 * Construye la URL de la lista: omite params que igualan el default
 * (URL canónica) y acepta overrides puntuales sin mutar `params`.
 */
export function buildUrl(
	path: string,
	params: ListParams,
	defaults: ListDefaults,
	overrides: Partial<ListParams> = {}
): string {
	const merged: ListParams = { ...params, ...overrides };
	if (isDefault(merged, defaults)) return path;

	const search = new URLSearchParams();
	if (merged.q !== '') search.set('q', merged.q);
	if (merged.status !== null && merged.status !== (defaults.status ?? null)) {
		search.set('status', merged.status);
	}
	if (merged.sort.field !== defaults.sort.field || merged.sort.dir !== defaults.sort.dir) {
		search.set('sort', `${merged.sort.field}-${merged.sort.dir}`);
	}
	if (merged.page !== 1) search.set('page', String(merged.page));

	const query = search.toString();
	return query === '' ? path : `${path}?${query}`;
}
