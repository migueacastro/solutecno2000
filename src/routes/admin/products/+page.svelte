<script lang="ts">
	import type { PageData } from './$types';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages.js';
	import { buildUrl, type SortDir } from '$lib/admin/list-params';
	import { formatPrice } from '$lib/admin/money';
	import DataTable from '$lib/components/admin/DataTable.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	/**
	 * Listado de productos: tabs de status + búsqueda + DataTable con
	 * paginación y orden server-side. La verdad vive en la URL: sort/tab/
	 * página se traducen a `?params` con buildUrl y el load reejecuta.
	 */
	let { data }: { data: PageData } = $props();

	type Row = PageData['rows'][number];

	// Ruta resuelta (con base) una sola vez: buildUrl y los tabs la usan.
	const listHref = resolve('/admin/products' as Pathname);
	const newHref = resolve('/admin/products/new' as Pathname);
	const DEFAULTS = {
		sort: { field: 'updated_at', dir: 'desc' as const },
		status: null as string | null
	};

	// Tabs de status como saved views: cambiar tab resetea page, conserva q.
	const tabs: { value: string | null; label: string }[] = $derived([
		{ value: null, label: m.admin_products_tab_all() },
		{ value: 'draft', label: m.admin_products_status_draft() },
		{ value: 'active', label: m.admin_products_status_active() },
		{ value: 'archived', label: m.admin_products_status_archived() },
		{ value: 'unlisted', label: m.admin_products_status_unlisted() }
	]);

	// Badge por tono del vocabulario Polaris (§2.4): draft=info, active=success,
	// archived=neutral, unlisted=caution.
	const statusTone = {
		draft: 'info',
		active: 'success',
		archived: 'neutral',
		unlisted: 'caution'
	} as const;

	const statusLabel = {
		draft: () => m.admin_products_status_draft(),
		active: () => m.admin_products_status_active(),
		archived: () => m.admin_products_status_archived(),
		unlisted: () => m.admin_products_status_unlisted()
	} as const;

	/** Enter en el buscador: filtro de lista con `?q=` (no buscador global). */
	function submitSearch(value: string): void {
		// La URL sale de buildUrl sobre una ruta ya resuelta; la regla no ve
		// a través de la función, se desactiva puntualmente.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(buildUrl(listHref, data.params, DEFAULTS, { q: value.trim(), page: 1 }));
	}

	/** Fecha corta en el locale activo. */
	const dateFormatter = $derived(new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }));

	/**
	 * Celdas de columna. Los snippets se declaran en el markup (no pueden
	 * vivir en <script>); `columns` es $derived para leerlos perezosamente,
	 * después de que el template los inicialice.
	 */
	const columns = $derived([
		{
			key: 'name',
			header: m.admin_products_col_product(),
			sortable: true,
			primary: true,
			cell: nameCell
		},
		{
			key: 'status',
			header: m.admin_products_col_status(),
			cell: statusCell
		},
		{
			key: 'price',
			header: m.admin_products_col_price(),
			sortable: true,
			align: 'right' as const,
			hideOnMobile: true,
			cell: priceCell
		},
		{
			key: 'updated_at',
			header: m.admin_products_col_updated(),
			sortable: true,
			hideOnMobile: true,
			cell: updatedCell
		}
	]);

	/** El DataTable emite 'campo-dir'; buildUrl espera SortDir tipado. */
	function parseSort(next: string): { field: string; dir: SortDir } {
		const [field, dir] = next.split('-');
		return { field, dir: dir as SortDir };
	}
</script>

