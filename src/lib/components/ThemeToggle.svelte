<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	/**
	 * Botón circular claro/oscuro reutilizable: flotante en el admin y dentro
	 * del navbar en la zona pública. El modo vive en el store global de tema.
	 */

	// Luna en claro (activa el oscuro), sol en oscuro (activa el claro).
	const icon = $derived(
		theme.mode === 'light'
			? '<path d="M12 3a6.36 6.36 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
			: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'
	);
</script>

<IconButton
	label={theme.mode === 'light' ? m.theme_switch_dark() : m.theme_switch_light()}
	onclick={() => theme.toggle()}
>
	<Icon paths={icon} size={18} />
</IconButton>
