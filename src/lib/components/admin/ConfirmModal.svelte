<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from './Modal.svelte';

	/**
	 * Modal de confirmación minimal estilo Polaris, montado sobre Modal base
	 * (overlay/transiciones/Esc de allí). Botón de acción con tono
	 * configurable (critical para destructivas). Reutilizable (delete de
	 * productos, restablecer tema, etc.).
	 */
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
	}: {
		open: boolean;
		title: string;
		text: string;
		confirmText?: string;
		cancelText?: string;
		critical?: boolean;
		busy?: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();
</script>

<Modal {open} {title} {busy} role="alertdialog" onClose={onCancel}>
	<p class="mt-2 text-[13px] leading-5 text-(--app-text-muted)">{text}</p>
	{#snippet footer()}
		<div class="mt-6 flex justify-end gap-2">
			<Button size="md" variant="secondary" class="text-[13px]" onclick={onCancel} disabled={busy}>
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
	{/snippet}
</Modal>
