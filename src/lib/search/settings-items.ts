import { m } from '$lib/paraglide/messages.js';
import type { SearchItem } from './types';

/**
 * Items de búsqueda de ajustes para el SearchBar de /admin/settings (y para
 * la búsqueda global de la topbar). targetId apunta al id DOM del campo; el
 * consumidor expande la card, hace scroll y pone foco.
 *
 * FUNCIÓN, no const module-level: los labels se resuelven con m.*() en el
 * momento de la llamada; a module-level el locale del server congelaría el
 * idioma (paraglide v2 es reactivo por request).
 *
 * keywords bilingües en un solo string: el admin no indexa por idioma y así
 * la búsqueda funciona igual en es y en.
 */
export function settingsSearchItems(): SearchItem[] {
	return [
		{
			id: 'settings:app-name',
			label: m.admin_settings_name_label(),
			group: 'settings',
			keywords: 'brand nombre app name',
			href: '/admin/settings',
			targetId: 'app-name'
		},
		{
			id: 'settings:logo',
			label: m.admin_settings_logo(),
			group: 'settings',
			keywords: 'logo imagen image upload subir',
			href: '/admin/settings',
			targetId: 'logo'
		},
		{
			id: 'settings:favicon',
			label: m.admin_settings_favicon(),
			group: 'settings',
			keywords: 'favicon icono icon image imagen',
			href: '/admin/settings',
			targetId: 'favicon'
		},
		{
			id: 'settings:tokens-light',
			label: m.admin_settings_mode_light(),
			group: 'settings',
			keywords: 'tokens json claro light colors colores paleta',
			href: '/admin/settings',
			targetId: 'tokens-light'
		},
		{
			id: 'settings:tokens-dark',
			label: m.admin_settings_mode_dark(),
			group: 'settings',
			keywords: 'tokens json oscuro dark colors colores paleta',
			href: '/admin/settings',
			targetId: 'tokens-dark'
		},
		{
			id: 'settings:card-brand',
			label: m.admin_settings_brand_title(),
			group: 'settings',
			keywords: 'brand marca',
			href: '/admin/settings',
			targetId: 'card-brand'
		},
		{
			id: 'settings:card-theme',
			label: m.admin_settings_theme_title(),
			group: 'settings',
			keywords: 'theme tema presets paleta',
			href: '/admin/settings',
			targetId: 'card-theme'
		}
	];
}
