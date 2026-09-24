import { APP_NAME } from './app';

/**
 * Config de tema: defaults de la paleta + helpers para inyectarlos en runtime.
 *
 * APP_TOKEN_DEFAULTS (claro) y APP_TOKEN_DARK_DEFAULTS (oscuro) DEBEN espejar
 * los bloques :root / :root[data-mode='dark'] de
 * src/lib/styles/admin-theme.css (y ese archivo anota lo mismo al revés).
 * La DB guarda sets completos por modo (CHECK de 19 claves), pero el cliente
 * acepta borradores parciales: los tokens que faltan caen a estos defaults,
 * y buildThemeCss emite los 19 de cada modo para que el orden de cascada
 * entre el <style> inline y el CSS importado sea irrelevante.
 */
export const APP_TOKEN_DEFAULTS = {
	primary: '#005bd3',
	'primary-contrast': '#ffffff',
	bg: '#f1f1f1',
	surface: '#ffffff',
	'nav-bg': '#ebebeb',
	'active-bg': '#e3e3e3',
	border: '#d5d5d5',
	text: '#303030',
	'text-muted': '#616161',
	'tone-info-bg': '#eaf4ff',
	'tone-info-text': '#003a5a',
	'tone-success-bg': '#cdfed4',
	'tone-success-text': '#014b40',
	'tone-caution-bg': '#fff8db',
	'tone-caution-text': '#4f4700',
	'tone-warning-bg': '#fff1e3',
	'tone-warning-text': '#5e4200',
	'tone-critical-bg': '#fee8eb',
	'tone-critical-text': '#8e0b21'
} as const;

/** Defaults de modo oscuro (ex preset 'polaris-noche', migración 00700). */
export const APP_TOKEN_DARK_DEFAULTS = {
	primary: '#1f7aec',
	'primary-contrast': '#ffffff',
	bg: '#1a1a1a',
	surface: '#262626',
	'nav-bg': '#202020',
	'active-bg': '#303030',
	border: '#3d3d3d',
	text: '#e3e3e3',
	'text-muted': '#a8a8a8',
	'tone-info-bg': '#10273d',
	'tone-info-text': '#7cc7ff',
	'tone-success-bg': '#0c3327',
	'tone-success-text': '#6ff2a9',
	'tone-caution-bg': '#332d0c',
	'tone-caution-text': '#ffe066',
	'tone-warning-bg': '#33220c',
	'tone-warning-text': '#ffb267',
	'tone-critical-bg': '#33101a',
	'tone-critical-text': '#ff7a92'
} as const;

export type AppTokenKey = keyof typeof APP_TOKEN_DEFAULTS;
export type AppThemeTokens = Partial<Record<AppTokenKey, string>>;

/** Claves válidas de token (la misma lista cerrada que el CHECK de app_themes). */
export const APP_TOKEN_KEYS = Object.keys(APP_TOKEN_DEFAULTS) as AppTokenKey[];

/** Valida un objeto de tokens de DB/usuario: claves conocidas + formato hex. */
export function validateTokens(input: unknown): input is AppThemeTokens {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		return false;
	}
	return Object.entries(input).every(
		([key, value]) =>
			key in APP_TOKEN_DEFAULTS && typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value)
	);
}

/**
 * Completa un borrador (posiblemente parcial) con los defaults del modo y
 * reordena las claves según APP_TOKEN_KEYS: la forma canónica que satisface
 * el CHECK estricto de app_themes y permite comparar sin ruido de orden.
 */
export function completeTokens(
	tokens: AppThemeTokens | null | undefined,
	dark: boolean
): AppThemeTokens {
	const defaults = dark ? APP_TOKEN_DARK_DEFAULTS : APP_TOKEN_DEFAULTS;
	const result = {} as AppThemeTokens;
	for (const key of APP_TOKEN_KEYS) {
		result[key] = tokens?.[key] ?? defaults[key];
	}
	return result;
}

/**
 * Dos bloques completos: :root (claro) + :root[data-mode='dark']. El modo
 * se conmuta con un atributo en <html> (store theme), no regenerando el CSS.
 * Se inyecta en <svelte:head> del layout raíz: Svelte escapa el string, no
 * hace falta {@html}.
 */
export function buildThemeCss(light?: AppThemeTokens | null, dark?: AppThemeTokens | null): string {
	const block = (tokens: AppThemeTokens | null | undefined, dark: boolean) =>
		APP_TOKEN_KEYS.map(
			(key) =>
				`\t--app-${key}: ${tokens?.[key] ?? (dark ? APP_TOKEN_DARK_DEFAULTS : APP_TOKEN_DEFAULTS)[key]};`
		).join('\n');
	return `:root {\n${block(light, false)}\n}\n:root[data-mode='dark'] {\n${block(dark, true)}\n}`;
}

/** Precedencia del nombre: DB > env/fallback (APP_NAME ya resuelve ambos). */
export function resolveAppName(dbName?: string | null): string {
	if (dbName && dbName.trim()) return dbName.trim();
	return APP_NAME;
}
