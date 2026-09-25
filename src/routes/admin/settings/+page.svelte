<script lang="ts">
	import type { PageData } from './$types';
	import { untrack, tick } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import { toasts } from '$lib/stores/toast.svelte';
	import SaveBar from '$lib/components/admin/SaveBar.svelte';
	import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
	import ThemePreview from '$lib/components/admin/ThemePreview.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import FileButton from '$lib/components/ui/FileButton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SearchBar from '$lib/components/ui/SearchBar.svelte';
	import { searchLocal } from '$lib/search';
	import { settingsSearchItems } from '$lib/search/settings-items';
	import type { SearchItem, SearchSource } from '$lib/search/types';
	import { errorMessage } from '$lib/i18n/errors';
	import {
		APP_TOKEN_DEFAULTS,
		APP_TOKEN_DARK_DEFAULTS,
		completeTokens,
		validateTokens,
		type AppThemeTokens
	} from '$lib/config/theme';

	/**
	 * Settings: grupo Brand (nombre, logo, favicon) y grupo Theme (presets +
	 * clones, editor de tokens JSON con modo claro y oscuro separados). Cada
	 * grupo usa estado borrador con dirty-tracking; un SaveBar único
	 * guarda/descarta ambos.
	 */
	let { data }: { data: PageData } = $props();

	type Theme = {
		id: string;
		slug: string;
		name: string;
		tokens_light: AppThemeTokens;
		tokens_dark: AppThemeTokens;
		is_preset: boolean;
	};

	// ── helpers de acción ──────────────────────────────────────────────────

	type ActionResponse = { ok: boolean; error?: string; newId?: string };

	/** POST a un ?/action y extracción del resultado (sin form ni enhance).
	 *  El server devuelve claves de error (errorKey); aquí se traducen. */
	async function callAction(
		name: string,
		fields: Record<string, string | File>
	): Promise<ActionResponse> {
		const body = new FormData();
		for (const [key, value] of Object.entries(fields)) body.append(key, value);

		const res = await fetch(`?/${name}`, { method: 'POST', body });
		if (!res.ok) return { ok: false, error: m.admin_errors_http({ status: res.status }) };

		const action = (await res.json()) as {
			type: string;
			data?: Record<string, { errorKey?: string; newId?: string }>;
		};
		const result = Object.values(action.data ?? {})[0];

		if (action.type === 'failure') {
			return { ok: false, error: errorMessage(result?.errorKey) };
		}
		return { ok: true, newId: result?.newId };
	}

	// ── Brand ──────────────────────────────────────────────────────────────

	const savedName = $derived(data.settings?.app_name ?? '');
	// untrack: solo interesa el valor inicial; el dirty-tracking va contra el derived.
	let nameDraft = $state(untrack(() => data.settings?.app_name ?? ''));
	const brandDirty = $derived(nameDraft.trim() !== savedName);

	async function saveBrand(): Promise<boolean> {
		const response = await callAction('saveBrand', { app_name: nameDraft });
		if (!response.ok) {
			toasts.push('critical', response.error ?? m.admin_errors_unexpected());
			return false;
		}
		return true;
	}

	// ── Themes ─────────────────────────────────────────────────────────────

	const themes = $derived((data.themes ?? []) as unknown as Theme[]);
	const activeThemeId = $derived(data.settings?.active_theme_id ?? null);

	// El tema que se edita puede ser otro distinto del activo: al elegirlo se
	// carga en el editor; "Duplicar y editar" pasa el editor al clon.
	let selectedThemeId = $state<string | null>(null);
	const selectedTheme = $derived(
		themes.find((theme) => theme.id === selectedThemeId) ??
			themes.find((theme) => theme.id === activeThemeId) ??
			themes[0] ??
			null
	);

	function pretty(tokens?: AppThemeTokens | null): string {
		return JSON.stringify(tokens ?? {}, null, 2);
	}

	// Un borrador (string JSON pretty) POR MODO. untrack: solo el valor
	// inicial; el dirty-tracking va contra el tema seleccionado.
	let lightText = $state(untrack(() => pretty(selectedTheme?.tokens_light)));
	let darkText = $state(untrack(() => pretty(selectedTheme?.tokens_dark)));

	/** Estado de un borrador: parseo, validez y forma canónica (completa y
	 *  reordenada) para comparar contra la DB sin ruido de orden. */
	function draftState(text: string, dark: boolean) {
		let parsed: unknown = null;
		try {
			parsed = JSON.parse(text);
		} catch {
			// JSON roto: parsed queda null.
		}
		const valid = validateTokens(parsed);
		return {
			parsed,
			valid,
			canonic: valid ? JSON.stringify(completeTokens(parsed as AppThemeTokens, dark)) : null
		};
	}

	const lightDraft = $derived.by(() => draftState(lightText, false));
	const darkDraft = $derived.by(() => draftState(darkText, true));

	// Sets completos para la vista previa: con borrador válido se refleja el
	// JSON (incluso parcial, completado con defaults); inválido, defaults.
	const lightPreview = $derived(
		completeTokens(lightDraft.valid ? (lightDraft.parsed as AppThemeTokens) : null, false)
	);
	const darkPreview = $derived(
		completeTokens(darkDraft.valid ? (darkDraft.parsed as AppThemeTokens) : null, true)
	);

	const tokensDirty = $derived(
		!!selectedTheme &&
			(lightDraft.canonic !== JSON.stringify(completeTokens(selectedTheme.tokens_light, false)) ||
				darkDraft.canonic !== JSON.stringify(completeTokens(selectedTheme.tokens_dark, true)))
	);

	const dirty = $derived(brandDirty || tokensDirty);

	// Error bajo cada editor: JSON roto -> json_invalid; JSON válido pero con
	// tokens fuera del vocabulario -> tokens_hex.
	const lightError = $derived(
		lightText.trim() !== '' && lightDraft.parsed === null
			? m.admin_settings_json_invalid()
			: !lightDraft.valid
				? m.admin_settings_tokens_hex()
				: undefined
	);
	const darkError = $derived(
		darkText.trim() !== '' && darkDraft.parsed === null
			? m.admin_settings_json_invalid()
			: !darkDraft.valid
				? m.admin_settings_tokens_hex()
				: undefined
	);

	async function saveTokens(): Promise<boolean> {
		if (!selectedTheme) return true;
		if (!lightDraft.valid || !darkDraft.valid) {
			toasts.push('critical', m.admin_toast_json_invalid());
			return false;
		}
		const response = await callAction('saveTokens', {
			themeId: selectedTheme.id,
			tokens_light: JSON.stringify(lightDraft.parsed),
			tokens_dark: JSON.stringify(darkDraft.parsed)
		});
		if (!response.ok) {
			toasts.push('critical', response.error ?? m.admin_errors_save_theme());
			return false;
		}
		return true;
	}

	async function save(): Promise<void> {
		saving = true;
		try {
			let ok = true;
			if (brandDirty) ok = (await saveBrand()) && ok;
			if (tokensDirty) ok = (await saveTokens()) && ok;
			if (ok) {
				await invalidateAll();
				toasts.push('success', m.admin_toast_saved());
			}
		} finally {
			saving = false;
		}
	}

	let saving = $state(false);

	function discard(): void {
		nameDraft = savedName;
		lightText = pretty(selectedTheme?.tokens_light);
		darkText = pretty(selectedTheme?.tokens_dark);
	}

	function selectTheme(next: Theme): void {
		if (selectedTheme && next.id === selectedTheme.id) return;
		// Si hay tokens sin guardar se pierden al cambiar: se avisa por si acaso.
		if (tokensDirty) toasts.push('info', m.admin_toast_discarded());
		selectedThemeId = next.id;
		lightText = pretty(next.tokens_light);
		darkText = pretty(next.tokens_dark);
	}

	async function duplicateTheme(): Promise<void> {
		if (!selectedTheme) return;
		saving = true;
		try {
			const response = await callAction('duplicateTheme', { themeId: selectedTheme.id });
			if (!response.ok || !response.newId) {
				toasts.push('critical', response.error ?? m.admin_errors_duplicate_theme());
				return;
			}
			// El clon hereda los tokens en pantalla (guardados o en borrador):
			// los textareas quedan igual, solo cambia el destino del Guardar.
			await invalidateAll();
			selectedThemeId = response.newId;
			toasts.push('success', m.admin_toast_duplicated());
		} finally {
			saving = false;
		}
	}

	async function activateTheme(): Promise<void> {
		if (!selectedTheme) return;
		if (tokensDirty) {
			toasts.push('info', m.admin_toast_save_before_activate());
			return;
		}
		saving = true;
		try {
			const response = await callAction('activateTheme', { themeId: selectedTheme.id });
			if (!response.ok) {
				toasts.push('critical', response.error ?? m.admin_errors_activate_theme());
				return;
			}
			// El load raíz relee settings: la paleta de TODA la app cambia en vivo.
			await invalidateAll();
			toasts.push('success', m.admin_toast_theme_active({ name: selectedTheme.name }));
		} finally {
			saving = false;
		}
	}

	// ── Eliminar (solo temas no preset; modal de confirmación) ────────────

	let deleteModalOpen = $state(false);
	let deleting = $state(false);

	async function confirmDelete(): Promise<void> {
		if (!selectedTheme) return;
		deleting = true;
		try {
			const response = await callAction('deleteTheme', { themeId: selectedTheme.id });
			if (!response.ok) {
				toasts.push('critical', response.error ?? m.admin_errors_delete_theme());
				return;
			}
			await invalidateAll();
			// null: el derived cae al tema activo (o al primero).
			selectedThemeId = null;
			toasts.push('success', m.admin_toast_deleted());
		} finally {
			deleting = false;
			deleteModalOpen = false;
		}
	}

	// ── Reset (modal de confirmación) ──────────────────────────────────────

	let resetModalOpen = $state(false);
	let resetting = $state(false);

	async function confirmReset(): Promise<void> {
		if (!selectedTheme) return;
		resetting = true;
		try {
			const response = await callAction('resetTokens', { themeId: selectedTheme.id });
			if (!response.ok) {
				toasts.push('critical', response.error ?? m.admin_errors_reset());
				return;
			}
			await invalidateAll();
			lightText = pretty(APP_TOKEN_DEFAULTS);
			darkText = pretty(APP_TOKEN_DARK_DEFAULTS);
			toasts.push('success', m.admin_toast_reset());
		} finally {
			resetting = false;
			resetModalOpen = false;
		}
	}

	// ── Logo / favicon ─────────────────────────────────────────────────────

	// Apertura de cada card expandible (la búsqueda las fuerza a true).
	let brandOpen = $state(true);
	let themeOpen = $state(true);
	let uploadingLogo = $state(false);
	let uploadingFavicon = $state(false);

	async function uploadFile(field: 'logo' | 'favicon', file: File): Promise<void> {
		const busy = field === 'logo' ? uploadingLogo : uploadingFavicon;
		if (busy) return;
		if (field === 'logo') uploadingLogo = true;
		else uploadingFavicon = true;

		try {
			const response = await callAction('uploadFile', { field, file });
			if (!response.ok) {
				toasts.push('critical', response.error ?? m.admin_errors_upload_file());
				return;
			}
			await invalidateAll();
			toasts.push(
				'success',
				field === 'logo' ? m.admin_toast_logo_updated() : m.admin_toast_favicon_updated()
			);
		} finally {
			if (field === 'logo') uploadingLogo = false;
			else uploadingFavicon = false;
		}
	}

	async function removeFile(field: 'logo' | 'favicon'): Promise<void> {
		const response = await callAction('removeFile', { field });
		if (!response.ok) {
			toasts.push('critical', response.error ?? m.admin_errors_remove_file());
			return;
		}
		await invalidateAll();
		toasts.push(
			'success',
			field === 'logo' ? m.admin_toast_logo_removed() : m.admin_toast_favicon_removed()
		);
	}

	// ── Búsqueda de ajustes (SearchBar, dropdown + jump) ───────────────────

	// Fuente local: el array se construye en la llamada a search (que solo
	// ocurre con input del usuario), así los labels salen con el locale vivo
	// y searchLocal preindiza por referencia de array.
	const settingsSource: SearchSource = {
		id: 'local:settings',
		search: (q) => Promise.resolve(searchLocal(q, settingsSearchItems()))
	};

	// targetId → card dueña del campo: el jump expande la card ANTES del scroll.
	const targetCard: Record<string, 'brand' | 'theme'> = {
		'app-name': 'brand',
		logo: 'brand',
		favicon: 'brand',
		'tokens-light': 'theme',
		'tokens-dark': 'theme',
		'card-brand': 'brand',
		'card-theme': 'theme'
	};

	async function jumpToSetting(item: SearchItem): Promise<void> {
		if (!item.targetId) return;
		const card = targetCard[item.targetId];
		if (card === 'brand') brandOpen = true;
		else if (card === 'theme') themeOpen = true;
		// El {#if expanded} del Card necesita un ciclo para montar el campo.
		await tick();
		const el = document.getElementById(item.targetId);
		el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
			el.focus({ preventScroll: true });
		}
	}
