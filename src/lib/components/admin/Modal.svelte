<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { m } from '$lib/paraglide/messages.js';
	import type { Snippet } from 'svelte';

	/**
	 * Modal base estilo Polaris: overlay + panel centrado con transiciones,
	 * Esc y click en overlay (respetan busy). El body y el footer van por
	 * slots; los modales de la app (ConfirmModal, ApiKeyModal, histórico FX)
	 * montan sobre este para compartir look y comportamiento.
	 * El panel mantiene su propia sombra inline: es la única card flotante.
	 */
	let {
		open,
		title,
		busy = false,
		size = 'sm',
		role = 'dialog',
		onClose,
		children,
		footer
	}: {
		open: boolean;
		title: string;
		/** true mientras hay una acción en curso: bloquea Esc/overlay. */
		busy?: boolean;
		/** sm (confirm/forms) | lg (contenido ancho, ej. charts). */
		size?: 'sm' | 'lg';
		/** alertdialog para confirmaciones; dialog para forms/contenido. */
		role?: 'dialog' | 'alertdialog';
		onClose: () => void;
		children?: Snippet;
		footer?: Snippet;
	} = $props();

	// Esc cierra salvo que haya una acción en curso.
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && !busy) onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		transition:fade={{ duration: 120 }}
		class="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
		role="presentation"
	>
		<!-- Overlay clickeable solo con click directo (no burbujea del panel). -->
		<button
			type="button"
			class="absolute inset-0 cursor-default"
			aria-label={m.admin_modal_close()}
			onclick={() => !busy && onClose()}
		></button>
		<div
			transition:scale={{ duration: 120, start: 0.96 }}
			class="relative w-full {size === 'lg' ? 'max-w-2xl' : 'max-w-sm'} bg-(--app-surface) p-6"
			style="border-radius: 8px; box-shadow: 0 8px 20px -4px rgba(26, 26, 26, 0.3);"
			{role}
			aria-modal="true"
			aria-label={title}
		>
			<h2 class="text-[16px] font-semibold text-(--app-text)">{title}</h2>
			{@render children?.()}
			{#if footer}
				{@render footer()}
			{/if}
		</div>
	</div>
{/if}
