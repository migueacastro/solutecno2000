<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import SearchBar from '$lib/components/ui/SearchBar.svelte';
	import ProfileMenu from '$lib/components/admin/ProfileMenu.svelte';
	import LanguageToggle from '$lib/components/LanguageToggle.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { APP_NAME } from '$lib/config/app';
	import { m } from '$lib/paraglide/messages.js';
	import { adminNavSearchItems } from '$lib/search/global-items';
	import { searchLocal } from '$lib/search';
	import { productsSearchSource } from '$lib/search/products-source';
	import type { SearchSource } from '$lib/search/types';

	/**
	 * Topbar del admin estilo Shopify: barra fija full-width sobre la sidebar
	 * con la marca a la izquierda (como el navbar público), buscador centrado
	 * (⌘K/Ctrl+K) y a la derecha perfil, idioma y tema. En móvil añade el
	 * hamburger que abre el drawer de la Sidebar.
	 */
	type Props = {
		profile: {
			id: string;
			display_name: string | null;
			avatar_url: string | null;
			role: string | null;
		};
		/** Nombre de la marca (app_settings); si falta, cae a APP_NAME (env). */
		appName?: string;
		/** URL del logo de la marca en el bucket media; null = texto en mayúsculas. */
		logoUrl?: string | null;
		/** Abre el drawer móvil de la Sidebar (solo el botón hamburger). */
		onMenuToggle?: () => void;
	};

	let { profile, appName, logoUrl = null, onMenuToggle }: Props = $props();

	// Marca con fallback interno: la topbar sigue usable sin props.
	const brand = $derived(appName?.trim() || APP_NAME);
	const adminHome = resolve('/admin' as Pathname);

	// Búsqueda global (JSON local preindexado). La fuente se crea una vez por
	// componente: el preíndice trigram cachea por referencia del array en el
	// WeakMap, y adminNavSearchItems() se llama aquí una sola vez.
	const localSource: SearchSource = {
		id: 'local:admin',
		search: (query) => Promise.resolve(searchLocal(query, adminNavSearchItems()))
	};
	// Remota: RPC pg_trgm sobre products (merge tras responder la local).
	const productsSource = productsSearchSource();
</script>

<!--
	z-30: misma capa que el cluster que sustituye; el backdrop z-40 del
	ProfileMenu y del dropdown del SearchBar quedan encima (correcto).
-->
<header
	class="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-(--app-border) bg-(--app-surface) px-3 md:px-4"
>
	<!-- Hamburger móvil: abre el drawer de la Sidebar (< 768px). -->
	<IconButton
		shape="square"
		label={m.menu_open()}
		onclick={() => onMenuToggle?.()}
		class="md:hidden"
	>
		<Icon paths="<path d='M3 6h18' /><path d='M3 12h18' /><path d='M3 18h18' />" size={20} />
	</IconButton>

	<!-- Marca: igual que el navbar público (logo o texto en MAYÚSCULAS). -->
	<a href={adminHome} class="flex shrink-0 items-center gap-2 no-underline">
		{#if logoUrl}
			<img src={logoUrl} alt={brand} class="h-7 rounded object-contain" />
		{:else}
			<!-- La marca se muestra en MAYÚSCULAS (petición del usuario): el
				valor guardado no cambia, solo la presentación. -->
			<span class="truncate text-[16px] font-semibold tracking-wide text-(--app-text) uppercase">
				{brand}
			</span>
		{/if}
	</a>

	<!-- Buscador centrado: flex-1 acapara el espacio sobrante a ambos lados. -->
	<div class="mx-auto max-w-xl min-w-0 flex-1">
		<SearchBar
			sources={[localSource, productsSource]}
			placeholder={m.admin_search_placeholder()}
			ariaLabel={m.admin_search_label()}
			hotkey
			showRecent
		/>
	</div>

	<div class="flex shrink-0 items-center gap-2">
		<ProfileMenu {profile} />
		<LanguageToggle />
		<ThemeToggle />
	</div>
</header>
