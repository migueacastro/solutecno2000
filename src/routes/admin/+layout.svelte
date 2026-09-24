<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { goto, invalidateAll } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import Sidebar from '$lib/components/admin/Sidebar.svelte';
	import Toasts from '$lib/components/admin/Toasts.svelte';

	/**
	 * Shell del panel admin con el guard del +layout.ts. Estados en orden:
	 * 1. Supabase sin configurar -> aviso centrado.
	 * 2. Sin sesión -> tarjeta de login con Google.
	 * 3. Sin perfil o rol customer -> tarjeta "sin permisos".
	 * 4. staff/admin -> shell: sidebar + contenido + toasts.
	 */
	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// El drawer móvil vive aquí; Sidebar solo lo recibe como prop.
	let drawerAbierto = $state(false);

	let errorLogin = $state('');
	let iniciandoSesion = $state(false);

	async function iniciarSesion(): Promise<void> {
		errorLogin = '';
		iniciandoSesion = true;
		const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${window.location.origin}/admin` }
		});
		iniciandoSesion = false;
		if (error) {
			errorLogin = 'No se pudo iniciar el inicio de sesión. Inténtalo de nuevo.';
		}
	}

	async function cerrarSesion(): Promise<void> {
		await createSupabaseBrowserClient().auth.signOut();
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
		class="flex min-h-screen items-center justify-center bg-[#F1F1F1] p-4 font-[Inter,system-ui,sans-serif]"
	>
		<div
			class="max-w-sm bg-white p-6 text-center"
			style="border-radius: 8px; box-shadow: 0 3px 1px -1px rgba(26, 26, 26, 0.07);"
		>
			<h1 class="text-[20px] font-semibold text-[#303030]">Configuración pendiente</h1>
			<p class="mt-2 text-[13px] leading-5 text-[#616161]">
				Supabase no está configurado en este entorno.
			</p>
		</div>
	</div>
{:else if data.needsLogin}
	<div
		class="flex min-h-screen items-center justify-center bg-[#F1F1F1] p-4 font-[Inter,system-ui,sans-serif]"
	>
		<div
			class="w-full max-w-sm bg-white p-8 text-center"
			style="border-radius: 8px; box-shadow: 0 4px 6px -2px rgba(26, 26, 26, 0.2);"
		>
			<h1 class="text-[20px] font-semibold text-[#303030]">SolutionsTecno Admin</h1>
			<p class="mt-2 text-[13px] leading-5 text-[#616161]">
				Inicia sesión con tu cuenta para continuar.
			</p>
			<button
				type="button"
				class="mt-6 w-full cursor-pointer text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
				style="background: #005BD3; border-radius: 4px; padding: 8px 16px;"
				onclick={iniciarSesion}
				disabled={iniciandoSesion}
			>
				Iniciar sesión con Google
			</button>
			{#if errorLogin}
				<p class="mt-3 text-[13px] text-[#8E0B21]">{errorLogin}</p>
			{/if}
		</div>
	</div>
{:else if !data.profile || data.profile.role === 'customer'}
	<div
		class="flex min-h-screen items-center justify-center bg-[#F1F1F1] p-4 font-[Inter,system-ui,sans-serif]"
	>
		<div
			class="w-full max-w-sm bg-white p-8 text-center"
			style="border-radius: 8px; box-shadow: 0 3px 1px -1px rgba(26, 26, 26, 0.07);"
		>
			<h1 class="text-[20px] font-semibold text-[#303030]">Sin permisos</h1>
			<p class="mt-2 text-[13px] leading-5 text-[#616161]">Tu cuenta no tiene acceso de staff.</p>
			<button
				type="button"
				class="mt-6 cursor-pointer text-[14px] font-semibold text-[#303030] transition-opacity hover:opacity-80"
				style="background: #E3E3E3; border-radius: 4px; padding: 8px 16px;"
				onclick={cerrarSesion}
			>
				Cerrar sesión
			</button>
		</div>
	</div>
{:else}
	<div class="flex min-h-screen bg-[#F1F1F1] font-[Inter,system-ui,sans-serif] text-[#303030]">
		<Sidebar
			profile={data.profile}
			mobileOpen={drawerAbierto}
			onNavigate={() => (drawerAbierto = false)}
		/>
		<main class="min-w-0 flex-1">
			<div class="mx-auto max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
				{@render children()}
			</div>
		</main>
	</div>
	<Toasts />
{/if}
