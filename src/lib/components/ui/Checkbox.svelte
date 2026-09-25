<script lang="ts">
	/**
	 * Checkbox con label al lado, espejo de TextField. Desviación consciente:
	 * el bindable es `checked`, no `value` — en el input nativo `value` es el
	 * payload del submit, no el estado, y el contrato de actions manda
	 * FormData a mano. `cursor-pointer` y `accent-(--app-primary)` explícitos.
	 */
	let {
		id,
		label,
		checked = $bindable(false),
		help,
		disabled = false,
		class: cls = ''
	}: {
		id: string;
		label: string;
		checked?: boolean;
		help?: string;
		disabled?: boolean;
		class?: string;
	} = $props();
</script>

<div class={cls}>
	<div class="flex items-center gap-2">
		<input
			{id}
			type="checkbox"
			{disabled}
			bind:checked
			class="cursor-pointer accent-(--app-primary)"
		/>
		<label for={id} class="text-[13px] font-medium text-(--app-text)">{label}</label>
	</div>
	{#if help}
		<p class="mt-1 text-[12px] text-(--app-text-muted)">{help}</p>
	{/if}
</div>
