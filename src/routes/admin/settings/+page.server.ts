import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	APP_TOKEN_DEFAULTS,
	APP_TOKEN_DARK_DEFAULTS,
	completeTokens,
	validateTokens
} from '$lib/config/theme';
import { getFreshRates, getRateHistory } from '$lib/server/fx';

/**
 * Página de Ajustes: marca (nombre, logo, favicon), temas de la paleta y
 * tasas de cambio (FX). El guard del layout del admin ya garantiza sesión
 * staff/admin; aquí se re-verifica en cada action (fail 401) y RLS es la
 * segunda barrera.
 *
 * Los errores de las actions son CLAVES (errorKey), no texto: el cliente los
 * traduce con $lib/i18n/errors.ts. Los tokens se guardan COMPLETOS por modo
 * (CHECK de 19 claves); los borradores parciales del editor se completan con
 * completeTokens() antes del update.
 */

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.supabase) return { settings: null, themes: [], fx: null, history: [] };

	// Fila singleton de settings (siempre existe tras la migración 0006, pero
	// se maneja null por si se prueba contra un entorno sin migrar).
	const { data: settings } = await locals.supabase
		.from('app_settings')
		.select('id, app_name, logo_url, favicon_url, active_theme_id')
		.eq('id', 1)
		.maybeSingle();

	// Presets primero, luego clones alfabéticos.
	const { data: themes } = await locals.supabase
		.from('app_themes')
		.select('id, slug, name, tokens_light, tokens_dark, is_preset')
		.order('is_preset', { ascending: false })
		.order('name');

	// Snapshot de tasas: TTL + locks protegen la cuota (solo este load tiene
	// allowFetch; el storefront llama con allowFetch: false).
	const fx = await getFreshRates(locals.supabase, { allowFetch: true });

	// Histórico del proveedor activo para el modal de gráficas (solo lectura;
	// si no hay proveedor activo, serie vacía).
	const history = fx.activeProviderId
		? await getRateHistory(locals.supabase, fx.activeProviderId)
		: [];

	return { settings: settings ?? null, themes: themes ?? [], fx, history };
};

