<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';

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
			role: 'admin' | 'staff' | 'customer';
		};
		mobileOpen?: boolean;
		onNavigate?: () => void;
	};

	let { profile, mobileOpen = false, onNavigate }: Props = $props();

	// El colapso se lee y persiste solo en el cliente: localStorage no existe en SSR.
	let collapsed = $state(false);

	onMount(() => {
		collapsed = localStorage.getItem('admin-sidebar-collapsed') === 'true';
	});

	$effect(() => {
		// Persistencia de preferencia: efecto legítimo, escribe en localStorage.
		localStorage.setItem('admin-sidebar-collapsed', collapsed ? 'true' : 'false');
	});

	// Nav con sustantivos, no verbos. Iconos SVG inline de 24px, stroke currentColor.
	const items: { label: string; href: string; icono: string }[] = [
		{
			label: 'Inicio',
			href: '/admin',
			icono: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>'
		},
		{
			label: 'Productos',
			href: '/admin/products',
			icono:
				'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>'
		},
		{
			label: 'Colecciones',
			href: '/admin/collections',
			icono: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'
		},
		{
			label: 'Consultas',
			href: '/admin/inquiries',
			icono: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>'
		},
		{
			label: 'Clientes',
			href: '/admin/customers',
			icono: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
		}
	];

	function esActivo(href: string): boolean {
		const pathname = page.url.pathname;
		if (pathname === href) return true;
		// Prefijo de ruta, salvo para el inicio: /admin/products activa
		// /admin/products pero /admin/products NO activa /admin.
		return href !== '/admin' && pathname.startsWith(`${href}/`);
	}

	async function cerrarSesion(): Promise<void> {
		await createSupabaseBrowserClient().auth.signOut();
		// invalidateAll reejecuta el +layout.ts para que el guard vea la sesión muerta.
		await goto(resolve('/admin' as Pathname), { invalidateAll: true });
	}
</script>

<!--
	La nav se define una vez y se renderiza dos veces: columna de escritorio
	(colapsable) y drawer móvil (siempre expandido).
-->
{#snippet nav(colapsado: boolean, onNav?: () => void)}
	<nav class="flex-1 overflow-y-auto px-2 py-3">
		<ul class="flex flex-col gap-1">
			{#each items as item (item.href)}
				<li>
					<a
						href={resolve(item.href as Pathname)}
						onclick={onNav ? () => onNav() : undefined}
						aria-current={esActivo(item.href) ? 'page' : undefined}
						title={colapsado ? item.label : undefined}
						class="flex items-center gap-3 rounded px-3 py-2 text-[14px] font-medium text-[#303030] no-underline transition-colors hover:bg-black/2 {colapsado
							? 'justify-center'
							: ''} {esActivo(item.href)
							? 'border-l-2 border-[#005BD3] bg-[#E3E3E3]'
							: 'border-l-2 border-transparent'}"
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="shrink-0"
							aria-hidden="true"
						>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html item.icono}
						</svg>
						{#if !colapsado}
							<span class="truncate">{item.label}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="border-t border-[#D5D5D5] p-3">
		{#if !colapsado}
			<div class="mb-2 flex items-center gap-2 px-1">
				{#if profile.avatar_url}
					<img src={profile.avatar_url} alt="" class="h-8 w-8 shrink-0 rounded-full object-cover" />
				{:else}
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E3E3E3] text-[13px] font-semibold text-[#616161]"
					>
						{(profile.display_name ?? '?').slice(0, 1).toUpperCase()}
					</div>
				{/if}
				<span class="truncate text-[13px] font-medium text-[#303030]">
					{profile.display_name ?? profile.id}
				</span>
			</div>
		{/if}
		<button
			type="button"
			class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-[13px] font-medium text-[#616161] hover:bg-black/2 {colapsado
				? 'justify-center'
				: ''}"
			onclick={cerrarSesion}
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="shrink-0"
				aria-hidden="true"
			>
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
				<path d="m16 17 5-5-5-5" />
				<path d="M21 12H9" />
			</svg>
			{#if !colapsado}
				<span>Cerrar sesión</span>
			{/if}
		</button>
	</div>
{/snippet}

<!-- Columna de escritorio: siempre visible desde 768px. -->
<aside
	class="hidden shrink-0 flex-col bg-[#EBEBEB] md:flex {collapsed ? 'w-[72px]' : 'w-[240px]'}"
	style="transition: width 150ms cubic-bezier(0.25, 0.1, 0.25, 1)"
>
	<div class="flex items-center justify-between gap-2 p-3 {collapsed ? 'justify-center' : ''}">
		{#if !collapsed}
			<span class="truncate text-[15px] font-semibold text-[#303030]">SolutionsTecno</span>
		{:else}
			<span class="text-[15px] font-bold text-[#005BD3]">S</span>
		{/if}
		<button
			type="button"
			class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-[#303030] hover:bg-black/2"
			aria-label={collapsed ? 'Expandir navegación' : 'Colapsar navegación'}
			onclick={() => (collapsed = !collapsed)}
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				{#if collapsed}
					<path d="m9 6 6 6-6 6" />
				{:else}
					<path d="m15 6-6 6 6 6" />
				{/if}
			</svg>
		</button>
	</div>

	{@render nav(collapsed)}
</aside>

<!-- Drawer móvil: solo cuando el layout lo abre y por debajo de 768px. -->
{#if mobileOpen}
	<div class="md:hidden">
		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default bg-black/70"
			aria-label="Cerrar menú de navegación"
			onclick={() => onNavigate?.()}
		></button>
		<aside class="fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-[#EBEBEB]">
			<div class="flex items-center gap-2 p-3">
				<span class="truncate text-[15px] font-semibold text-[#303030]">SolutionsTecno</span>
				<button
					type="button"
					class="ml-auto flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded text-[#303030] hover:bg-black/2"
					aria-label="Cerrar menú de navegación"
					onclick={() => onNavigate?.()}
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			</div>
			{@render nav(false, () => onNavigate?.())}
		</aside>
	</div>
{/if}
