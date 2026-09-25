<script lang="ts">
	import type { PageData } from './$types';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { goto, invalidateAll } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import { callAction } from '$lib/admin/actions';
	import { toasts } from '$lib/stores/toast.svelte';
	import ProductForm from '$lib/components/admin/ProductForm.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';

	/**
	 * Edición de producto: ProductForm con la fila cargada (dueño del draft
	 * y del guardado). El delete vive aquí: ConfirmModal critical + callAction
	 * + redirect a la lista.
	 */
	let { data }: { data: PageData } = $props();

	const listHref = resolve('/admin/products' as Pathname);

	/** Guardado OK: datos frescos (metadata/published_at) + toast. */
	async function handleSaved(): Promise<void> {
		await invalidateAll();
		toasts.push('success', m.admin_toast_product_updated());
	}

	// ── Eliminar ──
	let deleteOpen = $state(false);
	let deleting = $state(false);

	async function handleDelete(): Promise<void> {
		deleting = true;
		const res = await callAction('delete_product', { id: data.product?.id ?? '' });
		deleting = false;
		deleteOpen = false;

		if (res.ok) {
			toasts.push('success', m.admin_toast_product_deleted());
			void goto(listHref);
		} else {
			toasts.push('critical', res.error ?? m.admin_errors_unexpected());
		}
	}
</script>

<svelte:head><title>{data.product?.name ?? m.admin_products_title()}</title></svelte:head>

<div class="flex items-center justify-between gap-4">
	<h1 class="text-[20px] font-semibold text-(--app-text)">
		{data.product?.name ?? m.admin_products_title()}
	</h1>
</div>

{#if data.product}
	<div class="mt-4">
		<ProductForm
			initial={data.product}
			action="update_product"
			onSaved={handleSaved}
			editMeta={{
				publishedAt: data.product.published_at,
				createdAt: data.product.created_at,
				updatedAt: data.product.updated_at
			}}
			onDelete={() => (deleteOpen = true)}
		/>
	</div>
{:else}
	<div class="mt-4">
		<EmptyState
			title={m.admin_errors_product_not_found()}
			text={m.admin_product_form_not_found_text()}
		>
			<a
				href={listHref}
				class="rounded bg-(--app-active-bg) px-4 py-2 text-[13px] font-semibold text-(--app-text) no-underline transition-opacity hover:opacity-80"
			>
				{m.admin_product_form_back_to_list()}
			</a>
		</EmptyState>
	</div>
{/if}

<ConfirmModal
	open={deleteOpen}
	critical
	busy={deleting}
	title={m.admin_product_form_delete_title({ name: data.product?.name ?? '' })}
	text={m.admin_product_form_delete_text({ name: data.product?.name ?? '' })}
	confirmText={m.admin_product_form_delete()}
	onConfirm={handleDelete}
	onCancel={() => (deleteOpen = false)}
/>
