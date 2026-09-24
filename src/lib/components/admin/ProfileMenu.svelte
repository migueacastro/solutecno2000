<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import { m } from '$lib/paraglide/messages.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	/**
	 * Botón de perfil (avatar o icono) para la esquina del admin: al pulsarlo
	 * abre un popup con el nombre/rol, un enlace al perfil y cerrar sesión.
	 * Se cierra con clic fuera (backdrop) o Escape. El sign-out es autocontenido
	 * (mismo flujo que el Sidebar: invalidateAll reejecuta el guard).
	 */
	type Props = {
		profile: {
			id: string;
			display_name: string | null;
			avatar_url: string | null;
			role: string | null;
		};
	};

	let { profile }: Props = $props();

	let open = $state(false);

	const name = $derived(profile.display_name?.trim() || profile.id);
	const initial = $derived(name.slice(0, 1).toUpperCase());

	function toggle(): void {
		open = !open;
	}

	function close(): void {
		open = false;
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (open && event.key === 'Escape') close();
	}

	async function signOut(): Promise<void> {
		close();
		await createSupabaseBrowserClient().auth.signOut();
		// invalidateAll reejecuta el +layout.ts para que el guard vea la sesión muerta.
		await goto(resolve('/admin' as Pathname), { invalidateAll: true });
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative">
	<button
		type="button"
		aria-label={m.admin_profile_open()}
		aria-haspopup="menu"
		aria-expanded={open}
		class="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-(--app-border) bg-(--app-surface) transition-colors hover:bg-black/2"
		onclick={toggle}
	>
		{#if profile.avatar_url}
			<img src={profile.avatar_url} alt="" class="h-full w-full object-cover" />
		{:else}
			<Icon paths="<circle cx='12' cy='8' r='4' /><path d='M4 21a8 8 0 0 1 16 0' />" size={18} />
		{/if}
	</button>

	{#if open}
		<!-- Backdrop invisible: cualquier clic fuera cierra (patrón del drawer). -->
		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default"
			aria-label={m.admin_profile_close()}
			onclick={close}
		></button>

		<div
			role="menu"
			class="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded border border-(--app-border) bg-(--app-surface) shadow-[0_4px_16px_rgba(26,26,26,0.15)]"
		>
			<!-- Cabecera: quién ha entrado (no navega, es solo información). -->
			<div class="flex items-center gap-2 px-3 py-3">
				{#if profile.avatar_url}
					<img src={profile.avatar_url} alt="" class="h-8 w-8 shrink-0 rounded-full object-cover" />
				{:else}
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--app-active-bg) text-[13px] font-semibold text-(--app-text-muted)"
					>
						{initial}
					</div>
				{/if}
				<div class="min-w-0">
					<p class="truncate text-[13px] font-semibold text-(--app-text)">{name}</p>
					<p class="text-[11px] text-(--app-text-muted) uppercase">
						{profile.role ?? ''}
					</p>
				</div>
			</div>

			<div class="border-t border-(--app-border)">
				<a
					href={resolve('/admin/profile' as Pathname)}
					onclick={close}
					role="menuitem"
					class="flex cursor-pointer items-center gap-2 px-3 py-2 text-[13px] font-medium text-(--app-text) no-underline hover:bg-black/2"
				>
					<Icon
						paths="<circle cx='12' cy='8' r='4' /><path d='M4 21a8 8 0 0 1 16 0' />"
						size={16}
					/>
					{m.admin_profile_menu_profile()}
				</a>
				<button
					type="button"
					role="menuitem"
					class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-(--app-text) hover:bg-black/2"
					onclick={signOut}
				>
					<Icon
						paths="<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' /><path d='m16 17 5-5-5-5' /><path d='M21 12H9' />"
						size={16}
					/>
					{m.admin_sidebar_sign_out()}
				</button>
			</div>
		</div>
	{/if}
</div>
