import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseProductForm } from '$lib/admin/product-form';
import { m } from '$lib/paraglide/messages.js';

/**
 * Edición y borrado de productos. El guard del layout del admin ya
 * garantiza sesión staff/admin; aquí se re-verifica en cada action
 * (fail 401) y RLS es la segunda barrera. Los errores son CLAVES
 * (errorKey) que el cliente traduce con $lib/i18n/errors.ts.
 */

const PRODUCT_COLUMNS =
	'id, name, slug, description, status, price, currency, price_on_request, vendor, product_type, published_at, created_at, updated_at';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Sin Supabase (preview sin secrets): la página muestra su estado
	// "no encontrado" sin romper el shell.
	if (!locals.supabase) return { product: null };

	const { data: product } = await locals.supabase
		.from('products')
		.select(PRODUCT_COLUMNS)
		.eq('id', params.id)
		.maybeSingle();

	if (!product) {
		// Paraglide resuelve el locale por request en SSR (middleware).
		error(404, m.admin_errors_product_not_found());
	}

	return { product };
};

export const actions: Actions = {
	/** Guarda los campos editables del producto. */
	update_product: async ({ params, request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { update_product: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const parsed = parseProductForm(form);
		if (!parsed.ok) {
			return fail(400, { update_product: { errorKey: parsed.errorKey } });
		}
		const values = parsed.values;

		// Regla published_at: pasar a active|unlisted con published_at null
		// lo sella a ahora; pasar a draft|archived lo conserva (histórico de
		// la primera publicación).
		const { data: current } = await locals.supabase
			.from('products')
			.select('published_at')
			.eq('id', params.id)
			.maybeSingle();

		if (!current) {
			return fail(404, { update_product: { errorKey: 'product_not_found' } });
		}

		const publishedAt =
			(values.status === 'active' || values.status === 'unlisted') && !current.published_at
				? new Date().toISOString()
				: current.published_at;

		const { error } = await locals.supabase
			.from('products')
			.update({ ...values, published_at: publishedAt })
			.eq('id', params.id);

		if (error) {
			// 23505 = unique violation: el slug ya lo usa otro producto.
			if (error.code === '23505') {
				return fail(400, { update_product: { errorKey: 'slug_conflict' } });
			}
			return fail(500, { update_product: { errorKey: 'update_product' } });
		}

		return { update_product: { ok: true } };
	},

	/** Elimina el producto (RLS acota quién puede; el server re-verifica). */
	delete_product: async ({ params, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { delete_product: { errorKey: 'no_session' } });
		}

		const { error } = await locals.supabase.from('products').delete().eq('id', params.id);

		if (error) {
			return fail(500, { delete_product: { errorKey: 'delete_product' } });
		}

		return { delete_product: { ok: true } };
	}
};
