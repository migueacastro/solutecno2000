<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/components/ui/Button.svelte';

	/**
	 * Modal de confirmación minimal estilo Polaris: overlay + tarjeta centrada,
	 * botón de acción con tono configurable (critical para destructivas).
	 * Reutilizable (delete de productos, restablecer tema, etc.).
	 * El panel mantiene su propia sombra inline: es la única card flotante.
	 */
	type Props = {
		open: boolean;
		title: string;
		text: string;
		confirmText?: string;
		cancelText?: string;
		critical?: boolean;
		busy?: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	};

	let {
		open,
		title,
		text,
		confirmText = m.admin_modal_confirm(),
		cancelText = m.admin_modal_cancel(),
		critical = false,
		busy = false,
		onConfirm,
		onCancel
	}: Props = $props();

	// Esc: cierra el modal salvo que haya una acción en curso.
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && !busy) onCancel();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		transition:fade={{ duration: 120 }}
		class="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
		role="presentation"
	>
		<!-- El overlay es clickeable solo con click directo (no burbujea del panel). -->
		<button
			type="button"
			class="absolute inset-0 cursor-default"
			aria-label={m.admin_modal_close()}
			onclick={() => !busy && onCancel()}
		></button>
		<div
			transition:scale={{ duration: 120, start: 0.96 }}
			class="relative w-full max-w-sm bg-(--app-surface) p-6"
			style="border-radius: 8px; box-shadow: 0 8px 20px -4px rgba(26, 26, 26, 0.3);"
			role="alertdialog"
			aria-modal="true"
			aria-label={title}
		>
			<h2 class="text-[16px] font-semibold text-(--app-text)">{title}</h2>
			<p class="mt-2 text-[13px] leading-5 text-(--app-text-muted)">{text}</p>
			<div class="mt-6 flex justify-end gap-2">
				<Button
					size="md"
					variant="secondary"
					class="text-[13px]"
					onclick={onCancel}
					disabled={busy}
				>
					{cancelText}
				</Button>
				<Button
					size="md"
					variant={critical ? 'danger' : 'primary'}
					class="text-[13px]"
					onclick={onConfirm}
					disabled={busy}
				>
					{confirmText}
				</Button>
			</div>
		</div>
	</div>
{/if}
