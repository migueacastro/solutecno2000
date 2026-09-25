import { createSupabaseBrowserClient } from '$lib/supabase/client';
import type { SearchItem, SearchSource } from './types';

/**
 * Fuente remota de productos para el SearchBar (RPC pg_trgm search_products,
 * migración 20260923000800): una sola query contra la base, tolerante a
 * typos y con caché a nivel de cachedSearch. Cualquier error (sin red, RPC
 * ausente, RLS) devuelve [] para no romper la fuente local.
 */
export function productsSearchSource(): SearchSource {
	return {
		id: 'remote:products',
		search: async (query, signal): Promise<SearchItem[]> => {
			const { data, error } = await createSupabaseBrowserClient()
				.rpc('search_products', { query, max_results: 8 })
				.abortSignal(signal);
			if (error || !data) return [];
			return data.map((row): SearchItem => {
				const parts = [row.name, row.vendor, row.product_type].filter(
					(v): v is string => Boolean(v) && v !== row.name
				);
				return {
					id: `product:${row.id}`,
					label: row.name,
					group: 'products',
					keywords: parts.join(' '),
					href: `/admin/products/${row.id}`
				};
			});
		}
	};
}
