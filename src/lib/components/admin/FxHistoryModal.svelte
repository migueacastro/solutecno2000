<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Select from '$lib/components/ui/Select.svelte';
	import Modal from './Modal.svelte';
	import LineChart from './LineChart.svelte';
	import type { HistorySeries } from '$lib/fx';

	/**
	 * Modal con el histórico de tasas del proveedor activo (fx_rate_history):
	 * un Select para elegir la serie (mercado + par) y el LineChart estilo
	 * Polaris con la tasa en el tiempo. Solo lectura: los datos ya vienen del
	 * load (getRateHistory); si no hay puntos, EmptyState inline.
	 */
	let {
		open,
		providerName,
		history,
		onClose
	}: {
		open: boolean;
		providerName: string;
		history: HistorySeries[];
		onClose: () => void;
	} = $props();

	// Serie seleccionada como string (value del Select, índice en history).
	let seriesValue = $state('0');

	// Al abrir, seleccionar la primera serie con puntos (si hay).
	$effect(() => {
		if (open) {
			const first = history.findIndex((series) => series.points.length > 0);
			seriesValue = String(Math.max(first, 0));
		}
	});

	const currentIndex = $derived(
		Math.min(Number(seriesValue) || 0, Math.max(history.length - 1, 0))
	);
	const current = $derived(history[currentIndex] ?? null);

	const options = $derived(
		history.map((series, index) => ({
			value: String(index),
			label: `${series.base}/${series.quote} · ${series.marketName}`
		}))
	);

	const chartSeries = $derived(
		current
			? [
					{
						label: `${current.base}/${current.quote}`,
						// Token de color informativo (el azul de acciones/info Polaris).
						color: 'var(--app-tone-info-text)',
						points: current.points.map((point) => ({
							x: Date.parse(point.fetchedAt),
							y: point.rate
						}))
					}
				]
			: []
	);

	function formatRate(value: number): string {
		return new Intl.NumberFormat(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);
	}
</script>

<Modal {open} title={m.admin_fx_history_title({ provider: providerName })} size="lg" {onClose}>
	{#if history.length === 0 || options.length === 0}
		<p class="mt-4 text-[13px] text-(--app-text-muted)">{m.admin_fx_history_empty()}</p>
	{:else}
		<div class="mt-4">
			<Select
				id="fx-history-series"
				label={m.admin_fx_history_series()}
				bind:value={seriesValue}
				{options}
			/>
			<p class="mt-1 text-[12px] text-(--app-text-muted)">{m.admin_fx_history_help()}</p>
		</div>
		<div class="mt-4">
			<LineChart series={chartSeries} formatY={formatRate} />
		</div>
	{/if}
</Modal>
