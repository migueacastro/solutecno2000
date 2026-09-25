import type { Database } from '$lib/database.types';
import type { PageServerLoad } from './$types';
import { parseListParams } from '$lib/admin/list-params';

/**
 * Listado de productos: paginación/orden/filtro server-side (el estado
 * vive en la URL y SIEMPRE pasa por las whitelists de parseListParams —
 * los params de la URL no se confían). `.range()` + `count: 'exact'`
 * alimenta el footer "X–Y de Z" y los límites de prev/next.
 */

const SORT_FIELDS = ['name', 'price', 'updated_at'] as const;
const STATUSES = ['draft', 'active', 'archived', 'unlisted'] as const;
const PAGE_SIZE = 25;
const DEFAULTS = {
	sort: { field: 'updated_at', dir: 'desc' as const },
	status: null
};

export const load: PageServerLoad = async ({ url, locals }) => {
	const params = parseListParams(url.searchParams, [...SORT_FIELDS], [...STATUSES], DEFAULTS);

	// Sin Supabase (preview sin secrets): lista vacía, la página muestra
	// su estado vacío sin romper el shell.
	if (!locals.supabase) return { rows: [], total: 0, params, pageSize: PAGE_SIZE };

	const from = (params.page - 1) * PAGE_SIZE;
	const to = from + PAGE_SIZE - 1;

	let query = locals.supabase
		.from('products')
		.select('id, name, slug, status, price, currency, price_on_request, updated_at', {
			count: 'exact'
		})
		.order(params.sort.field, { ascending: params.sort.dir === 'asc' })
		.range(from, to);

	// Tab de status (null = Todos). El param ya pasó la whitelist de
	// parseListParams; el cast al enum es seguro.
	if (params.status) {
		query = query.eq('status', params.status as Database['public']['Enums']['product_status']);
	}
	// Búsqueda por nombre (aprovecha el índice trgm de la RPC del buscador).
	if (params.q) {
		query = query.ilike('name', `%${params.q}%`);
	}

	const { data: rows, count } = await query;
	const total = count ?? 0;

	return { rows: rows ?? [], total, params, pageSize: PAGE_SIZE };
};
