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
	 * Header público estilo Dawn: sticky con marca a la izquierda, nav plana,
	 * y a la derecha cuenta + idioma + tema (+ hamburger en móvil). El menú
	 * móvil es un drawer izquierdo (patrón de Dawn, igual que el drawer del
	 * Sidebar admin): backdrop + panel de 240px con la nav y los toggles al
	 * final. Se cierra con backdrop, X, al elegir un link o con Escape.
	 */
	type Props = {
		appName?: string;
		logoUrl?: string | null;
		/** Visitante con sesión (de la zona pública): si tiene avatar se pinta. */
		profile?: { avatar_url: string | null } | null;
	};
	let { appName, logoUrl = null, profile = null }: Props = $props();

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

	// Cuenta apunta a /admin (único punto de entrada de login con Supabase).
	// Placeholder: cuando exista página de cuenta pública se cambia el href.
	const accountHref = resolve('/admin' as Pathname);

	// Clases compartidas entre desktop (inline) y drawer (bloque).
	// Catálogo/Blog sin href aún: span muted con cursor-default.
	function classes(block: boolean, disabled = false): string {
		return [
			block ? 'block' : 'inline-block',
			'rounded px-3 py-2 text-[14px] font-medium no-underline transition-colors',
			disabled ? 'cursor-default text-(--app-text-muted)' : 'text-(--app-text) hover:bg-black/2'
		].join(' ');
	}

	let menuOpen = $state(false);
	function closeMenu(): void {
		menuOpen = false;
	}
</script>

<svelte:window onkeydown={(e) => menuOpen && e.key === 'Escape' && closeMenu()} />

<header class="sticky top-0 z-20 border-b border-(--app-border) bg-(--app-surface)">
	<div class="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-4 md:px-8">
		<a href={home} class="flex items-center gap-2 no-underline">
			{#if logoUrl}
				<img src={logoUrl} alt={brand} class="h-7 rounded object-contain" />
			{:else}
				<!-- La marca se muestra en MAYÚSCULAS (petición del usuario): el
					valor guardado no cambia, solo la presentación. -->
				<span class="text-[16px] font-semibold tracking-wide text-(--app-text) uppercase">
					{brand}
				</span>
			{/if}
		</a>

		<nav class="ml-6 hidden items-center gap-1 md:flex" aria-label={m.nav_primary()}>
			{#each links as link (link.label)}
				{#if link.href}
					<a href={link.href} class={classes(false)}>{link.label}</a>
				{:else}
					<span aria-disabled="true" class={classes(false, true)}>{link.label}</span>
				{/if}
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-1">
			<!-- Cuenta: anchor con la pinta del IconButton circle (no se puede
				envolver un button en un a). Con sesión muestra el avatar del
				perfil; sin sesión, el icono genérico de persona. -->
			<a
				href={accountHref}
				aria-label={m.nav_account()}
				title={m.nav_account()}
				class="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-(--app-border) bg-(--app-surface) text-(--app-text) no-underline transition-colors hover:bg-black/2"
			>
				{#if profile?.avatar_url}
					<img src={profile.avatar_url} alt="" class="h-full w-full object-cover" />
				{:else}
					<Icon
						paths="<circle cx='12' cy='8' r='4' /><path d='M4 21a8 8 0 0 1 16 0' />"
						size={18}
					/>
				{/if}
			</a>
			<span class="hidden md:flex">
				<LanguageToggle />
			</span>
			<span class="hidden md:flex">
				<ThemeToggle />
			</span>
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

	<!-- Drawer izquierdo estilo Dawn (patrón del drawer del Sidebar admin). -->
	{#if menuOpen}
		<div class="md:hidden">
			<button
				type="button"
				class="fixed inset-0 z-40 cursor-default bg-black/70"
				aria-label={m.menu_close()}
				onclick={closeMenu}
			></button>
			<aside class="fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-(--app-surface)">
				<div class="flex items-center gap-2 p-3">
					{#if logoUrl}
						<img src={logoUrl} alt={brand} class="h-7 shrink-0 rounded object-contain" />
					{/if}
					<span
						class="truncate text-[15px] font-semibold tracking-wide text-(--app-text) uppercase"
					>
						{brand}
					</span>
					<IconButton shape="square" label={m.menu_close()} onclick={closeMenu} class="ml-auto">
						<Icon paths="<path d='M18 6 6 18M6 6l12 12' />" size={20} />
					</IconButton>
				</div>
				<nav class="flex-1 px-2 py-3" aria-label={m.nav_primary()}>
					<ul class="flex flex-col gap-1">
						{#each links as link (link.label)}
							<li>
								{#if link.href}
									<a href={link.href} onclick={closeMenu} class={classes(true)}>
										{link.label}
									</a>
								{:else}
									<span aria-disabled="true" class={classes(true, true)}>
										{link.label}
									</span>
								{/if}
							</li>
						{/each}
					</ul>
				</nav>
				<!-- Dawn: idioma/tipo de país al final del drawer móvil. -->
				<div class="flex items-center gap-1 border-t border-(--app-border) p-3">
					<LanguageToggle />
					<ThemeToggle />
				</div>
			</aside>
		</div>
	{/if}
</header>
