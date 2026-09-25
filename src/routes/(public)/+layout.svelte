<script lang="ts">
	import type { LayoutData } from './$types';
	import PublicHeader from '$lib/components/PublicHeader.svelte';

	/**
	 * Shell público: header estilo Shopify + contenido. La paleta global vive
	 * en el layout raíz (tokens según el modo del visitante); aquí solo se
	 * estructura la página.
	 */
	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<div class="flex min-h-screen flex-col bg-(--app-bg) text-(--app-text)">
	<PublicHeader
		appName={data.settings?.appName ?? undefined}
		logoUrl={data.settings?.logoUrl ?? null}
		profile={data.profile}
	/>
	<main class="flex-1">
		{@render children()}
	</main>
</div>
