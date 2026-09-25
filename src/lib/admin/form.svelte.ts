/**
 * Drafts de formulario estilo settings: copia inmutable del estado guardado
 * + copia editable. `dirty` compara por JSON (solo fiable con shape fijo —
 * el mapeo DB→draft debe llenar todas las claves con `?? ''`).
 */
import { untrack } from 'svelte';

export type Draft<T extends object> = {
	/** Copia editable (proxy $state profundo: mutar `draft.x` reactiva). */
	readonly draft: T;
	readonly dirty: boolean;
	/** Marca el draft actual como estado guardado (tras un guardado exitoso dirty vuelve a false sin recrear el draft). */
	save(): void;
	reset(): void;
};

/** Crea el estado del formulario: draft editable + copia guardada + dirty/reset. */
export function createDraft<T extends object>(initial: () => T): Draft<T> {
	// untrack + snapshot: la copia guardada se toma una sola vez, con el
	// valor inicial, y queda congelada (sin proxies de $state).
	let saved = $state.snapshot(untrack(initial)) as T;

	let draft = $state(structuredClone(saved));

	return {
		get draft() {
			return draft;
		},
		get dirty() {
			return JSON.stringify(draft) !== JSON.stringify(saved);
		},
		save(): void {
			saved = $state.snapshot(draft) as T;
		},
		reset(): void {
			draft = structuredClone(saved);
		}
	};
}
