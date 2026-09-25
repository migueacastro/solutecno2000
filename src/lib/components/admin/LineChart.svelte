<script lang="ts">
	/**
	 * Gráfico de líneas estilo Polaris (SVG puro, sin librerías) para las
	 * series del histórico FX. Inspirado en los charts de Shopify Polaris:
	 * grid horizontal con ticks "nice", línea + área suave y tooltip en hover
	 * con guía vertical. Los colores van por token (--app-*) via inline style.
	 *
	 * Responsivo: viewBox fijo (el SVG escala con w-full) y height prop para
	 * el aspecto. Los ejes asumen points ordenados por x ascendente.
	 */
	type ChartPoint = { x: number; y: number };
	type ChartSeries = { label: string; color: string; points: ChartPoint[] };

	let {
		series,
		height = 220,
		formatY = (value: number) => String(value),
		formatX = (ms: number) =>
			new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(new Date(ms))
	}: {
		series: ChartSeries[];
		height?: number;
		/** Formatea el valor del eje Y y del tooltip. */
		formatY?: (value: number) => string;
		/** Formatea el instante (ms epoch) del eje X y del tooltip. */
		formatX?: (ms: number) => string;
	} = $props();

	// Geometría: viewBox fijo, el navegador escala; PAD reserva ejes/labels.
	// H es derived porque height es una prop (puede cambiar en runtime).
	const W = 640;
	const PAD = { top: 12, right: 16, bottom: 28, left: 56 };
	const INNER_W = W - PAD.left - PAD.right;
	const H = $derived(height);
	const INNER_H = $derived(H - PAD.top - PAD.bottom);

	// Escalas derivadas de los datos (todos los series comparten dominio).
	const points = $derived(series.flatMap((s) => s.points));

	const yDomain = $derived.by(() => {
		const ys = points.map((p) => p.y);
		if (ys.length === 0) return { min: 0, max: 1, step: 1 };
		let min = Math.min(...ys);
		let max = Math.max(...ys);
		if (min === max) {
			// Dominio plano: expandir ±1 (o ±10% para valores chicos) para que
			// la línea no colapse a y=0 y el grid tenga rango.
			const spread = Math.max(Math.abs(min) * 0.1, 1);
			min -= spread;
			max += spread;
		}
		// Tick "nice": 1/2/5 × 10^exp que divida el rango en ~4 partes.
		const range = max - min;
		const exp = Math.floor(Math.log10(range / 4 || 1));
		const frac = range / 4 / 10 ** exp;
		const base = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
		const step = base * 10 ** exp;
		return {
			min: Math.floor(min / step) * step,
			max: Math.ceil(max / step) * step,
			step
		};
	});

	const yTicks = $derived.by(() => {
		const ticks: number[] = [];
		for (let v = yDomain.min; v <= yDomain.max + 1e-9; v += yDomain.step) ticks.push(v);
		return ticks;
	});

	function scaleX(x: number, min: number, max: number): number {
		if (max <= min) return PAD.left + INNER_W / 2;
		return PAD.left + ((x - min) / (max - min)) * INNER_W;
	}

	function scaleY(y: number): number {
		if (yDomain.max <= yDomain.min) return PAD.top + INNER_H / 2;
		return PAD.top + INNER_H - ((y - yDomain.min) / (yDomain.max - yDomain.min)) * INNER_H;
	}

	// Etiquetas del eje X: primero / medio / último (fechas se pisan si son
	// una por punto; 3 anclas es lo legible en un SVG de este tamaño).
	const xTicks = $derived.by(() => {
		if (points.length === 0) return [];
		const xs = points.map((p) => p.x);
		const min = Math.min(...xs);
		const max = Math.max(...xs);
		const anchors = [min, (min + max) / 2, max];
		return [...new Set(anchors)];
	});

	// Hover: punto más cercano al pointer (por x) con su serie. Solo una
	// serie a la vez se inspecciona: el chart del histórico es de 1 serie.
	let hovered = $state<{
		x: number;
		y: number;
		label: string;
		color: string;
		value: number;
	} | null>(null);

	function handlePointerMove(event: PointerEvent, target: ChartSeries): void {
		if (target.points.length === 0) return;
		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		// De coords de pantalla a coords del viewBox (el SVG escala).
		const vx = ((event.clientX - rect.left) / rect.width) * W;
		let nearest = target.points[0];
		for (const point of target.points) {
			const px = scaleX(point.x, domainMin(), domainMax());
			const nx = scaleX(nearest.x, domainMin(), domainMax());
			if (Math.abs(px - vx) < Math.abs(nx - vx)) nearest = point;
		}
		hovered = {
			x: scaleX(nearest.x, domainMin(), domainMax()),
			y: scaleY(nearest.y),
			label: formatX(nearest.x),
			color: target.color,
			value: nearest.y
		};
	}

	function domainMin(): number {
		const xs = points.map((p) => p.x);
		return xs.length > 0 ? Math.min(...xs) : 0;
	}

	function domainMax(): number {
		const xs = points.map((p) => p.x);
		return xs.length > 0 ? Math.max(...xs) : 1;
	}

	// Tooltip SVG (foreignObject evita medir texto): ancla clampeada para no
	// salirse del canvas. La caja es ~140×34 en coords del viewBox.
	const tooltipX = $derived(
		hovered ? Math.min(Math.max(hovered.x, PAD.left + 70), W - PAD.right - 70) : 0
	);

	function pathFor(target: ChartSeries): string {
		return target.points
			.map(
				(point, i) =>
					`${i === 0 ? 'M' : 'L'}${scaleX(point.x, domainMin(), domainMax()).toFixed(1)} ${scaleY(point.y).toFixed(1)}`
			)
			.join(' ');
	}

	function areaFor(target: ChartSeries): string {
		if (target.points.length === 0) return '';
		const first = target.points[0];
		const last = target.points[target.points.length - 1];
		const bottom = PAD.top + INNER_H;
		return `${pathFor(target)} L${scaleX(last.x, domainMin(), domainMax()).toFixed(1)} ${bottom} L${scaleX(first.x, domainMin(), domainMax()).toFixed(1)} ${bottom} Z`;
	}
