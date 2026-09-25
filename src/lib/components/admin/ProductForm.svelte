<script lang="ts">
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages.js';
	import { createDraft } from '$lib/admin/form.svelte';
	import { toProductDraft, type ProductRow } from '$lib/admin/product-form';
	import { slugify } from '$lib/admin/slug';
	import { callAction } from '$lib/admin/actions';
	import DetailForm from '$lib/components/admin/DetailForm.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	/**
	 * Formulario de producto sobre DetailForm, compartido por new y [id].
	 * Es dueño del draft (createDraft) y del flujo de guardado (callAction):
	 * el error de la action se muestra inline en el DetailForm y el éxito
	 * se delega en onSaved (toast/redirect/invalidateAll del caller).
	 * El aside lleva Estado, Organización y, en edición, metadata + eliminar.
	 */
	let {
		initial,
		action,
		onSaved,
		onDiscard,
		editMeta = null,
		onDelete
	}: {
		/** Fila DB congelada como estado guardado (null = creación). */
		initial: ProductRow;
		/** Action de guardado: ?/create_product o ?/update_product. */
		action: 'create_product' | 'update_product';
		/** Tras guardar OK: el caller hace invalidateAll/toast/redirect. */
		onSaved: (newId: string | undefined) => void | Promise<void>;
		/** Callback extra del discard (después del reset interno). */
		onDiscard?: () => void;
		/** Metadata de solo lectura (solo modo edición). */
		editMeta?: {
			publishedAt: string | null;
			createdAt: string | null;
			updatedAt: string | null;
		} | null;
		/** Presente solo en edición: muestra el botón Eliminar (el modal es del caller). */
		onDelete?: () => void;
	} = $props();

	// Modo derivado de la fila: null = creación; edición cuando hay fila.
	const mode = $derived(initial ? 'edit' : 'create');

	// El draft se congela con el valor inicial (intencional): los datos
	// frescos tras guardar llegan con el invalidateAll del caller y f.save()
	// actualiza el snapshot; el dirty siempre va contra esta copia.
	const f = createDraft(() => toProductDraft(initial));
	let saving = $state(false);
	let formError = $state<string | undefined>();

	// Slug autogenerado: al salir del campo nombre se completa desde el
	// nombre, salvo que el usuario haya editado el slug a mano.
	let slugTouched = $state(false);

	function handleNameBlur(): void {
		if (!slugTouched) f.draft.slug = slugify(f.draft.name);
	}

	/** Discard también olvida la edición manual del slug. */
	function handleDiscard(): void {
		slugTouched = false;
		f.reset();
		onDiscard?.();
	}

	async function handleSave(): Promise<void> {
		saving = true;
		formError = undefined;

		const d = f.draft;
		const res = await callAction(action, {
			name: d.name,
			slug: d.slug,
			description: d.description,
			status: d.status,
			price: d.price,
			currency: d.currency,
			price_on_request: d.price_on_request ? 'on' : '',
			vendor: d.vendor,
			product_type: d.product_type
		});

		saving = false;

		if (res.ok) {
			// El draft actual pasa a ser la verdad guardada: dirty vuelve a
			// false sin recrear el formulario (los datos frescos llegan con
			// el invalidateAll del caller).
			f.save();
			await onSaved(res.newId);
		} else {
			// Mensaje ya traducido por callAction (errorMessage): inline en el
			// DetailForm, más persistente que un toast.
			formError = res.error;
		}
	}

	const dateFormatter = $derived(
		new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' })
	);

	const statusOptions = $derived([
		{ value: 'draft', label: m.admin_products_status_draft() },
		{ value: 'active', label: m.admin_products_status_active() },
		{ value: 'archived', label: m.admin_products_status_archived() },
		{ value: 'unlisted', label: m.admin_products_status_unlisted() }
	]);

	const currencyOptions = $derived([
		{ value: 'PEN', label: m.admin_product_form_currency_pen() },
		{ value: 'USD', label: m.admin_product_form_currency_usd() },
		{ value: 'EUR', label: m.admin_product_form_currency_eur() }
	]);
