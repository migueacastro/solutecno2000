<script lang="ts">
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages.js';
	import IconButton from '$lib/components/ui/IconButton.svelte';

	/**
	 * Botón de idioma (EN/ES) reutilizable: flotante en el admin y dentro del
	 * navbar en la zona pública. La estrategia activa es cookie-first: el
	 * locale real vive en la cookie PARAGLIDE_LOCALE (no hay rutas /es), así
	 * que se lee con getLocale() en vez de deducirlo del pathname.
	 */
	// No reactivo a propósito: cambiar de idioma recarga la página entera,
	// así que el valor de la inicialización siempre está vigente al clickear.
	const locale = getLocale();
	const nextLocale = locale === 'es' ? 'en' : 'es';
</script>

<IconButton label={m.language_toggle()} onclick={() => setLocale(nextLocale)} class="min-w-9 px-2">
	<!-- Muestra el idioma al que se puede cambiar, como el toggle de idioma de Shopify. -->
	<span class="text-[12px] font-semibold uppercase">{nextLocale}</span>
</IconButton>
