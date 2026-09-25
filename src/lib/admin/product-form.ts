/**
 * Formulario de producto: shape del draft (fijo, para el dirty por JSON de
 * createDraft), mapeo DB→draft y parseo del FormData que comparten las
 * actions create_product / update_product (el server es la barrera real:
 * el cliente solo anticipa los mismos mensajes).
 */
import type { Database } from '$lib/database.types';
import { isSlugValid, slugify } from '$lib/admin/slug';

/** Enum de la DB para status (el param ya pasó la whitelist al parsear). */
type ProductStatus = Database['public']['Enums']['product_status'];

/** Draft del formulario: shape FIJO (todas las claves llenas con `?? ''`). */
export type ProductDraft = {
	name: string;
	slug: string;
	description: string;
	status: string;
	/** Monto como texto; vacío = sin precio (a consultar). */
	price: string;
	currency: string;
	price_on_request: boolean;
	vendor: string;
	product_type: string;
};

/** Campos que el server escribe en la tabla (price ya validado o null). */
export type ProductValues = {
	name: string;
	slug: string;
	description: string | null;
	status: ProductStatus;
	/** numeric(12,2) en la DB: number (el regex ya validó el formato). */
	price: number | null;
	currency: string;
	price_on_request: boolean;
	vendor: string | null;
	product_type: string | null;
};

/** Subconjunto de la fila products que consume el formulario. */
export type ProductRow = {
	name: string | null;
	slug: string;
	description: string | null;
	status: string;
	price: number | string | null;
	currency: string | null;
	price_on_request: boolean | null;
	vendor: string | null;
	product_type: string | null;
} | null;

/** Mapea la fila DB al draft (numeric llega como number; price vuelve a texto). */
export function toProductDraft(row: ProductRow): ProductDraft {
	return {
		name: row?.name ?? '',
		slug: row?.slug ?? '',
		description: row?.description ?? '',
		status: row?.status ?? 'draft',
		price: row?.price === null || row?.price === undefined ? '' : String(row.price),
		currency: row?.currency ?? 'PEN',
		price_on_request: row?.price_on_request ?? false,
		vendor: row?.vendor ?? '',
		product_type: row?.product_type ?? ''
	};
}

const CURRENCIES = ['PEN', 'USD', 'EUR'];
const STATUSES = ['draft', 'active', 'archived', 'unlisted'];
const PRICE_RE = /^\d+(\.\d{1,2})?$/;

/**
 * Valida y normaliza el FormData de las actions de producto. Devuelve el
 * conjunto de valores listos para insert/update, o la errorKey del primer
 * problema (el cliente la traduce con $lib/i18n/errors.ts).
 */
export function parseProductForm(
	form: FormData
): { ok: true; values: ProductValues } | { ok: false; errorKey: string } {
	const name = String(form.get('name') ?? '').trim();
	const rawSlug = String(form.get('slug') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();
	const status = String(form.get('status') ?? 'draft');
	const rawPrice = String(form.get('price') ?? '').trim();
	const currency = String(form.get('currency') ?? 'PEN')
		.trim()
		.toUpperCase();
	const onRequest = form.get('price_on_request') === 'on';
	const vendor = String(form.get('vendor') ?? '').trim();
	const productType = String(form.get('product_type') ?? '').trim();

	if (!name) return { ok: false, errorKey: 'name_required' };

	// Slug: vacío se autogenera del nombre; si viene, debe ser válido.
	const slug = rawSlug || slugify(name);
	if (!isSlugValid(slug)) return { ok: false, errorKey: 'slug_invalid' };

	// Precio: opcional (null = a consultar), pero si viene debe ser monto válido.
	let price: number | null = null;
	if (!onRequest && rawPrice !== '') {
		if (!PRICE_RE.test(rawPrice)) return { ok: false, errorKey: 'price_invalid' };
		price = Number(rawPrice);
	}

	if (!CURRENCIES.includes(currency)) return { ok: false, errorKey: 'currency_invalid' };
	if (!STATUSES.includes(status)) return { ok: false, errorKey: 'invalid_field' };

	return {
		ok: true,
		values: {
			name,
			slug,
			description: description || null,
			// status ya pasó la whitelist de arriba; el cast al enum es seguro.
			status: status as ProductStatus,
			price,
			currency,
			price_on_request: onRequest,
			vendor: vendor || null,
			product_type: productType || null
		}
	};
}
