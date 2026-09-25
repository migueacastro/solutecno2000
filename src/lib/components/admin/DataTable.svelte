<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	/**
	 * Tabla de entidades estilo Polaris index table, 100% presentacional:
	 * rows/total/page/sort llegan del `data` tras invalidateAll; los cambios
	 * de orden y página se emiten como strings (`'campo-asc'`) y el caller
	 * los traduce a URL. Doble markup (tabla desktop + lista móvil) que
	 * reutiliza los mismos snippets de celda.
	 */

	type Column<T> = {
		key: string;
		header: string;
		/** Ordenable por click en el header. */
		sortable?: boolean;
		/** Alineación right para money/números. */
		align?: 'left' | 'right';
		/** En móvil es la línea principal de la fila apilada. */
		primary?: boolean;
		/** Se omite en el markup móvil. */
		hideOnMobile?: boolean;
		cell: Snippet<[T]>;
	};

	type Props<T> = {
		columns: Column<T>[];
		rows: T[];
		/** Identificador estable para `#each` (slug, id...). */
		rowKey: (row: T) => string;
		loading?: boolean;
		/** Estado de orden controlado: `'campo-asc'` | `'campo-desc'` | null. */
		sort?: string | null;
		/** Emite el próximo estado de orden ('campo-dir') tras el toggle. */
		onSort?: (next: string) => void;
		page?: number;
		pageSize?: number;
		hasPrevious?: boolean;
		hasNext?: boolean;
		total?: number;
		onPage?: (delta: 1 | -1) => void;
		/** Estado vacío del caller (con CTAs); solo se muestra sin filas. */
		empty?: Snippet;
		class?: string;
	};

	let {
		columns,
		rows,
		rowKey,
		loading = false,
		sort = null,
		onSort,
		page = 1,
		pageSize = 25,
		hasPrevious = false,
		hasNext = false,
		total = 0,
		onPage,
		empty,
		class: cls = ''
	}: Props<T> = $props();

	/** Toggle null → asc → desc → asc (nunca vuelve a null: el default del server). */
	function toggleSort(column: Column<T>): void {
		const dir = sort === `${column.key}-asc` ? 'desc' : 'asc';
		onSort?.(`${column.key}-${dir}`);
	}

	function sortIndicator(column: Column<T>): string {
		if (sort === `${column.key}-asc`) return '<path d="m18 15-6-6-6 6" />';
		if (sort === `${column.key}-desc`) return '<path d="m6 9 6 6 6-6" />';
		return '<path d="m7 10 5-5 5 5" /><path d="m7 14 5 5 5-5" />';
	}

	const visibleColumns = $derived(columns.filter((c) => !c.hideOnMobile));

	/** Filas del skeleton (evita el each con índice sin usar). */
	const SKELETON_ROWS = [0, 1, 2, 3, 4];
</script>

<!-- Desktop: tabla real desde 640px. -->
<table class="hidden w-full border-collapse text-left sm:table {cls}">
	<thead>
		<tr class="border-b border-(--app-border)">
			{#each columns as column (column.key)}
				<th
					scope="col"
					aria-sort={sort === `${column.key}-asc`
						? 'ascending'
						: sort === `${column.key}-desc`
							? 'descending'
							: undefined}
					class="px-4 py-3 text-[12px] font-semibold tracking-wide text-(--app-text-muted) uppercase {column.align ===
					'right'
						? 'text-right'
						: ''}"
				>
					{#if column.sortable}
						<button
							type="button"
							class="inline-flex cursor-pointer items-center gap-1 hover:text-(--app-text)"
							onclick={() => toggleSort(column)}
						>
							{column.header}
							<Icon paths={sortIndicator(column)} size={14} />
						</button>
					{:else}
						{column.header}
					{/if}
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#if loading}
			<!-- Skeleton: 5 filas con barras pulsantes en cada columna. -->
			{#each SKELETON_ROWS as i (i)}
				<tr class="border-b border-(--app-border)">
					{#each columns as column (column.key)}
						<td class="px-4 py-3">
							<div class="h-4 w-3/4 animate-pulse rounded bg-(--app-active-bg)"></div>
						</td>
					{/each}
				</tr>
			{/each}
		{:else}
			{#each rows as row (rowKey(row))}
				<tr class="border-b border-(--app-border) last:border-b-0 hover:bg-black/2">
					{#each columns as column (column.key)}
						<td
							class="px-4 py-3 text-[13px] text-(--app-text) {column.align === 'right'
								? 'text-right'
								: ''}"
						>
							{@render column.cell(row)}
						</td>
					{/each}
				</tr>
			{/each}
		{/if}
	</tbody>
</table>

<!-- Móvil: lista apilada (< 640px); misma celdas, sin hideOnMobile. -->
<ul class="flex flex-col divide-y divide-(--app-border) sm:hidden {cls}">
	{#if loading}
		{#each SKELETON_ROWS as i (i)}
			<li class="flex flex-col gap-1 px-4 py-3">
				<div class="h-4 w-2/3 animate-pulse rounded bg-(--app-active-bg)"></div>
				<div class="h-3 w-1/3 animate-pulse rounded bg-(--app-active-bg)"></div>
			</li>
		{/each}
	{:else}
		{#each rows as row (rowKey(row))}
			<li class="flex flex-col gap-1 px-4 py-3">
				<!-- Primary: la celda destacada se muestra tal cual (link, etc.). -->
				{#each visibleColumns.filter((c) => c.primary) as column (column.key)}
					<div class="text-[14px] font-medium text-(--app-text)">
						{@render column.cell(row)}
					</div>
				{/each}
				<!-- Resto: "header: valor" en muted. -->
				{#each visibleColumns.filter((c) => !c.primary) as column (column.key)}
					<div class="text-[13px] text-(--app-text-muted)">
						{column.header}: <span class="text-(--app-text)">{@render column.cell(row)}</span>
					</div>
				{/each}
			</li>
		{/each}
	{/if}
</ul>

{#if !loading && rows.length === 0 && empty}
	{@render empty()}
{:else if !loading && rows.length > 0 && total > 0}
	<footer class="flex items-center justify-between gap-4 border-t border-(--app-border) px-4 py-3">
		<p class="text-[13px] text-(--app-text-muted)">
			{m.admin_pagination_showing({
				from: (page - 1) * pageSize + 1,
				to: Math.min(page * pageSize, total),
				total
			})}
		</p>
		<div class="flex gap-2">
			<Button
				variant="secondary"
				size="sm"
				class="text-[13px]"
				onclick={() => onPage?.(-1)}
				disabled={!hasPrevious}
			>
				<Icon paths="<path d='m15 18-6-6 6-6' />" size={16} />
				<span class="sr-only">{m.admin_pagination_previous()}</span>
			</Button>
			<Button
				variant="secondary"
				size="sm"
				class="text-[13px]"
				onclick={() => onPage?.(1)}
				disabled={!hasNext}
			>
				<Icon paths="<path d='m9 18 6-6-6-6' />" size={16} />
				<span class="sr-only">{m.admin_pagination_next()}</span>
			</Button>
		</div>
	</footer>
{/if}
