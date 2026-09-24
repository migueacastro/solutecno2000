<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/components/ui/Button.svelte';

	/**
	 * SaveBar estilo Polaris: barra fija inferior que aparece solo cuando hay
	 * cambios sin guardar (dirty-tracking del llamador). Botón primario
	 * Guardar y secundario Descartar.
	 *
	 * Pendiente (cuando el detalle de producto lo exija): guard de
	 * beforeNavigate para avisar antes de salir con cambios sin guardar.
	 */
	type Props = {
		dirty: boolean;
		saving?: boolean;
		onSave: () => void;
		onDiscard: () => void;
	};

	let { dirty, saving = false, onSave, onDiscard }: Props = $props();
</script>

{#if dirty}
	<div
		class="fixed inset-x-0 bottom-0 z-[110] border-t border-(--app-border) bg-(--app-surface)"
		style="box-shadow: 0 -4px 6px -2px rgba(26, 26, 26, 0.1);"
		role="status"
	>
		<div class="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 md:px-8">
			<p class="text-[13px] text-(--app-text-muted)">{m.admin_savebar_unsaved()}</p>
			<div class="flex gap-2">
				<Button
					size="md"
					variant="secondary"
					class="text-[13px]"
					onclick={onDiscard}
					disabled={saving}
				>
					{m.admin_savebar_discard()}
				</Button>
				<Button
					size="md"
					variant="primary"
					class="text-[13px]"
					onclick={onSave}
					disabled={saving || !dirty}
				>
					{saving ? m.admin_savebar_saving() : m.admin_savebar_save()}
				</Button>
			</div>
		</div>
	</div>
{/if}
