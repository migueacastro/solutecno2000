/**
 * Store de toasts con runes, exportado como singleton.
 * Sigue la disciplina de Polaris: los toasts son duraderos (mínimo 10 s)
 * para que el usuario pueda leerlos y actuar sobre su acción.
 */
export type ToastTone = 'success' | 'info' | 'critical';
export type ToastAction = { label: string; onClick: () => void };
export type Toast = { id: number; tone: ToastTone; message: string; action?: ToastAction };

const AUTO_DISMISS_MS = 10_000;

class ToastStore {
	#id = 0;
	#items = $state<Toast[]>([]);

	get list(): readonly Toast[] {
		return this.#items;
	}

	/**
	 * Añade un toast y programa su auto-dismiss. Devuelve el id por si
	 * el llamador quiere descartarlo antes (ej: al confirmar la acción).
	 */
	push(tone: ToastTone, message: string, action?: ToastAction): number {
		const id = ++this.#id;
		this.#items = [...this.#items, { id, tone, message, action }];
		setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
		return id;
	}

	dismiss(id: number): void {
		this.#items = this.#items.filter((toast) => toast.id !== id);
	}
}

export const toasts = new ToastStore();
