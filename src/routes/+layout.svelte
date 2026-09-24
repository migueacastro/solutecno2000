<script lang="ts">
	import type { LayoutData } from './$types';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { theme } from '$lib/stores/theme.svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { buildThemeCss } from '$lib/config/theme';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	// El modo del visitante (cookie leída en el load raíz) solo interesa al
	// montar: después el toggle es la única fuente y persiste via cookie.
	theme.initialize(untrack(() => data.mode));

	// El CSS global viaja con los DOS bloques (claro + oscuro) del tema activo;
	// el toggle solo cambia data-mode en <html>, sin regenerar estilos.
	// favicon de la marca si hay uno en settings.
	// eslint no ve el uso del bloque CSS en el head: disable puntual.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const themeCss = $derived(
		buildThemeCss(data.settings?.theme?.tokensLight, data.settings?.theme?.tokensDark)
	);
	const faviconHref = $derived(data.settings?.faviconUrl || favicon);
</script>

<svelte:head>
	<style>
{themeCss}
	</style>
	<link rel="icon" href={faviconHref} />
</svelte:head>
{@render children()}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>
