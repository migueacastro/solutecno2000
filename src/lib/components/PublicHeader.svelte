<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { APP_NAME } from '$lib/config/app';
	import LanguageToggle from '$lib/components/LanguageToggle.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	/**
	 * Header público estilo Shopify: barra fija con logo, navegación plana y
	 * los toggles de idioma y tema a la derecha. En <768px los links colapsan
	 * tras un botón de menú.
	 */
	type Props = { appName?: string; logoUrl?: string | null };
	let { appName, logoUrl = null }: Props = $props();

	// Marca con fallback interno: el header sigue usable sin props.
	const brand = $derived(appName?.trim() || APP_NAME);
	const home = resolve('/' as Pathname);

	// Catálogo y Blog se llenan en las etapas 2 y 3: sin href, se renderizan
	// como <span> deshabilitado (un <a href="#"> es inaccesible y molesta al lint).
	const links = $derived([
		{ label: m.nav_home(), href: home },
		{ label: m.nav_catalog(), href: null },
		{ label: m.nav_blog(), href: null }
	]);

	// Clases compartidas entre la versión de escritorio (inline) y la del
	// menú móvil (bloque).
	function classes(block: boolean, inert: boolean): string {
		return [
			block ? 'block' : 'inline-block',
			'rounded px-3 py-2 text-[14px] font-medium no-underline transition-colors',
			inert ? 'cursor-default text-(--app-text-muted)' : 'text-(--app-text) hover:bg-black/2'
		].join(' ');
	}

	let menuOpen = $state(false);
</script>

<header class="sticky top-0 z-20 border-b border-(--app-border) bg-(--app-surface)">
	<div class="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-4 md:px-8">
		<a href={home} class="flex items-center gap-2 no-underline">
			{#if logoUrl}
				<img src={logoUrl} alt={brand} class="h-7 rounded object-contain" />
			{:else}
				<span class="text-[16px] font-semibold text-(--app-text)">{brand}</span>
			{/if}
		</a>

		<nav class="ml-6 hidden items-center gap-1 md:flex" aria-label="Navegación principal">
			{#each links as link (link.label)}
				{#if link.href}
					<a href={link.href} class={classes(false, false)}>{link.label}</a>
				{:else}
					<span aria-disabled="true" class={classes(false, true)}>{link.label}</span>
				{/if}
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-2">
			<LanguageToggle />
			<ThemeToggle />
			<IconButton
				shape="circle"
				label={menuOpen ? m.menu_close() : m.menu_open()}
				onclick={() => (menuOpen = !menuOpen)}
				class="md:hidden"
			>
				<Icon
					paths={menuOpen
						? '<path d="M18 6 6 18M6 6l12 12" />'
						: '<path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />'}
					size={18}
				/>
			</IconButton>
		</div>
	</div>

	{#if menuOpen}
		<nav
			class="border-t border-(--app-border) px-4 py-2 md:hidden"
			aria-label="Navegación principal"
		>
			<ul class="flex flex-col">
				{#each links as link (link.label)}
					<li>
						{#if link.href}
							<a href={link.href} class={classes(true, false)}>{link.label}</a>
						{:else}
							<span aria-disabled="true" class={classes(true, true)}>{link.label}</span>
						{/if}
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
</header>
