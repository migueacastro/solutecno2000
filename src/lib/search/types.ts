/**
 * Tipos compartidos del sistema de búsqueda (ver plan: SearchBar por etapas).
 * El SearchBar es agnóstico del origen: cada SearchSource decide si busca en
 * un JSON local preindexado o hace una query a Supabase (RPC pg_trgm).
 */

/** Grupos de resultados; cada uno tiene su clave i18n search_group_*. */
export type SearchGroup = 'navigation' | 'settings' | 'products';

/**
 * Ítem de búsqueda ya listo para renderizar. label viene TRADUCIDO: los
 * items se construyen en funciones llamadas durante el render (nunca a
 * module-level, el locale del server congelaría el idioma).
 */
export type SearchItem = {
	/** Estable, ej: 'settings:app-name', 'product:<uuid>'. */
	id: string;
	label: string;
	group: SearchGroup;
	/** Texto extra indexable (ej: 'sku brand marca'). */
	keywords?: string;
	/** Destino de navegación (si falta y hay onSelect, decide el consumidor). */
	href?: string;
	/** Id DOM para el jump de settings (expandir card + scroll + focus). */
	targetId?: string;
};

/**
 * Fuente de búsqueda. La interfaz es async unificada: las fuentes locales
 * envuelven su resultado síncrono en Promise.resolve.
 */
export type SearchSource = {
	/** Clave de caché, ej: 'local:admin', 'remote:products'. */
	id: string;
	search(query: string, signal: AbortSignal): Promise<SearchItem[]>;
};