</script>

<header class="mb-6">
	<h1 class="text-[20px] font-semibold text-(--app-text)">{m.admin_settings_title()}</h1>
	<p class="mt-1 text-[13px] text-(--app-text-muted)">{m.admin_settings_subtitle()}</p>
	<!-- Buscador de ajustes (JSON local): elegir un resultado expande la card,
		hace scroll al campo y pone el foco (dropdown + jump). -->
	<div class="mt-4 max-w-md">
		<SearchBar
			sources={[settingsSource]}
			placeholder={m.admin_search_placeholder()}
			ariaLabel={m.admin_search_label()}
			onSelect={jumpToSetting}
		/>
	</div>
</header>

<div class="flex flex-col gap-6">
	<!-- ── Grupo: Brand ── -->
	<Card
		id="card-brand"
		class="p-5"
		expandable
		bind:expanded={brandOpen}
		title={m.admin_settings_brand_title()}
		subtitle={m.admin_settings_brand_subtitle()}
	>
		<div class="mt-4 flex flex-col gap-5">
			<TextField
				id="app-name"
				label={m.admin_settings_name_label()}
				help={m.admin_settings_name_help()}
				bind:value={nameDraft}
				maxlength={60}
				class="max-w-sm"
			/>

			<!-- Logo y favicon, uno al lado del otro; apilan en móvil. -->
			<div class="flex flex-col gap-5 sm:flex-row sm:gap-4">
				<!-- Logo -->
				<div class="min-w-0 flex-1">
					<p class="text-[13px] font-medium text-(--app-text)">{m.admin_settings_logo()}</p>
					<div class="mt-2 flex items-center gap-3">
						{#if data.settings?.logo_url}
							<img
								src={data.settings.logo_url}
								alt={m.admin_settings_logo_current()}
								class="h-10 w-10 rounded object-contain"
							/>
						{:else}
							<div
								class="flex h-10 w-10 items-center justify-center rounded bg-(--app-active-bg) text-[15px] font-bold text-(--app-text-muted)"
							>
								?
							</div>
						{/if}
						<div class="flex flex-wrap gap-2">
							<FileButton
								label={m.admin_settings_upload_logo()}
								busyLabel={m.admin_settings_uploading()}
								busy={uploadingLogo}
								accept="image/png,image/jpeg,image/webp,image/svg+xml"
								onFile={(file) => uploadFile('logo', file)}
							/>
							{#if data.settings?.logo_url}
								<Button
									variant="critical-text"
									size="sm"
									onclick={() => removeFile('logo')}
									disabled={uploadingLogo}
								>
									{m.admin_settings_remove()}
								</Button>
							{/if}
						</div>
					</div>
					<p class="mt-1 text-[12px] text-(--app-text-muted)">{m.admin_settings_formats()}</p>
				</div>

				<!-- Favicon -->
				<div class="min-w-0 flex-1">
					<p class="text-[13px] font-medium text-(--app-text)">{m.admin_settings_favicon()}</p>
					<div class="mt-2 flex items-center gap-3">
						{#if data.settings?.favicon_url}
							<img
								src={data.settings.favicon_url}
								alt={m.admin_settings_favicon_current()}
								class="h-10 w-10 rounded object-contain"
							/>
						{:else}
							<div
								class="flex h-10 w-10 items-center justify-center rounded bg-(--app-active-bg) text-[15px] font-bold text-(--app-text-muted)"
							>
								?
							</div>
						{/if}
						<div class="flex flex-wrap gap-2">
							<FileButton
								label={m.admin_settings_upload_favicon()}
								busyLabel={m.admin_settings_uploading()}
								busy={uploadingFavicon}
								accept="image/png,image/jpeg,image/webp,image/svg+xml"
								onFile={(file) => uploadFile('favicon', file)}
							/>
							{#if data.settings?.favicon_url}
								<Button
									variant="critical-text"
									size="sm"
									onclick={() => removeFile('favicon')}
									disabled={uploadingFavicon}
								>
									{m.admin_settings_remove()}
								</Button>
							{/if}
						</div>
					</div>
					<p class="mt-1 text-[12px] text-(--app-text-muted)">
						{m.admin_settings_favicon_help()}
					</p>
				</div>
			</div>
		</div>
	</Card>

	<!-- ── Grupo: Theme ── -->
	<Card
		id="card-theme"
		class="p-5"
		expandable
		bind:expanded={themeOpen}
		title={m.admin_settings_theme_title()}
		subtitle={m.admin_settings_theme_subtitle()}
	>
		<!-- Lista de temas con swatches (del modo claro). Flex-wrap en vez de
			grid: 1/2/3 columnas según ancho, sin saltos de breakpoint. -->
		<ul class="mt-4 flex flex-wrap gap-2">
			{#each themes as theme (theme.id)}
				<li class="w-full min-w-0 sm:w-[calc(50%-0.25rem)] lg:w-[calc(33.333%-0.334rem)]">
					<button
						type="button"
						class="w-full cursor-pointer rounded border p-3 text-left transition-colors {theme.id ===
						selectedTheme?.id
							? 'border-(--app-primary) bg-(--app-tone-info-bg)'
							: 'border-(--app-border) hover:bg-black/2'}"
						onclick={() => selectTheme(theme)}
					>
						<div class="flex items-center justify-between gap-2">
							<span class="truncate text-[13px] font-semibold text-(--app-text)">{theme.name}</span>
							{#if theme.is_preset}
								<Badge tone="info" size="sm" class="shrink-0"
									>{m.admin_settings_badge_preset()}</Badge
								>
							{/if}
						</div>
						<div class="mt-2 flex items-center gap-1">
							<span
								class="h-5 w-5 rounded border border-(--app-border)"
								style="background: {theme.tokens_light?.primary ?? '#000'}"
								title="primary"
							></span>
							<span
								class="h-5 w-5 rounded border border-(--app-border)"
								style="background: {theme.tokens_light?.bg ?? '#000'}"
								title="bg"
							></span>
							<span
								class="h-5 w-5 rounded border border-(--app-border)"
								style="background: {theme.tokens_light?.surface ?? '#000'}"
								title="surface"
							></span>
							{#if theme.id === activeThemeId}
								<Badge tone="success" size="sm" class="ml-2"
									>{m.admin_settings_badge_active()}</Badge
								>
							{/if}
						</div>
					</button>
				</li>
			{/each}
		</ul>

		<!-- Editor de tokens del tema seleccionado (un borrador por modo) -->
		{#if selectedTheme}
			<div class="mt-5 border-t border-(--app-border) pt-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-[13px] font-medium text-(--app-text)">
						{m.admin_settings_tokens_for({ name: selectedTheme.name })}
					</p>
					<div class="flex flex-wrap gap-2">
						<Button variant="secondary" size="sm" onclick={duplicateTheme} disabled={saving}>
							{m.admin_settings_duplicate()}
						</Button>
						<Button
							variant="secondary"
							size="sm"
							onclick={() => (resetModalOpen = true)}
							disabled={saving}
						>
							{m.admin_settings_reset()}
						</Button>
						{#if !selectedTheme.is_preset && selectedTheme.id !== activeThemeId}
							<Button
								variant="secondary"
								size="sm"
								onclick={() => (deleteModalOpen = true)}
								disabled={saving}
							>
								{m.admin_settings_delete()}
							</Button>
						{/if}
						<Button
							variant="primary"
							size="sm"
							onclick={activateTheme}
							disabled={saving || selectedTheme.id === activeThemeId}
						>
							{selectedTheme.id === activeThemeId
								? m.admin_settings_badge_active()
								: m.admin_settings_activate()}
						</Button>
					</div>
				</div>

				<!-- Modo claro: editor + vista previa de colores al lado -->
				<div class="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
					<div class="min-w-0 flex-1 xl:max-w-xl">
						<TextArea
							id="tokens-light"
							label={m.admin_settings_mode_light()}
							bind:value={lightText}
							rows={12}
							mono
							error={lightError}
						/>
					</div>
					<div class="w-full shrink-0 xl:w-72">
						<ThemePreview tokens={lightPreview} dimmed={!lightDraft.valid} />
					</div>
				</div>

				<!-- Modo oscuro -->
				<div class="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
					<div class="min-w-0 flex-1 xl:max-w-xl">
						<TextArea
							id="tokens-dark"
							label={m.admin_settings_mode_dark()}
							bind:value={darkText}
							rows={12}
							mono
							error={darkError}
						/>
					</div>
					<div class="w-full shrink-0 xl:w-72">
						<ThemePreview tokens={darkPreview} dimmed={!darkDraft.valid} />
					</div>
				</div>
			</div>
		{/if}
	</Card>
</div>

<SaveBar {dirty} {saving} onSave={save} onDiscard={discard} />

<ConfirmModal
	open={resetModalOpen}
	title={m.admin_settings_modal_title()}
	text={m.admin_settings_modal_text({ name: selectedTheme?.name ?? '' })}
	confirmText={m.admin_settings_reset()}
	critical
	busy={resetting}
	onConfirm={confirmReset}
	onCancel={() => (resetModalOpen = false)}
/>

<ConfirmModal
	open={deleteModalOpen}
	title={m.admin_settings_delete_title({ name: selectedTheme?.name ?? '' })}
	text={m.admin_settings_delete_text({ name: selectedTheme?.name ?? '' })}
	confirmText={m.admin_settings_delete()}
	critical
	busy={deleting}
	onConfirm={confirmDelete}
	onCancel={() => (deleteModalOpen = false)}
/>
