<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import { APP_NAME } from '$lib/config/app';
	import { m } from '$lib/paraglide/messages.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';

	/**
	 * Sidebar colapsable estilo Polaris: 240px expandida, 72px solo iconos.
	 * La preferencia de colapso vive en localStorage. En pantallas < 768px
	 * se muestra como drawer superpuesto controlado por `mobileOpen`.
	 */
	type Props = {
		profile: {
			id: string;
			display_name: string | null;
			avatar_url: string | null;
		};
		/** Nombre de la marca (app_settings); si falta, cae a APP_NAME (env). */
		appName?: string;
		/** URL del logo de la marca en el bucket media; null = monograma. */
		logoUrl?: string | null;
		mobileOpen?: boolean;
		onNavigate?: () => void;
	};

	let { profile, appName, logoUrl = null, mobileOpen = false, onNavigate }: Props = $props();

	// Nombre resuelto con fallback interno: el componente sigue usable sin props.
	const brand = $derived(appName?.trim() || APP_NAME);
	const monogram = $derived(brand.slice(0, 1).toUpperCase());

	// El colapso se lee y persiste solo en el cliente: localStorage no existe en SSR.
	let collapsed = $state(false);

	onMount(() => {
		collapsed = localStorage.getItem('admin-sidebar-collapsed') === 'true';
	});

	$effect(() => {
		// Persistencia de preferencia: efecto legítimo, escribe en localStorage.
		localStorage.setItem('admin-sidebar-collapsed', collapsed ? 'true' : 'false');
	});

	// Nav con sustantivos, no verbos. Iconos SVG de 24px, stroke currentColor.
	// Labels via paraglide (reactivos: cambiar de idioma re-renderiza el menú).
	const items: { label: string; href: string; icon: string }[] = $derived([
		{
			label: m.admin_nav_home(),
			href: '/admin',
			icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>'
		},
		{
			label: m.admin_nav_products(),
			href: '/admin/products',
			icon: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>'
		},
		{
			label: m.admin_nav_collections(),
			href: '/admin/collections',
			icon: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'
		},
		{
			label: m.admin_nav_inquiries(),
			href: '/admin/inquiries',
			icon: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>'
		},
		{
			label: m.admin_nav_customers(),
			href: '/admin/customers',
			icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
		},
		{
			label: m.admin_nav_settings(),
			href: '/admin/settings',
			icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>'
		}
	]);

	function isActive(href: string): boolean {
		const pathname = page.url.pathname;
		if (pathname === href) return true;
		// Prefijo de ruta, salvo para el inicio: /admin/products activa
		// /admin/products pero /admin/products NO activa /admin.
		return href !== '/admin' && pathname.startsWith(`${href}/`);
	}

	async function signOut(): Promise<void> {
		await createSupabaseBrowserClient().auth.signOut();
		// invalidateAll reejecuta el +layout.ts para que el guard vea la sesión muerta.
		await goto(resolve('/admin' as Pathname), { invalidateAll: true });
	}
</script>

<!--
	La nav se define una vez y se renderiza dos veces: columna de escritorio
	(colapsable) y drawer móvil (siempre expandido).
-->
{#snippet nav(collapsed: boolean, onNav?: () => void)}
	<nav class="flex-1 overflow-y-auto px-2 py-3">
		<ul class="flex flex-col gap-1">
			{#each items as item (item.href)}
				<li>
					<a
						href={resolve(item.href as Pathname)}
						onclick={onNav ? () => onNav() : undefined}
						aria-current={isActive(item.href) ? 'page' : undefined}
						title={collapsed ? item.label : undefined}
						class="flex items-center gap-3 rounded px-3 py-2 text-[14px] font-medium text-(--app-text) no-underline transition-colors hover:bg-black/2 {collapsed
							? 'justify-center'
							: ''} {isActive(item.href)
							? 'border-l-2 border-(--app-primary) bg-(--app-active-bg)'
							: 'border-l-2 border-transparent'}"
					>
						<Icon paths={item.icon} size={24} />
						{#if !collapsed}
							<span class="truncate">{item.label}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="border-t border-(--app-border) p-3">
		{#if !collapsed}
			<div class="mb-2 flex items-center gap-2 px-1">
				{#if profile.avatar_url}
					<img src={profile.avatar_url} alt="" class="h-8 w-8 shrink-0 rounded-full object-cover" />
				{:else}
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--app-active-bg) text-[13px] font-semibold text-(--app-text-muted)"
					>
						{(profile.display_name ?? '?').slice(0, 1).toUpperCase()}
					</div>
				{/if}
				<span class="truncate text-[13px] font-medium text-(--app-text)">
					{profile.display_name ?? profile.id}
				</span>
			</div>
		{/if}
		<button
			type="button"
			class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-[13px] font-medium text-(--app-text-muted) hover:bg-black/2 {collapsed
				? 'justify-center'
				: ''}"
			onclick={signOut}
		>
			<Icon
				paths="<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' /><path d='m16 17 5-5-5-5' /><path d='M21 12H9' />"
				size={20}
			/>
			{#if !collapsed}
				<span>{m.admin_sidebar_sign_out()}</span>
			{/if}
		</button>
	</div>
{/snippet}

<!-- Columna de escritorio: siempre visible desde 768px. -->
<aside
	class="hidden shrink-0 flex-col bg-(--app-nav-bg) md:flex {collapsed ? 'w-[72px]' : 'w-[240px]'}"
	style="transition: width 150ms cubic-bezier(0.25, 0.1, 0.25, 1)"
>
	<div class="flex items-center justify-between gap-2 p-3 {collapsed ? 'justify-center' : ''}">
		{#if logoUrl}
			<img src={logoUrl} alt={brand} class="h-7 shrink-0 rounded object-contain" />
		{/if}
		{#if !collapsed}
			<span class="truncate text-[15px] font-semibold text-(--app-text)">{brand}</span>
		{:else if !logoUrl}
			<span class="text-[15px] font-bold text-(--app-primary)">{monogram}</span>
		{/if}
		<IconButton
			shape="square"
			label={collapsed ? m.admin_sidebar_expand() : m.admin_sidebar_collapse()}
			onclick={() => (collapsed = !collapsed)}
		>
			<Icon
				paths={collapsed ? '<path d="m9 6 6 6-6 6" />' : '<path d="m15 6-6 6 6 6" />'}
				size={20}
			/>
		</IconButton>
	</div>

	{@render nav(collapsed)}
</aside>

<!-- Drawer móvil: solo cuando el layout lo abre y por debajo de 768px. -->
{#if mobileOpen}
	<div class="md:hidden">
		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default bg-black/70"
			aria-label={m.admin_sidebar_menu_close()}
			onclick={() => onNavigate?.()}
		></button>
		<aside class="fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-(--app-nav-bg)">
			<div class="flex items-center gap-2 p-3">
				{#if logoUrl}
					<img src={logoUrl} alt={brand} class="h-7 shrink-0 rounded object-contain" />
				{/if}
				<span class="truncate text-[15px] font-semibold text-(--app-text)">{brand}</span>
				<IconButton
					shape="square"
					label={m.admin_sidebar_menu_close()}
					onclick={() => onNavigate?.()}
					class="ml-auto"
				>
					<Icon paths="<path d='M18 6 6 18M6 6l12 12' />" size={20} />
				</IconButton>
			</div>
			{@render nav(false, () => onNavigate?.())}
		</aside>
	</div>
{/if}
