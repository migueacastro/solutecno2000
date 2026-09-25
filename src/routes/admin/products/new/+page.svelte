<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import { toasts } from '$lib/stores/toast.svelte';
	import ProductForm from '$lib/components/admin/ProductForm.svelte';

	/**
	 * Creación de producto: ProductForm sin fila inicial (mode create).
	 * El éxito redirige a la página de edición del producto recién creado.
	 */
	async function handleSaved(newId: string | undefined): Promise<void> {
		toasts.push('success', m.admin_toast_product_created());
		if (newId) {
			void goto(resolve(`/admin/products/${newId}` as Pathname));
		}
	}
</script>

<svelte:head><title>{m.admin_products_new()}</title></svelte:head>

<div class="flex items-center justify-between gap-4">
	<h1 class="text-[20px] font-semibold text-(--app-text)">{m.admin_products_new()}</h1>
</div>

<div class="mt-4">
	<ProductForm initial={null} action="create_product" onSaved={handleSaved} />
</div>
