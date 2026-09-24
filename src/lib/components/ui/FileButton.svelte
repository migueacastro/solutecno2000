<script lang="ts">
	/**
	 * Label-boton para subir archivos con input oculto. Al elegir un archivo
	 * llama a `onFile(file)` y resetea `input.value = ''` para permitir volver
	 * a subir el mismo archivo. Estado `busy` deshabilita el label y muestra
	 * `busyLabel` (p. ej. "Subiendo…").
	 */
	let {
		label,
		busy = false,
		busyLabel,
		accept,
		onFile,
		disabled = false,
		class: cls = ''
	}: {
		label: string;
		busy?: boolean;
		busyLabel?: string;
		accept?: string;
		onFile: (file: File) => void;
		disabled?: boolean;
		class?: string;
	} = $props();

	function handleChange(e: Event): void {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		// Resetea siempre para que re-seleccionar el mismo archivo dispare change.
		input.value = '';
		if (file) onFile(file);
	}
</script>

<label
	class="inline-flex cursor-pointer items-center rounded bg-(--app-active-bg) px-3 py-1.5 text-[13px] font-semibold text-(--app-text) transition-opacity hover:opacity-80 {disabled ||
	busy
		? 'cursor-default opacity-60 hover:opacity-60'
		: ''} {cls}"
>
	{busy ? (busyLabel ?? label) : label}
	<input type="file" {accept} class="hidden" disabled={disabled || busy} onchange={handleChange} />
</label>
