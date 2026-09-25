/**
 * Slug para URLs: minúsculas, ASCII, guiones. `slug_conflict` (23505) lo
 * detecta el server; aquí solo se genera.
 */

/** Normaliza un nombre a slug (`Zapatilla Running X` → `zapatilla-running-x`). */
export function slugify(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '') // quita diacríticos
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Valida el formato que acepta la columna unique de la DB. */
export function isSlugValid(slug: string): boolean {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
