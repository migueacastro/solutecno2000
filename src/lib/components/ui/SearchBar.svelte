<script lang="ts">
	import type { Pathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { cachedSearch } from '$lib/search/cache';
	import type { SearchItem, SearchSource } from '$lib/search/types';

	/**
	 * Combobox de búsqueda reutilizable (ARIA 1.2, patrón dropdown de
	 * ProfileMenu: backdrop z-40 invisible + panel z-50). Mezcla fuentes
	 * locales (JSON preindexado, respuesta inmediata) con remotas (RPC
	 * Supabase): pinta las locales al toque y re-fusiona cuando llegan las
	 * remotas. Cancelación por generation counter + AbortController: una
	 * respuesta que llega tarde se descarta aunque no haya abortado a tiempo.
	 * El foco permanece en el input (aria-activedescendant mueve el activo).
	 */
	type Props = {
		/** Orden = orden de presentación al mezclar fuentes. */
		sources: SearchSource[];
		placeholder?: string;
		/** Input sin label visible: aria-label obligatorio. */
		ariaLabel: string;
		/** ⌘K / Ctrl+K enfoca el input y selecciona su texto. */
		hotkey?: boolean;
		debounceMs?: number;
		minChars?: number;
		limit?: number;
		/** Con input vacío + focus muestra las búsquedas recientes. */
		showRecent?: boolean;
		onSelect?: (item: SearchItem) => void;
		class?: string;
	};
	let {
		sources,
		placeholder = '',
		ariaLabel,
		hotkey = false,
		debounceMs = 200,
		minChars = 2,
		limit = 8,
		showRecent = false,
		onSelect,
		class: cls = ''
	}: Props = $props();

	const RECENT_KEY = 'admin-search-recent';
	const RECENT_MAX = 5;

	let query = $state('');
	let open = $state(false);
	let activeIndex = $state(-1);
	let inputEl: HTMLInputElement | undefined = $state();
	let listboxId = $props.id();

	// Resultados ya fusionados (locales primero, remotas después, dedupe por id).
	let results = $state<SearchItem[]>([]);
	// Recientes leídos de localStorage solo en cliente (SSR-safe).
	let recent = $state<SearchItem[]>([]);

	let generation = 0;
	let controller: AbortController | null = null;
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let searching = $state(false);

	// Limpieza al desmontar: corta requests en vuelo y el timer.
	$effect(() => {
		return () => {
			generation++;
			controller?.abort();
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	$effect(() => {
		if (!showRecent) return;
		recent = readRecent();
	});

	function readRecent(): SearchItem[] {
		if (typeof window === 'undefined') return [];
		try {
			const raw = localStorage.getItem(RECENT_KEY);
			const parsed: unknown = raw ? JSON.parse(raw) : [];
			return Array.isArray(parsed) ? (parsed as SearchItem[]) : [];
		} catch {
			return [];
		}
	}

	function saveRecent(item: SearchItem): void {
		if (typeof window === 'undefined') return;
		try {
			const next = [item, ...recent.filter((r) => r.id !== item.id)].slice(0, RECENT_MAX);
			recent = next;
			localStorage.setItem(RECENT_KEY, JSON.stringify(next));
		} catch {
			// localStorage lleno o bloqueado: los recientes son prescindibles.
		}
	}

	function merge(parts: SearchItem[][]): SearchItem[] {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- set local transitorio de dedupe, no es estado del componente
		const seen = new Set<string>();
		const merged: SearchItem[] = [];
		for (const part of parts) {
			for (const item of part) {
				if (seen.has(item.id)) continue;
				seen.add(item.id);
				merged.push(item);
				if (merged.length >= limit) return merged;
			}
		}
		return merged;
	}

	async function run(currentQuery: string): Promise<void> {
		const gen = ++generation;
		controller?.abort();
		controller = new AbortController();
		const signal = controller.signal;
		if (sources.length === 0) {
			results = [];
			return;
		}
		searching = true;
		try {
			const parts = await Promise.all(
				sources.map((source) =>
					cachedSearch(
						`${source.id}:${currentQuery}`,
						(signal) => source.search(currentQuery, signal),
						signal
					).catch(() => [])
				)
			);
			// Una respuesta abortada puede resolver antes del abort: descartarla.
			if (gen !== generation) return;
			results = merge(parts);
		} finally {
			if (gen === generation) searching = false;
		}
	}

	function handleInput(): void {
		if (debounceTimer) clearTimeout(debounceTimer);
		const currentQuery = query;
		if (currentQuery.trim().length < minChars) {
			generation++;
			controller?.abort();
			results = [];
			return;
		}
		debounceTimer = setTimeout(() => void run(currentQuery), debounceMs);
	}

	function pick(item: SearchItem): void {
		close();
		query = '';
		results = [];
		if (showRecent) saveRecent(item);
		if (onSelect) {
			onSelect(item);
		} else if (item.href) {
			// SPA nav para no recargar la app; resolve por la convención del repo.
			void goto(resolve(item.href as Pathname));
		}
	}

	function close(): void {
		open = false;
		activeIndex = -1;
	}

	// Teclado ARIA 1.2: el foco NUNCA sale del input; el activo se marca con
	// aria-activedescendant. Todo en el onkeydown del input, salvo ⌘K.
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			if (!open || results.length === 0) return;
			event.preventDefault();
			const delta = event.key === 'ArrowDown' ? 1 : -1;
			activeIndex = (activeIndex + delta + results.length) % results.length;
			document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
			return;
		}
		if (event.key === 'Enter') {
			if (!open) return;
			event.preventDefault();
			const active = results[activeIndex] ?? results[0];
			if (active) pick(active);
			return;
		}
		if (event.key === 'Escape') {
			if (open) {
				event.preventDefault();
				close();
				return;
			}
			query = '';
			results = [];
			inputEl?.blur();
		}
	}

	function handleFocus(): void {
		open = true;
	}

	function optionId(index: number): string {
		return `${listboxId}-option-${index}`;
	}

	// Agrupados conservando el orden de llegada (locales primero): cada grupo
	// sale con su header i18n en el orden en que apareció el primer item.
	const groups = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- map local transitorio de agrupación, no es estado del componente
		const map = new Map<string, SearchItem[]>();
		for (const item of results) {
			const bucket = map.get(item.group);
			if (bucket) bucket.push(item);
			else map.set(item.group, [item]);
		}
		return [...map.entries()];
	});

	// Label i18n del header de grupo: se resuelve en el render (paraglide reactivo).
	function groupLabel(group: string): string {
		if (group === 'navigation') return m.search_group_navigation();
		if (group === 'settings') return m.search_group_settings();
		return m.search_group_products();
	}

	const showDropdown = $derived(
		open &&
			((query.trim().length >= minChars && results.length > 0) ||
				(showRecent && query.trim().length === 0 && recent.length > 0))
	);
	const showEmpty = $derived(
		open && query.trim().length >= minChars && !searching && results.length === 0
	);

	function handleHotkey(event: KeyboardEvent): void {
		// Listener global fijo (svelte:window no puede ir en un {#if}): sin la
		// prop hotkey activa no hace nada.
		if (!hotkey) return;
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			inputEl?.focus();
			inputEl?.select();
		}
	}
