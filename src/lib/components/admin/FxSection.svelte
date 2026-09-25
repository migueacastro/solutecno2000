<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { toasts } from '$lib/stores/toast.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/admin/EmptyState.svelte';
	import ApiKeyModal from '$lib/components/admin/ApiKeyModal.svelte';
	import FxHistoryModal from '$lib/components/admin/FxHistoryModal.svelte';
	import { callAction } from '$lib/admin/actions';
	import { errorMessage } from '$lib/i18n/errors';
	import type { FxProviderHealth, FxSnapshot, HistorySeries } from '$lib/fx';

	/**
	 * Sección FX de Ajustes: tasas del proveedor activo (tabla plana, ~9
	 * filas), proveedores con failover (toggle, hacer principal) y la API
	 * key de cada proveedor (password, se guarda en fx_provider_keys sin
	 * redeploy). Los handlers usan el patrón activateTheme: callAction →
	 * invalidateAll → toast. La sync y los toggles los ejecuta
	 * $lib/server/fx (cooldown, locks y cuota); aquí solo se refleja el
	 * snapshot.
	 */
	let { fx, history = [] }: { fx: FxSnapshot | null; history?: HistorySeries[] } = $props();

	let ratesOpen = $state(false);
	let providersOpen = $state(false);
	let syncing = $state(false);
	let busyProviderId = $state<string | null>(null);

	/** Proveedor con el modal de API key abierto (null = cerrado). */
	let keyModalFor = $state<string | null>(null);
	let savingKey = $state(false);

	/** true mientras el modal del histórico FX está abierto. */
	let historyOpen = $state(false);

	const activeProvider = $derived(
		fx?.providers.find((provider) => provider.id === fx.activeProviderId) ?? null
	);

	/** Proveedor cuyo modal de API key está abierto (para el título). */
	const keyModalProvider = $derived(
		keyModalFor ? (fx?.providers.find((provider) => provider.id === keyModalFor) ?? null) : null
	);

	// Tasas en orden estable: oficial primero, luego P2P; por divisa base.
	const sortedRates = $derived(
		(fx?.rates ?? []).slice().sort((a, b) => {
			const kind = a.marketKind === b.marketKind ? 0 : a.marketKind === 'official' ? -1 : 1;
			return kind || a.marketName.localeCompare(b.marketName) || a.base.localeCompare(b.base);
		})
	);

	/** Título del badge de estado del snapshot (activo sin key = sin datos). */
	const statusBadge = $derived.by(() => {
		if (activeProvider?.apiKeyMissing) {
			return { text: m.admin_fx_badge_no_key(), tone: 'warning' as const };
		}
		return fx?.stale
			? { text: m.admin_fx_badge_stale(), tone: 'caution' as const }
			: { text: m.admin_fx_badge_fresh(), tone: 'success' as const };
	});

	/** Hace la sync forzada (el server aplica cooldown de 60 s). */
	async function syncRates(): Promise<void> {
		if (syncing) return;
		syncing = true;
		try {
			const response = await callAction('syncFx', {});
			if (!response.ok) {
				toasts.push(
					'critical',
					m.admin_toast_fx_sync_failed({ error: response.error ?? m.admin_errors_unexpected() })
				);
				return;
			}
			await invalidateAll();
			toasts.push('success', m.admin_toast_fx_synced());
		} finally {
			syncing = false;
		}
	}

	/** Toggle de un proveedor (el server rechaza dejar la lista sin activos). */
	async function toggleProvider(provider: FxProviderHealth): Promise<void> {
		if (busyProviderId) return;
		busyProviderId = provider.id;
		try {
			const response = await callAction('toggleFxProvider', {
				providerId: provider.id,
				// 'on' = activar; string vacío = desactivar (checkbox sin check).
				enabled: provider.enabled ? '' : 'on'
			});
			if (!response.ok) {
				toasts.push('critical', response.error ?? m.admin_errors_unexpected());
				return;
			}
			await invalidateAll();
			toasts.push('success', m.admin_toast_fx_provider_updated());
		} finally {
			busyProviderId = null;
		}
	}

	/** Cambia el primario (2 updates con restauración si falla el segundo). */
	async function makePrimary(provider: FxProviderHealth): Promise<void> {
		if (busyProviderId) return;
		busyProviderId = provider.id;
		try {
			const response = await callAction('setPrimaryFxProvider', { providerId: provider.id });
			if (!response.ok) {
				toasts.push('critical', response.error ?? m.admin_errors_unexpected());
				return;
			}
			await invalidateAll();
			toasts.push('success', m.admin_toast_fx_provider_updated());
		} finally {
			busyProviderId = null;
		}
	}

	/**
	 * Guarda la API key del proveedor. true cierra el modal (keyModalFor =
	 * null aquí: el modal se abre/cierra con el estado del padre); false lo
	 * deja abierto tras un error.
	 */
	async function saveKey(provider: FxProviderHealth, apiKey: string): Promise<boolean> {
		if (!apiKey) return true;
		savingKey = true;
		try {
			const response = await callAction('setApiKeyFxProvider', { providerId: provider.id, apiKey });
			if (!response.ok) {
				toasts.push('critical', response.error ?? m.admin_errors_unexpected());
				return false;
			}
			keyModalFor = null;
			await invalidateAll();
			toasts.push('success', m.admin_toast_fx_key_saved());
			return true;
		} finally {
			savingKey = false;
		}
	}

	// ── Formato (locale vivo por request) ─────────────────────────────────

	function formatRate(rate: number): string {
		return new Intl.NumberFormat(getLocale(), {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(rate);
	}

	function formatPercentage(change: number): string {
		return new Intl.NumberFormat(getLocale(), {
			style: 'percent',
			maximumFractionDigits: 2
		}).format(change / 100);
	}

	/** Hace 12 h → "hace 12 horas", null → "Nunca". */
	function relativeTime(iso: string | null): string {
		if (!iso) return m.admin_fx_never();
		const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
		const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
		if (diffMin < 60) return rtf.format(-Math.max(diffMin, 1), 'minute');
		if (diffMin < 60 * 24) return rtf.format(-Math.round(diffMin / 60), 'hour');
		return rtf.format(-Math.round(diffMin / (60 * 24)), 'day');
	}

	/** Tono y símbolo de la tendencia (▲/▼/—). */
	function trendFor(change: number | null): { symbol: string; tone: string } {
		if (change === null) return { symbol: '—', tone: 'text-(--app-text-muted)' };
		if (change > 0) return { symbol: '▲', tone: 'text-(--app-tone-success-text)' };
		if (change < 0) return { symbol: '▼', tone: 'text-(--app-tone-critical-text)' };
		return { symbol: '—', tone: 'text-(--app-text-muted)' };
	}

	/** Badge del último status del proveedor. */
	function statusFor(provider: FxProviderHealth): {
		text: string;
		tone: 'success' | 'critical' | 'neutral';
	} {
		if (provider.lastStatus === 'ok') return { text: m.admin_fx_status_ok(), tone: 'success' };
		if (provider.lastStatus === 'error')
			return { text: m.admin_fx_status_error(), tone: 'critical' };
		return { text: m.admin_fx_status_unknown(), tone: 'neutral' };
	}
</script>

{#if !fx}
	<!-- Sin supabase en locals (edge case del load): estado vacío único. -->
	<EmptyState title={m.admin_fx_empty_title()} text={m.admin_fx_empty_text()} />
{:else}
	<div class="flex flex-col gap-6">
		<!-- ── Grupo: Tasas ── -->
		<Card
			id="card-fx-rates"
			class="p-5"
			expandable
			bind:expanded={ratesOpen}
			title={m.admin_fx_card_rates()}
			subtitle={m.admin_fx_subtitle({ provider: activeProvider?.name ?? '' })}
		>
			<!-- Badge de frescura + sync manual (secondary; el server aplica
				cooldown). FUERA del {#if}: con la tabla aún vacía es la única
				manera de probar la API key recién guardada. -->
			<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-wrap items-center gap-2">
					<Badge tone={statusBadge.tone} size="sm">{statusBadge.text}</Badge>
					<span class="text-[12px] text-(--app-text-muted)">
						{m.admin_fx_last_sync()}: {relativeTime(fx.syncedAt)}
					</span>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<Button variant="secondary" size="sm" onclick={() => (historyOpen = true)}>
						{m.admin_fx_history()}
					</Button>
					<Button variant="secondary" size="sm" onclick={syncRates} disabled={syncing}>
						{syncing ? m.admin_fx_syncing() : m.admin_fx_sync()}
					</Button>
				</div>
			</div>

			{#if sortedRates.length === 0}
				<EmptyState
					title={m.admin_fx_empty_title()}
					text={fx.errorKey ? errorMessage(fx.errorKey) : m.admin_fx_rates_empty()}
				/>
			{:else}
				<!-- Tabla plana (desktop); lista apilada en móvil, como DataTable. -->
				<table class="hidden w-full border-collapse text-left sm:table">
					<thead>
						<tr class="border-b border-(--app-border)">
							<th
								scope="col"
								class="px-4 py-3 text-[12px] font-semibold tracking-wide text-(--app-text-muted) uppercase"
							>
								{m.admin_fx_col_pair()}
							</th>
							<th
								scope="col"
								class="px-4 py-3 text-[12px] font-semibold tracking-wide text-(--app-text-muted) uppercase"
							>
								{m.admin_fx_col_market()}
							</th>
							<th
								scope="col"
								class="px-4 py-3 text-right text-[12px] font-semibold tracking-wide text-(--app-text-muted) uppercase"
							>
								{m.admin_fx_col_rate()}
							</th>
							<th
								scope="col"
								class="px-4 py-3 text-[12px] font-semibold tracking-wide text-(--app-text-muted) uppercase"
							>
								{m.admin_fx_col_trend()}
							</th>
							<th
								scope="col"
								class="px-4 py-3 text-[12px] font-semibold tracking-wide text-(--app-text-muted) uppercase"
							>
								{m.admin_fx_col_date()}
							</th>
							<th
								scope="col"
								class="px-4 py-3 text-[12px] font-semibold tracking-wide text-(--app-text-muted) uppercase"
							>
								{m.admin_fx_col_fetched()}
							</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedRates as rate (rate.market + rate.base + rate.tradeType)}
							{@const trend = trendFor(rate.changePercentage)}
							<tr class="border-b border-(--app-border) last:border-b-0 hover:bg-black/2">
								<td class="px-4 py-3 text-[13px] font-medium text-(--app-text)">
									{rate.base}/{rate.quote}
								</td>
								<td class="px-4 py-3 text-[13px] text-(--app-text)">
									<div class="flex items-center gap-2">
										<span>{rate.marketName}</span>
										<Badge tone={rate.marketKind === 'official' ? 'info' : 'neutral'} size="sm">
											{rate.marketKind === 'official'
												? m.admin_fx_market_official()
												: m.admin_fx_market_p2p()}
										</Badge>
									</div>
								</td>
								<td class="px-4 py-3 text-right text-[13px] text-(--app-text)">
									{formatRate(rate.rate)}
								</td>
								<td
									class="px-4 py-3 text-[13px] {trend.tone}"
									title={rate.changePercentage === null
										? m.admin_fx_trend_flat()
										: rate.changePercentage > 0
											? m.admin_fx_trend_up()
											: m.admin_fx_trend_down()}
								>
									{trend.symbol}
									{rate.changePercentage === null ? '' : formatPercentage(rate.changePercentage)}
								</td>
								<td class="px-4 py-3 text-[13px] text-(--app-text-muted)">{rate.apiDate ?? '—'}</td>
								<td class="px-4 py-3 text-[13px] text-(--app-text-muted)">
									{relativeTime(rate.fetchedAt)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>

				<!-- Móvil: lista apilada con las mismas columnas en pares clave/valor. -->
				<ul class="flex flex-col divide-y divide-(--app-border) sm:hidden">
					{#each sortedRates as rate (rate.market + rate.base + rate.tradeType)}
						{@const trend = trendFor(rate.changePercentage)}
						<li class="flex flex-col gap-1 px-4 py-3">
							<div class="flex items-center justify-between gap-2">
								<span class="text-[14px] font-medium text-(--app-text)">
									{rate.base}/{rate.quote}
								</span>
								<Badge tone={rate.marketKind === 'official' ? 'info' : 'neutral'} size="sm">
									{rate.marketKind === 'official'
										? m.admin_fx_market_official()
										: m.admin_fx_market_p2p()}
								</Badge>
							</div>
							<div class="flex items-center justify-between gap-2 text-[13px]">
								<span class="text-(--app-text-muted)">{m.admin_fx_col_rate()}</span>
								<span class="text-(--app-text)">{formatRate(rate.rate)}</span>
							</div>
							<div class="flex items-center justify-between gap-2 text-[13px]">
								<span class="text-(--app-text-muted)">{m.admin_fx_col_trend()}</span>
								<span class={trend.tone}>
									{trend.symbol}
									{rate.changePercentage === null ? '' : formatPercentage(rate.changePercentage)}
								</span>
							</div>
							<div class="flex items-center justify-between gap-2 text-[13px]">
								<span class="text-(--app-text-muted)">{m.admin_fx_col_fetched()}</span>
								<span class="text-(--app-text)">{relativeTime(rate.fetchedAt)}</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>

		<!-- ── Grupo: Proveedores ── -->
		<Card
			id="card-fx-providers"
			class="p-5"
			expandable
			bind:expanded={providersOpen}
			title={m.admin_fx_card_providers()}
		>
			<ul class="mt-4 flex flex-col divide-y divide-(--app-border)">
				{#each fx.providers as provider (provider.id)}
					{@const status = statusFor(provider)}
					<li class="flex flex-col gap-3 py-3 first:pt-0">
						<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<span class="truncate text-[13px] font-semibold text-(--app-text)">
										{provider.name}
									</span>
									{#if provider.isPrimary}
										<Badge tone="info" size="sm">{m.admin_fx_badge_primary()}</Badge>
									{/if}
									<Badge tone={provider.enabled ? 'success' : 'neutral'} size="sm">
										{provider.enabled ? m.admin_fx_badge_active() : m.admin_fx_badge_inactive()}
									</Badge>
									<Badge tone={status.tone} size="sm">{status.text}</Badge>
									{#if provider.apiKeyMissing}
										<Badge tone="warning" size="sm">{m.admin_fx_badge_no_key()}</Badge>
									{/if}
								</div>
								<p class="mt-1 text-[12px] text-(--app-text-muted)">
									{m.admin_fx_last_sync()}: {relativeTime(provider.lastSyncedAt)}
									{#if provider.lastError}
										· {provider.lastError}
									{/if}
								</p>
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<Button
									variant="secondary"
									size="sm"
									onclick={() => toggleProvider(provider)}
									disabled={busyProviderId === provider.id}
								>
									{provider.enabled ? m.admin_fx_deactivate() : m.admin_fx_activate()}
								</Button>
								<Button
									variant="secondary"
									size="sm"
									onclick={() => makePrimary(provider)}
									disabled={busyProviderId === provider.id || provider.isPrimary}
								>
									{m.admin_fx_make_primary()}
								</Button>
								<!-- Alta/edición de la API key: abre el modal (el draft
									nace vacío allí; el valor nunca vuelve al cliente). -->
								<Button variant="secondary" size="sm" onclick={() => (keyModalFor = provider.id)}>
									{provider.apiKeyMissing ? m.admin_fx_key_add() : m.admin_fx_key_edit()}
								</Button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</Card>
	</div>

	<!-- Modal de API key: montado fuera de los {#if} para que la transición
		de cierre funcione (onSave=false deja el modal abierto tras un error). -->
	<ApiKeyModal
		open={keyModalFor !== null}
		providerName={keyModalProvider?.name ?? ''}
		busy={savingKey}
		onSave={async (apiKey) => (keyModalProvider ? saveKey(keyModalProvider, apiKey) : true)}
		onCancel={() => (keyModalFor = null)}
	/>

	<!-- Modal del histórico (solo lectura): series del proveedor activo. -->
	<FxHistoryModal
		open={historyOpen}
		providerName={activeProvider?.name ?? ''}
		{history}
		onClose={() => (historyOpen = false)}
	/>
{/if}
