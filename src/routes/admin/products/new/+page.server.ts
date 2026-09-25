import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { parseProductForm } from '$lib/admin/product-form';

/**
 * Creación de productos. Sin load: la página es un formulario vacío.
 * El guard del layout del admin ya garantiza sesión staff/admin; aquí se
 * re-verifica en la action (fail 401) y RLS es la segunda barrera. Los
 * errores son CLAVES (errorKey) que el cliente traduce con
 * $lib/i18n/errors.ts — el server no contiene texto de UI.
 */
export const actions: Actions = {
	create_product: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { create_product: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const parsed = parseProductForm(form);
		if (!parsed.ok) {
			return fail(400, { create_product: { errorKey: parsed.errorKey } });
		}
		const values = parsed.values;

		// Publicar de entrada sella published_at; crear como draft/archived
		// lo deja null (misma regla que update_product).
		const publishedAt =
			values.status === 'active' || values.status === 'unlisted' ? new Date().toISOString() : null;

		const { data: created, error } = await locals.supabase
			.from('products')
			.insert({ ...values, published_at: publishedAt })
			.select('id')
			.single();

		if (error) {
			// 23505 = unique violation: el slug ya lo usa otro producto.
			if (error.code === '23505') {
				return fail(400, { create_product: { errorKey: 'slug_conflict' } });
			}
			return fail(500, { create_product: { errorKey: 'create_product' } });
		}

		return { create_product: { ok: true, newId: created.id } };
	}
};