</script>

<svelte:window onkeydown={handleHotkey} />

<div class={'relative ' + cls}>
	<!-- Icono de lupa a la izquierda del input (estilo Shopify topbar). -->
	<Icon
		paths="<circle cx='11' cy='11' r='7' /><path d='m20 20-3.5-3.5' />"
		size={16}
		class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--app-text-muted)"
	/>
	<input
		bind:this={inputEl}
		bind:value={query}
		type="search"
		role="combobox"
		aria-expanded={showDropdown}
		aria-controls={listboxId}
		aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
		aria-autocomplete="list"
		aria-label={ariaLabel}
		{placeholder}
		class="w-full cursor-text rounded border border-(--app-border) bg-(--app-bg) py-1.5 pr-3 pl-8 text-[13px] text-(--app-text) outline-none placeholder:text-(--app-text-muted) focus:border-(--app-primary)"
		oninput={handleInput}
		onfocus={handleFocus}
		onkeydown={handleKeydown}
	/>

	{#if showDropdown}
		<!-- Backdrop invisible: clic fuera cierra (patrón ProfileMenu). -->
		<button
			type="button"
			aria-label={m.admin_search_clear()}
			class="fixed inset-0 z-40 cursor-default"
			onclick={close}
		></button>
		<div
			class="absolute top-full z-50 mt-2 w-full overflow-hidden rounded border border-(--app-border) bg-(--app-surface) shadow-[0_4px_16px_rgba(26,26,26,0.15)]"
		>
			<!-- Un solo listbox: los headers de grupo son li role=presentation
				(válidos dentro del listbox) para no duplicar ids entre grupos. -->
			<ul role="listbox" id={listboxId} class="py-1">
				{#if query.trim().length < minChars && showRecent && recent.length > 0}
					<li
						role="presentation"
						class="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wide text-(--app-text-muted) uppercase"
					>
						{m.admin_search_recent()}
					</li>
					{#each recent as item, index (item.id)}
						<!-- combobox ARIA 1.2: el teclado lo maneja el input (ArrowUp/Down/Enter), el foco no sale de él -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<li
							role="option"
							aria-selected={index === activeIndex}
							id={optionId(index)}
							tabindex="-1"
							class="cursor-pointer px-3 py-2 text-[13px] text-(--app-text) hover:bg-black/2 {index ===
							activeIndex
								? 'bg-(--app-active-bg)'
								: ''}"
							onclick={() => pick(item)}
						>
							{item.label}
						</li>
					{/each}
				{:else}
					{#each groups as [group, items] (group)}
						<li
							role="presentation"
							class="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wide text-(--app-text-muted) uppercase"
						>
							{groupLabel(group)}
						</li>
						{#each items as item (item.id)}
							<!-- activeIndex es global sobre results, no por grupo. -->
							{@const globalIndex = results.indexOf(item)}
							<!-- combobox ARIA 1.2: el teclado lo maneja el input (ArrowUp/Down/Enter), el foco no sale de él -->
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<li
								role="option"
								aria-selected={globalIndex === activeIndex}
								id={optionId(globalIndex)}
								tabindex="-1"
								class="cursor-pointer px-3 py-2 text-[13px] text-(--app-text) hover:bg-black/2 {globalIndex ===
								activeIndex
									? 'bg-(--app-active-bg)'
									: ''}"
								onclick={() => pick(item)}
							>
								{item.label}
							</li>
						{/each}
					{/each}
				{/if}
			</ul>
		</div>
	{:else if showEmpty}
		<p
			class="absolute top-full z-50 mt-2 w-full rounded border border-(--app-border) bg-(--app-surface) px-3 py-2 text-[13px] text-(--app-text-muted) shadow-[0_4px_16px_rgba(26,26,26,0.15)]"
		>
			{m.admin_search_empty({ query: query.trim() })}
		</p>
	{/if}
</div>
