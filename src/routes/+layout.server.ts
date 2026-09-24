import type { LayoutServerLoad } from './$types';
import type { AppThemeTokens } from '$lib/config/theme';

/**
 * Settings de la app (nombre, logo, favicon, tema activo) leídos en CADA
 * request: query por PK (id = 1), sub-milisegundo. Sin caché a propósito —
 * el punto de esta feature es que cambiar el tema en el admin se ve al
 * instante (invalidateAll reejecuta este load), sin rebuild ni redeploy.
 *
 * El tema activo trae tokens_light y tokens_dark: el CSS global viaja con
 * los DOS bloques y el modo (cookie 'theme-mode', escrita por el toggle
 * client-side) solo decide el atributo data-mode de <html>.
 *
 * Defensivo en todos los casos: sin Supabase configurado, fila ausente o
 * error de red -> settings: null (mismo patrón que el hook y el guard del
 * admin); el CSS cae a los defaults de $lib/config/theme.ts.
 */
export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const mode: 'light' | 'dark' = cookies.get('theme-mode') === 'dark' ? 'dark' : 'light';

	if (!locals.supabase) return { settings: null, mode };

	// Select como UN literal: concatenarlo rompe la inferencia de tipos de
	// postgrest-js y data queda tipado como GenericStringError.
	const { data, error } = await locals.supabase
		.from('app_settings')
		.select(
			'app_name, logo_url, favicon_url, theme:app_themes!app_settings_active_theme_id_fkey (slug, name, tokens_light, tokens_dark)'
		)
		.eq('id', 1)
		.maybeSingle();

	if (error) {
		console.error('No se pudo leer app_settings:', error.message);
		return { settings: null, mode };
	}

	if (!data) return { settings: null, mode };

	// tokens_* llega tipado como Json: cast defensivo (el CHECK de la tabla
	// garantiza claves/hex, pero el cliente TS no lo sabe).
	const tokens = (crudo: unknown) =>
		typeof crudo === 'object' && crudo !== null && !Array.isArray(crudo)
			? (crudo as AppThemeTokens)
			: null;

	return {
		settings: {
			appName: data.app_name,
			logoUrl: data.logo_url,
			faviconUrl: data.favicon_url,
			theme: {
				slug: data.theme?.slug ?? null,
				name: data.theme?.name ?? null,
				tokensLight: tokens(data.theme?.tokens_light),
				tokensDark: tokens(data.theme?.tokens_dark)
			}
		},
		mode
	};
};
