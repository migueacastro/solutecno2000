<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Modal from './Modal.svelte';

	/**
	 * Modal para guardar la API key de un proveedor FX, montado sobre Modal
	 * base. El draft vive AQUÍ y nace '' al abrir: si el padre lo pasara como
	 * bind, el primer render recibiría undefined y el bind:value de TextField
	 * revienta (props_invalid_value). onSave devuelve false para dejar el
	 * modal abierto (error persistible); el valor nunca vuelve del server.
	 */
	let {
		open,
		providerName,
		busy = false,
		onSave,
		onCancel
	}: {
		open: boolean;
		providerName: string;
		busy?: boolean;
		onSave: (apiKey: string) => Promise<boolean>;
		onCancel: () => void;
	} = $props();

	let draft = $state('');

	// Cada apertura arranca con el campo vacío.
	$effect(() => {
		if (open) draft = '';
	});

	async function submit(): Promise<void> {
		if (await onSave(draft.trim())) draft = '';
	}

	function handleSubmit(event: SubmitEvent): void {
		event.preventDefault();
		void submit();
	}
</script>

<Modal {open} title={m.admin_fx_key_modal_title({ name: providerName })} {busy} onClose={onCancel}>
	<form class="mt-4" onsubmit={handleSubmit}>
		<TextField
			id="fx-key-modal"
			label={m.admin_fx_key_label()}
			type="password"
			bind:value={draft}
			help={m.admin_fx_key_modal_help()}
			disabled={busy}
		/>
		<div class="mt-6 flex justify-end gap-2">
			<Button variant="secondary" size="md" onclick={onCancel} disabled={busy}>
				{m.admin_modal_cancel()}
			</Button>
			<Button variant="primary" size="md" type="submit" disabled={busy || !draft.trim()}>
				{busy ? m.admin_fx_key_saving() : m.admin_fx_key_save()}
			</Button>
		</div>
	</form>
</Modal>
