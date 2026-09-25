<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	/**
	 * Superficie de card estilo Polaris. El padding y el ancho los aporta el
	 * caller vía `class` (p-5, p-8 text-center max-w-sm, ...). Radius y sombra
	 * van inline porque son los mismos valores del diseño en todos los casos.
	 *
	 * Con `title` se pinta un header (h2 + p opcional). Si además es
	 * `expandable`, el header es un botón que pliega/despliega el body
	 * (chevron rotante) y `expanded` es bindable; sin bind, la card abre
	 * abierta y el caller la controla por su cuenta.
	 */
	let {
		class: cls = '',
		children,
		id,
		title,
		subtitle,
		expandable = false,
		expanded = $bindable(true),
		...rest
	}: {
		class?: string;
		children: Snippet;
		/** Id de la card (los callers lo usan como targetId de la búsqueda). */
		id?: string;
		title?: string;
		subtitle?: string;
		expandable?: boolean;
		expanded?: boolean;
	} = $props();

	// Id auto-generado del body: el header expandible lo referencia con
	// aria-controls (sin Math.random: SSR-safe).
	const bodyId = $props.id();
</script>

<div
	{id}
	class="bg-(--app-surface) {cls}"
	style="border-radius: 8px; box-shadow: 0 1px 0 rgba(26, 26, 26, 0.07);"
	{...rest}
>
	{#if title}
		{#if expandable}
			<button
				type="button"
				class="flex w-full cursor-pointer items-start justify-between gap-3 text-left"
				aria-expanded={expanded}
				aria-controls={bodyId}
				onclick={() => (expanded = !expanded)}
			>
				<span class="min-w-0">
					<h2 class="text-[16px] font-semibold text-(--app-text)">{title}</h2>
					{#if subtitle}
						<p class="mt-1 text-[13px] text-(--app-text-muted)">{subtitle}</p>
					{/if}
				</span>
				<Icon
					paths="<path d='m6 9 6 6 6-9' />"
					size={16}
					class="mt-1 text-(--app-text-muted) transition-transform {expanded ? 'rotate-180' : ''}"
				/>
			</button>
		{:else}
			<div>
				<h2 class="text-[16px] font-semibold text-(--app-text)">{title}</h2>
				{#if subtitle}
					<p class="mt-1 text-[13px] text-(--app-text-muted)">{subtitle}</p>
				{/if}
			</div>
		{/if}
	{/if}

	<!-- El id del body lo referencia aria-controls del header expandible. -->
	{#if !expandable || expanded}
		<div id={bodyId}>
			{@render children()}
		</div>
	{/if}
</div>