</script>

<DetailForm
	dirty={f.dirty}
	{saving}
	error={formError}
	onSave={handleSave}
	onDiscard={handleDiscard}
>
	<!-- children implícito (la regla no-useless-children-snippet lo exige);
		aside va como snippet nombrado. -->
	<div class="flex flex-col gap-6">
		<Card title={m.admin_product_form_card_product()} class="p-5">
			<div class="flex flex-col gap-4">
				<TextField
					id="product-name"
					label={m.admin_product_form_name_label()}
					bind:value={f.draft.name}
					maxlength={255}
					onblur={handleNameBlur}
				/>
				<TextField
					id="product-slug"
					label={m.admin_product_form_slug_label()}
					help={m.admin_product_form_slug_help()}
					bind:value={f.draft.slug}
					oninput={() => (slugTouched = true)}
				/>
				<TextArea
					id="product-description"
					label={m.admin_product_form_description_label()}
					rows={6}
					spellcheck
					bind:value={f.draft.description}
				/>
			</div>
		</Card>

		<Card title={m.admin_product_form_card_pricing()} class="p-5">
			<div class="flex flex-col gap-4">
				<!-- A consultar deshabilita monto y moneda (el precio no aplica). -->
				<TextField
					id="product-price"
					label={m.admin_product_form_price_label()}
					help={m.admin_product_form_price_help()}
					bind:value={f.draft.price}
					disabled={f.draft.price_on_request}
				/>
				<Select
					id="product-currency"
					label={m.admin_product_form_currency_label()}
					options={currencyOptions}
					bind:value={f.draft.currency}
					disabled={f.draft.price_on_request}
				/>
				<Checkbox
					id="product-price-on-request"
					label={m.admin_product_form_on_request()}
					help={m.admin_product_form_on_request_help()}
					bind:checked={f.draft.price_on_request}
				/>
			</div>
		</Card>
	</div>

	{#snippet aside()}
		<div class="flex flex-col gap-6">
			<Card title={m.admin_product_form_card_status()} class="p-5">
				<div class="flex flex-col gap-4">
					<Select
						id="product-status"
						label={m.admin_product_form_status_label()}
						options={statusOptions}
						bind:value={f.draft.status}
					/>
					{#if mode === 'edit'}
						<p class="text-[12px] text-(--app-text-muted)">
							{m.admin_product_form_published_at()}:
							{editMeta?.publishedAt ? dateFormatter.format(new Date(editMeta.publishedAt)) : '—'}
						</p>
					{/if}
				</div>
			</Card>

			<Card title={m.admin_product_form_card_organization()} class="p-5">
				<div class="flex flex-col gap-4">
					<TextField
						id="product-vendor"
						label={m.admin_product_form_vendor_label()}
						bind:value={f.draft.vendor}
					/>
					<TextField
						id="product-type"
						label={m.admin_product_form_type_label()}
						bind:value={f.draft.product_type}
					/>
				</div>
			</Card>

			{#if mode === 'edit'}
				<Card title={m.admin_product_form_card_metadata()} class="p-5">
					<div class="flex flex-col gap-1 text-[12px] text-(--app-text-muted)">
						<p>
							{m.admin_product_form_created_at()}:
							{editMeta?.createdAt ? dateFormatter.format(new Date(editMeta.createdAt)) : '—'}
						</p>
						<p>
							{m.admin_product_form_updated_at()}:
							{editMeta?.updatedAt ? dateFormatter.format(new Date(editMeta.updatedAt)) : '—'}
						</p>
						{#if onDelete}
							<Button
								variant="critical-text"
								size="sm"
								class="mt-2 self-start text-[13px]"
								onclick={onDelete}
							>
								{m.admin_product_form_delete()}
							</Button>
						{/if}
					</div>
				</Card>
			{/if}
		</div>
	{/snippet}
</DetailForm>
