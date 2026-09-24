<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * Home temporal de la zona pública mientras se construyen el catálogo
	 * (etapa 2) y el blog (etapa 3).
	 */
</script>

<section class="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center">
	<p class="text-[40px]" aria-hidden="true">🚧</p>
	<h1 class="text-[28px] font-semibold text-(--app-text)">{m.construction_title()}</h1>
	<p class="max-w-md text-[15px] leading-6 text-(--app-text-muted)">{m.construction_text()}</p>
</section>