{#snippet nameCell(row: Row)}
	<a
		href={resolve(`/admin/products/${row.id}` as Pathname)}
		class="font-medium text-(--app-primary) no-underline hover:underline"
	>
		{row.name}
	</a>
{/snippet}

{#snippet statusCell(row: Row)}
	<Badge tone={statusTone[row.status]}>{statusLabel[row.status]()}</Badge>
{/snippet}

{#snippet priceCell(row: Row)}
	{formatPrice(row.price, row.currency, row.price_on_request)}
{/snippet}

{#snippet updatedCell(row: Row)}
	{dateFormatter.format(new Date(row.updated_at))}
{/snippet}

<svelte:head><title>{m.admin_products_title()}</title></svelte:head>

<!-- Header: título + CTA principal. -->
<div class="flex items-center justify-between gap-4">
	<h1 class="text-[20px] font-semibold text-(--app-text)">{m.admin_products_title()}</h1>
	<!-- CTA como ancla (Button no renderiza enlaces). -->
	<a
		href={newHref}
		class="rounded bg-(--app-primary) px-4 py-2 text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
	>
		{m.admin_products_new()}
	</a>
</div>

<Card class="mt-4 p-0">
	<!-- Toolbar: tabs de status + búsqueda (filtro de lista, no buscador global). -->
	<div
		class="flex flex-col gap-3 border-b border-(--app-border) p-4 md:flex-row md:items-center md:justify-between"
	>
		<!-- Los tabs navegan con buildUrl sobre la ruta ya resuelta: la regla
			no ve a través de la función. -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<nav class="flex flex-wrap gap-1" aria-label={m.admin_products_title()}>
			{#each tabs as tab (tab.value ?? 'all')}
				<a
					href={buildUrl(listHref, data.params, DEFAULTS, { status: tab.value, page: 1 })}
					aria-current={data.params.status === tab.value ? 'page' : undefined}
					class="rounded px-3 py-1.5 text-[13px] font-medium no-underline transition-colors {data
						.params.status === tab.value
						? 'bg-(--app-active-bg) text-(--app-text)'
						: 'text-(--app-text-muted) hover:bg-black/2'}"
				>
					{tab.label}
				</a>
			{/each}
		</nav>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
		<!-- Input no controlado: el valor mostrado viene de la URL (verdad
			única) y Enter lo reenvía. -->
		<input
			type="search"
			value={data.params.q}
			onkeydown={(e) => e.key === 'Enter' && submitSearch(e.currentTarget.value)}
			placeholder={m.admin_products_search_placeholder()}
			aria-label={m.admin_products_search_label()}
			class="w-full rounded border border-(--app-border) bg-(--app-bg) px-3 py-1.5 text-[13px] text-(--app-text) outline-none focus:border-(--app-primary) md:w-56"
		/>
	</div>

	<DataTable
		{columns}
		rows={data.rows}
		rowKey={(row) => row.id}
		sort={`${data.params.sort.field}-${data.params.sort.dir}`}
		onSort={(next) =>
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(buildUrl(listHref, data.params, DEFAULTS, { sort: parseSort(next), page: 1 }))}
		page={data.params.page}
		pageSize={data.pageSize}
		hasPrevious={data.params.page > 1}
		hasNext={data.params.page * data.pageSize < data.total}
		total={data.total}
		onPage={(delta) =>
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(buildUrl(listHref, data.params, DEFAULTS, { page: data.params.page + delta }))}
	>
		{#snippet empty()}
			{#if data.params.q || data.params.status}
				<!-- Con filtros activos: escape a la lista limpia. -->
				<EmptyState
					title={m.admin_products_empty_filtered_title()}
					text={m.admin_products_empty_filtered_text()}
				>
					<a
						href={listHref}
						class="rounded bg-(--app-active-bg) px-4 py-2 text-[13px] font-semibold text-(--app-text) no-underline transition-opacity hover:opacity-80"
					>
						{m.admin_products_empty_filtered_cta()}
					</a>
				</EmptyState>
			{:else}
				<!-- Sin productos nunca: CTA de creación. -->
				<EmptyState title={m.admin_products_empty_title()} text={m.admin_products_empty_text()}>
					<a
						href={newHref}
						class="rounded bg-(--app-primary) px-4 py-2 text-[13px] font-semibold text-white no-underline transition-opacity hover:opacity-90"
					>
						{m.admin_products_empty_cta()}
					</a>
				</EmptyState>
			{/if}
		{/snippet}
	</DataTable>
</Card>
