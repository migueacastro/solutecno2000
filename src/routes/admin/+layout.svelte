<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { signOutBrowser } from '$lib/auth/sign-out';
	import { resolveAppName } from '$lib/config/theme';
	import { m } from '$lib/paraglide/messages.js';
	import Sidebar from '$lib/components/admin/Sidebar.svelte';
	import AdminTopbar from '$lib/components/admin/AdminTopbar.svelte';
	import Toasts from '$lib/components/admin/Toasts.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	/**
	 * Shell del panel admin con el guard del +layout.ts. Estados en orden:
	 * 1. Supabase sin configurar -> aviso centrado.
	 * 2. Sin perfil o rol customer -> tarjeta "sin permisos".
	 * 3. staff/admin -> shell: sidebar + contenido + toasts.
	 *
	 * Sin sesión no llega aquí: el guard redirige a /login, y el intercambio
	 * del código PKCE es server-side en /auth/callback (el único actor).
	 */
	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Marca desde app_settings (layout raíz) con fallback a env/fijo.
	const brand = $derived(resolveAppName(data.settings?.appName));

	// El drawer móvil vive aquí; Sidebar solo lo recibe como prop.
	let drawerOpen = $state(false);

	async function signOut(): Promise<void> {
		await signOutBrowser();
		// invalidateAll reejecuta el +layout.ts para que el guard vea la sesión muerta.
		await goto(resolve('/admin' as Pathname), { invalidateAll: true });
	}
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if !data.supabaseReady}
	<div
		class="flex min-h-screen items-center justify-center bg-(--app-bg) p-4 font-[Inter,system-ui,sans-serif]"
	>
		<Card class="max-w-sm p-6 text-center">
			<h1 class="text-[20px] font-semibold text-(--app-text)">
				{m.admin_auth_no_config_title()}
			</h1>
			<p class="mt-2 text-[13px] leading-5 text-(--app-text-muted)">
				{m.admin_auth_no_config_text()}
			</p>
		</Card>
	</div>
{:else if !data.profile || data.profile.role === 'customer'}
	<div
		class="flex min-h-screen items-center justify-center bg-(--app-bg) p-4 font-[Inter,system-ui,sans-serif]"
	>
		<Card class="w-full max-w-sm p-8 text-center">
			<h1 class="text-[20px] font-semibold text-(--app-text)">
				{m.admin_auth_no_access_title()}
			</h1>
			<p class="mt-2 text-[13px] leading-5 text-(--app-text-muted)">
				{m.admin_auth_no_access_text()}
			</p>
			<Button variant="secondary" size="md" class="mt-6 w-full text-[14px]" onclick={signOut}>
				{m.admin_sidebar_sign_out()}
			</Button>
		</Card>
	</div>
{:else}
	<!-- Columna: topbar full-width arriba (cruza sobre la sidebar) + fila sidebar/main. -->
	<div
		class="flex min-h-screen flex-col bg-(--app-bg) font-[Inter,system-ui,sans-serif] text-(--app-text)"
	>
		<AdminTopbar
			profile={data.profile}
			appName={brand}
			logoUrl={data.settings?.logoUrl ?? null}
			onMenuToggle={() => (drawerOpen = true)}
		/>
		<div class="flex min-h-0 flex-1">
			<Sidebar
				profile={data.profile}
				mobileOpen={drawerOpen}
				onNavigate={() => (drawerOpen = false)}
			/>
			<main class="min-w-0 flex-1">
				<div class="mx-auto max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
					{@render children()}
				</div>
			</main>
		</div>
	</div>
	<Toasts />
{/if}
