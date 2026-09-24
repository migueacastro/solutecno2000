<script lang="ts">
	import { fade } from 'svelte/transition';
	import { toasts, type ToastTone } from '$lib/stores/toast.svelte';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * Stack de toasts estilo Polaris: fijo abajo-derecha, máximo tres visibles
	 * (las últimas tres), superficie tintada según el tono.
	 */

	// Superficies semánticas de Polaris (§5.1 del doc de patrones).
	const backgrounds: Record<ToastTone, string> = {
		success: 'var(--app-tone-success-bg)',
		info: 'var(--app-tone-info-bg)',
		critical: 'var(--app-tone-critical-bg)'
	};

	// Solo las últimas tres son visibles; las previas quedan apiladas fuera.
	const visible = $derived(toasts.list.slice(-3));
</script>

{#if visible.length > 0}
	<div class="fixed right-4 bottom-4 z-50 flex flex-col gap-2" aria-live="polite">
		{#each visible as toast (toast.id)}
			<div
				transition:fade={{ duration: 150 }}
				class="flex w-80 max-w-[calc(100vw-2rem)] items-center gap-3 px-4 py-3"
				style="background: {backgrounds[
					toast.tone
				]}; color: var(--app-text); border-radius: 4px; box-shadow: 0 4px 6px -2px rgba(26, 26, 26, 0.2);"
			>
				<p class="flex-1 text-[13px] leading-5">{toast.message}</p>
				{#if toast.action}
					<button
						type="button"
						class="shrink-0 cursor-pointer text-[13px] font-semibold underline underline-offset-2 hover:opacity-80"
						onclick={() => {
							toast.action?.onClick();
							toasts.dismiss(toast.id);
						}}
					>
						{toast.action.label}
					</button>
				{/if}
				<button
					type="button"
					class="-mr-1 shrink-0 cursor-pointer p-1 leading-none hover:opacity-70"
					aria-label={m.admin_toast_dismiss()}
					onclick={() => toasts.dismiss(toast.id)}
				>
					×
				</button>
			</div>
		{/each}
	</div>
{/if}