export const actions: Actions = {
	/** Sincroniza las tasas del proveedor primario (cooldown de 60 s). */
	syncFx: async ({ locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { syncFx: { errorKey: 'no_session' } });
		}

		const snapshot = await getFreshRates(locals.supabase, { force: true, allowFetch: true });
		if (snapshot.errorKey) {
			return fail(502, { syncFx: { errorKey: snapshot.errorKey } });
		}

		return { syncFx: { ok: true } };
	},

	/** Activa/desactiva un proveedor (el primario no puede quedarse solo). */
	toggleFxProvider: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { toggleFxProvider: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const providerId = String(form.get('providerId') ?? '');
		const enabled = form.get('enabled') === 'on';

		const { data: provider } = await locals.supabase
			.from('fx_providers')
			.select('id, enabled, is_primary')
			.eq('id', providerId)
			.maybeSingle();

		if (!provider) {
			return fail(404, { toggleFxProvider: { errorKey: 'fx_provider_not_found' } });
		}
		if (provider.enabled === enabled) {
			return { toggleFxProvider: { ok: true } };
		}

		// Al desactivar el primario debe quedar otro proveedor activo.
		if (provider.is_primary && !enabled) {
			const { count: othersEnabled } = await locals.supabase
				.from('fx_providers')
				.select('id', { count: 'exact', head: true })
				.neq('id', providerId)
				.eq('enabled', true);

			if (!othersEnabled) {
				return fail(400, { toggleFxProvider: { errorKey: 'fx_no_provider' } });
			}
		}

		const { error } = await locals.supabase
			.from('fx_providers')
			.update({ enabled })
			.eq('id', providerId);

		if (error) {
			return fail(500, { toggleFxProvider: { errorKey: 'fx_save' } });
		}

		return { toggleFxProvider: { ok: true } };
	},

	/** Marca el proveedor indicado como primario (failover por priority). */
	setPrimaryFxProvider: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { setPrimaryFxProvider: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const providerId = String(form.get('providerId') ?? '');

		const { data: provider } = await locals.supabase
			.from('fx_providers')
			.select('id, is_primary')
			.eq('id', providerId)
			.maybeSingle();

		if (!provider) {
			return fail(404, { setPrimaryFxProvider: { errorKey: 'fx_provider_not_found' } });
		}
		if (provider.is_primary) {
			return { setPrimaryFxProvider: { ok: true } };
		}

		// Dos updates: quitar el primario actual y poner el nuevo. Si el
		// segundo falla se restaura el primero (el unique parcial admite 0
		// primarios momentáneos, pero no dos).
		const { data: current } = await locals.supabase
			.from('fx_providers')
			.select('id')
			.eq('is_primary', true)
			.maybeSingle();

		if (current) {
			const { error } = await locals.supabase
				.from('fx_providers')
				.update({ is_primary: false })
				.eq('id', current.id);
			if (error) {
				return fail(500, { setPrimaryFxProvider: { errorKey: 'fx_save' } });
			}
		}

		const { error } = await locals.supabase
			.from('fx_providers')
			.update({ is_primary: true })
			.eq('id', providerId);

		if (error) {
			// Restaurar: el primario anterior queda como estaba.
			if (current) {
				await locals.supabase
					.from('fx_providers')
					.update({ is_primary: true })
					.eq('id', current.id);
			}
			return fail(500, { setPrimaryFxProvider: { errorKey: 'fx_save' } });
		}

		return { setPrimaryFxProvider: { ok: true } };
	},

	/**
	 * Guarda (o reemplaza) la API key de un proveedor en fx_provider_keys
	 * (RLS staff-only). El valor nunca se devuelve al cliente: la UI solo
	 * ve el badge "Sin API key" del snapshot.
	 */
	setApiKeyFxProvider: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { setApiKeyFxProvider: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const providerId = String(form.get('providerId') ?? '');
		const apiKey = String(form.get('apiKey') ?? '').trim();

		if (apiKey.length < 8 || apiKey.length > 256) {
			return fail(400, { setApiKeyFxProvider: { errorKey: 'fx_key_invalid' } });
		}

		const { data: provider } = await locals.supabase
			.from('fx_providers')
			.select('id')
			.eq('id', providerId)
			.maybeSingle();

		if (!provider) {
			return fail(404, { setApiKeyFxProvider: { errorKey: 'fx_provider_not_found' } });
		}

		const { error } = await locals.supabase
			.from('fx_provider_keys')
			.upsert({ provider_id: providerId, api_key: apiKey }, { onConflict: 'provider_id' });

		if (error) {
			return fail(500, { setApiKeyFxProvider: { errorKey: 'fx_save' } });
		}

		return { setApiKeyFxProvider: { ok: true } };
	},

	/** Guarda el nombre de la app (null = volver al valor del entorno). */
	saveBrand: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { saveBrand: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const name = String(form.get('app_name') ?? '').trim();

		if (name.length > 60) {
			return fail(400, { saveBrand: { errorKey: 'name_too_long' } });
		}

		const { error } = await locals.supabase
			.from('app_settings')
			.update({ app_name: name || null })
			.eq('id', 1);

		if (error) {
			return fail(500, { saveBrand: { errorKey: 'save_name' } });
		}

		return { saveBrand: { ok: true } };
	},

	/** Guarda tokens_light y tokens_dark del tema (JSON validado + completado). */
	saveTokens: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { saveTokens: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const themeId = String(form.get('themeId') ?? '');

		const parse = (raw: string): unknown => {
			try {
				return JSON.parse(raw);
			} catch {
				return null;
			}
		};
		const light = parse(String(form.get('tokens_light') ?? ''));
		const dark = parse(String(form.get('tokens_dark') ?? ''));

		// Misma regla que el CHECK de la tabla, pero con error de formulario
		// limpio en vez de una excepción 500 del constraint.
		if (!validateTokens(light) || !validateTokens(dark)) {
			return fail(400, { saveTokens: { errorKey: 'tokens_invalid' } });
		}

		const { error } = await locals.supabase
			.from('app_themes')
			.update({
				tokens_light: completeTokens(light, false),
				tokens_dark: completeTokens(dark, true)
			})
			.eq('id', themeId);

		if (error) {
			return fail(500, { saveTokens: { errorKey: 'save_theme' } });
		}

		return { saveTokens: { ok: true } };
	},

	/** Clona el tema indicado (los presets originales quedan intactos). */
	duplicateTheme: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { duplicateTheme: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const themeId = String(form.get('themeId') ?? '');

		const { data: source } = await locals.supabase
			.from('app_themes')
			.select('slug, name, tokens_light, tokens_dark')
			.eq('id', themeId)
			.single();

		if (!source) {
			return fail(404, { duplicateTheme: { errorKey: 'source_theme' } });
		}

		// Slug único con sufijo anti-colisión: -copy, -copy-2, -copy-3...
		const { data: slugs } = await locals.supabase
			.from('app_themes')
			.select('slug')
			.like('slug', `${source.slug}-copy%`);
		const taken = new Set((slugs ?? []).map((row) => row.slug));
		let number = 0;
		let slug: string;
		do {
			number += 1;
			slug = `${source.slug}-copy${number > 1 ? `-${number}` : ''}`;
		} while (taken.has(slug));

		const { data: clone, error } = await locals.supabase
			.from('app_themes')
			.insert({
				slug,
				name: `${source.name} (copy)`.slice(0, 60),
				tokens_light: source.tokens_light,
				tokens_dark: source.tokens_dark,
				is_preset: false
			})
			.select('id')
			.single();

		if (error || !clone) {
			return fail(500, { duplicateTheme: { errorKey: 'duplicate_theme' } });
		}

		return { duplicateTheme: { ok: true, newId: clone.id } };
	},

	/** Activa el tema indicado: la paleta cambia en vivo (invalidateAll). */
	activateTheme: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { activateTheme: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const themeId = String(form.get('themeId') ?? '');

		const { error } = await locals.supabase
			.from('app_settings')
			.update({ active_theme_id: themeId })
			.eq('id', 1);

		if (error) {
			return fail(500, { activateTheme: { errorKey: 'activate_theme' } });
		}

		return { activateTheme: { ok: true } };
	},

	/** Quita logo o favicon (url = null: la app vuelve a su default). */
	removeFile: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { removeFile: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const field = String(form.get('field') ?? '');
		if (field !== 'logo' && field !== 'favicon') {
			return fail(400, { removeFile: { errorKey: 'invalid_field' } });
		}

		const { error } = await locals.supabase
			.from('app_settings')
			.update(field === 'logo' ? { logo_url: null } : { favicon_url: null })
			.eq('id', 1);

		if (error) {
			return fail(500, { removeFile: { errorKey: 'remove_file' } });
		}

		return { removeFile: { ok: true } };
	},

	/** Sube logo o favicon al bucket media y guarda su URL pública. */
	uploadFile: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { uploadFile: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const field = String(form.get('field') ?? '');
		const file = form.get('file');

		if (field !== 'logo' && field !== 'favicon') {
			return fail(400, { uploadFile: { errorKey: 'invalid_field' } });
		}
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { uploadFile: { errorKey: 'select_file' } });
		}

		// Whitelist de imágenes + 2 MB: el bucket media es público, se acota.
		const allowed: Record<string, string> = {
			'image/png': 'png',
			'image/jpeg': 'jpg',
			'image/webp': 'webp',
			'image/svg+xml': 'svg'
		};
		const ext = allowed[file.type];
		if (!ext) {
			return fail(400, { uploadFile: { errorKey: 'format' } });
		}
		if (file.size > 2 * 1024 * 1024) {
			return fail(400, { uploadFile: { errorKey: 'size' } });
		}

		// Ruta con timestamp: al reemplazar el logo/favicon la URL cambia y el
		// navegador no sirve el viejo desde su caché.
		const path = `settings/${field}-${Date.now()}.${ext}`;
		const { error: uploadError } = await locals.supabase.storage
			.from('media')
			.upload(path, file, { contentType: file.type });

		if (uploadError) {
			return fail(500, { uploadFile: { errorKey: 'upload_file' } });
		}

		const { data: publicUrl } = locals.supabase.storage.from('media').getPublicUrl(path);
		const url = publicUrl.publicUrl;

		// Registro en la tabla media (catálogo del bucket) y referencia en settings.
		await locals.supabase
			.from('media')
			.insert({ url, kind: 'image', mime_type: file.type, status: 'ready' });
		const { error: updateError } = await locals.supabase
			.from('app_settings')
			.update(field === 'logo' ? { logo_url: url } : { favicon_url: url })
			.eq('id', 1);

		if (updateError) {
			return fail(500, { uploadFile: { errorKey: 'assign_file' } });
		}

		return { uploadFile: { ok: true } };
	},

	/** Restablece ambos modos del tema a los defaults de fábrica (19 + 19). */
	resetTokens: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { resetTokens: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const themeId = String(form.get('themeId') ?? '');

		const { error } = await locals.supabase
			.from('app_themes')
			.update({ tokens_light: APP_TOKEN_DEFAULTS, tokens_dark: APP_TOKEN_DARK_DEFAULTS })
			.eq('id', themeId);

		if (error) {
			return fail(500, { resetTokens: { errorKey: 'reset' } });
		}

		return { resetTokens: { ok: true } };
	},

	/** Elimina un tema (los presets NO se pueden borrar, ni el activo). */
	deleteTheme: async ({ request, locals }) => {
		if (!locals.supabase || !(await locals.safeGetSession())) {
			return fail(401, { deleteTheme: { errorKey: 'no_session' } });
		}

		const form = await request.formData();
		const themeId = String(form.get('themeId') ?? '');

		const { data: theme } = await locals.supabase
			.from('app_themes')
			.select('is_preset')
			.eq('id', themeId)
			.maybeSingle();

		if (!theme) {
			return fail(404, { deleteTheme: { errorKey: 'source_theme' } });
		}
		if (theme.is_preset) {
			return fail(400, { deleteTheme: { errorKey: 'delete_preset' } });
		}

		// El tema activo no se elimina: activar otro primero (el cliente ni
		// muestra el botón, pero el server es la barrera real).
		const { data: settings } = await locals.supabase
			.from('app_settings')
			.select('active_theme_id')
			.eq('id', 1)
			.maybeSingle();
		if (settings?.active_theme_id === themeId) {
			return fail(400, { deleteTheme: { errorKey: 'theme_active' } });
		}

		const { error } = await locals.supabase.from('app_themes').delete().eq('id', themeId);

		if (error) {
			return fail(500, { deleteTheme: { errorKey: 'delete_theme' } });
		}

		return { deleteTheme: { ok: true } };
	}
};
