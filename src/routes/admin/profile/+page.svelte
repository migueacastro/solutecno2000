<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/ui/Card.svelte';

	/**
	 * Placeholder de perfil: muestra los datos que ya trae el guard del admin
	 * (avatar, nombre, rol). Pendiente de diseño definitivo por el usuario.
	 */
	let { data }: { data: PageData } = $props();

	const name = $derived(data.profile?.display_name?.trim() || data.profile?.id || '?');
</script>

<Card class="max-w-sm p-6 text-center">
	{#if data.profile?.avatar_url}
		<img
			src={data.profile.avatar_url}
			alt={name}
			class="mx-auto h-16 w-16 rounded-full object-cover"
		/>
	{:else}
		<div
			class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--app-active-bg) text-[22px] font-bold text-(--app-text-muted)"
		>
			{name.slice(0, 1).toUpperCase()}
		</div>
	{/if}

	<h1 class="mt-3 text-[16px] font-semibold text-(--app-text)">{name}</h1>
	<p class="mt-1 text-[12px] text-(--app-text-muted) uppercase">
		{data.profile?.role ?? ''}
	</p>
</Card>
