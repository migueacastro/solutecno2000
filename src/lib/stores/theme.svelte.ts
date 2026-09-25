/**
 * Store del modo de tema (claro/oscuro) con runes, exportado como singleton.
 * Es una preferencia del VISITANTE: vive en la cookie 'theme-mode' y no toca
 * la DB. Los tokens de cada modo salen del tema activo (tokens_light /
 * tokens_dark) y ya viajan en el CSS global: alternar solo cambia el
 * atributo data-mode de <html>, sin regenerar estilos. El load raíz semilla
 * el modo inicial desde la cookie para que el SSR coincida con lo que pintó
 * el script inline de app.html (sin flash).
 */
export type ThemeMode = 'light' | 'dark';

const COOKIE_KEY = 'theme-mode';
const MAX_AGE = 60 * 60 * 24 * 365; // 1 año

class ThemeStore {
	#initialized = false;
	#mode = $state<ThemeMode>('light');

	get mode(): ThemeMode {
		return this.#mode;
	}

	/**
	 * Semilla desde el load raíz (cookie leída en SSR). En el SERVER el
	 * singleton es compartido por todos los requests del proceso: aquí se
	 * re-siembra SIEMPRE (el render es síncrono, sin carrera entre requests).
	 * En el CLIENT solo la primera llamada cuenta: tras montar, el único
	 * dueño del modo es el toggle del usuario.
	 */
	initialize(mode: ThemeMode): void {
		const isClient = typeof window !== 'undefined';
		if (isClient && this.#initialized) return;
		this.#mode = mode;
		this.#apply();
		this.#initialized = true;
	}

	/** Alterna el modo y lo persiste en cookie para que el SSR la lea al recargar. */
	toggle(): void {
		this.#mode = this.#mode === 'dark' ? 'light' : 'dark';
		this.#apply();
		if (typeof document !== 'undefined') {
			document.cookie = `${COOKIE_KEY}=${this.#mode}; max-age=${MAX_AGE}; path=/; samesite=lax`;
		}
	}

	/** El CSS global conmuta por [data-mode] en <html>: aquí se setea. */
	#apply(): void {
		if (typeof document !== 'undefined') {
			document.documentElement.dataset.mode = this.#mode;
		}
	}
}

export const theme = new ThemeStore();