</script>

{#if series.length === 0 || points.length === 0}
	<div class="py-10 text-center text-[13px] text-(--app-text-muted)">—</div>
{:else}
	<svg
		viewBox="0 0 {W} {H}"
		role="img"
		class="w-full touch-none select-none"
		onpointermove={(e) => handlePointerMove(e, series[0])}
		onpointerleave={() => (hovered = null)}
	>
		<!-- Grid horizontal + labels Y -->
		{#each yTicks as tick (tick)}
			<line
				x1={PAD.left}
				x2={W - PAD.right}
				y1={scaleY(tick)}
				y2={scaleY(tick)}
				class="stroke-(--app-border)"
				stroke-width="1"
			/>
			<text
				x={PAD.left - 8}
				y={scaleY(tick) + 3}
				text-anchor="end"
				class="fill-(--app-text-muted)"
				font-size="10"
			>
				{formatY(tick)}
			</text>
		{/each}

		<!-- Labels X: primero / medio / último -->
		{#each xTicks as tick (tick)}
			<text
				x={scaleX(tick, domainMin(), domainMax())}
				y={H - 8}
				text-anchor="middle"
				class="fill-(--app-text-muted)"
				font-size="10"
			>
				{formatX(tick)}
			</text>
		{/each}

		<!-- Área + línea (una serie para el histórico; la paleta soporta más) -->
		{#each series as target (target.label)}
			<path d={areaFor(target)} fill={target.color} opacity="0.1" />
			<path
				d={pathFor(target)}
				fill="none"
				stroke={target.color}
				stroke-width="2"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		{/each}

		<!-- Hover: guía vertical + dot + tooltip -->
		{#if hovered}
			<line
				x1={hovered.x}
				x2={hovered.x}
				y1={PAD.top}
				y2={PAD.top + INNER_H}
				class="stroke-(--app-border)"
				stroke-width="1"
				stroke-dasharray="3 3"
			/>
			<circle cx={hovered.x} cy={hovered.y} r="4" fill={hovered.color} />
			<circle cx={hovered.x} cy={hovered.y} r="2.5" class="fill-(--app-surface)" />
			<g>
				<rect
					x={tooltipX - 70}
					y={Math.max(hovered.y - 44, PAD.top)}
					width="140"
					height="34"
					class="fill-(--app-surface)"
					style="stroke: var(--app-border); border-radius: 6px;"
					rx="6"
				/>
				<text
					x={tooltipX}
					y={Math.max(hovered.y - 44, PAD.top) + 13}
					text-anchor="middle"
					class="fill-(--app-text-muted)"
					font-size="9"
				>
					{hovered.label}
				</text>
				<text
					x={tooltipX}
					y={Math.max(hovered.y - 44, PAD.top) + 27}
					text-anchor="middle"
					class="fill-(--app-text)"
					font-size="11"
					font-weight="600"
				>
					{formatY(hovered.value)}
				</text>
			</g>
		{/if}
	</svg>
{/if}
