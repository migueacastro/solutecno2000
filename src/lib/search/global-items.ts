import { m } from '$lib/paraglide/messages.js';
import { settingsSearchItems } from './settings-items';
import type { SearchItem } from './types';

/**
 * Items de búsqueda global para la topbar del admin: navegación (rutas del
 * panel, mismas del Sidebar) + ajustes (reusa settingsSearchItems, así la
 * topbar también puede saltar a un ajuste concreto via onSelect).
 *
 * FUNCIÓN, no const module-level: los labels se resuelven con m.*() en el
 * momento de la llamada; a module-level el locale del server congelaría el
 * idioma (paraglide v2 es reactivo por request).
 */
export function adminNavSearchItems(): SearchItem[] {
	const nav: SearchItem[] = [
		{ id: 'nav:home', label: m.admin_nav_home(), group: 'navigation', href: '/admin' },
		{
			id: 'nav:products',
			label: m.admin_nav_products(),
			group: 'navigation',
			href: '/admin/products'
		},
		{
			id: 'nav:collections',
			label: m.admin_nav_collections(),
			group: 'navigation',
			href: '/admin/collections'
		},
		{
			id: 'nav:inquiries',
			label: m.admin_nav_inquiries(),
			group: 'navigation',
			href: '/admin/inquiries'
		},
		{
			id: 'nav:customers',
			label: m.admin_nav_customers(),
			group: 'navigation',
			href: '/admin/customers'
		},
		{
			id: 'nav:settings',
			label: m.admin_nav_settings(),
			group: 'navigation',
			href: '/admin/settings'
		}
	];
	return [...nav, ...settingsSearchItems()];
}
