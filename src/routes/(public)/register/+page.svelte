<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { authErrorMessage } from '$lib/i18n/auth-errors';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';

	/**
	 * Registro email/password con verificación de correo. El estado
	 * "revisa tu correo" sale del action (form.checkEmail): sin estado
	 * propio de cliente, así el F5 de la pantalla de éxito no reenvía nada.
	 */
	let { form }: PageProps = $props();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let submitting = $state(false);
</script>

<div class="flex min-h-[70vh] items-center justify-center px-4 py-10">
	<Card class="w-full max-w-sm p-8">
		{#if form?.register && 'checkEmail' in form.register}
			<!-- Pantalla de éxito ambiguo: cuenta nueva o email ya registrado
				devuelven exactamente esto (anti-enumeración). -->
			<h1 class="text-[20px] font-semibold text-(--app-text)">
				{m.auth_register_check_email_title()}
			</h1>
			<p class="mt-2 text-[13px] leading-5 text-(--app-text-muted)">
				{m.auth_register_check_email_text({ email: form.register.email })}
			</p>
			<a
				href={resolve('/login' as Pathname)}
				class="mt-6 block text-center text-[13px] font-medium text-(--app-text) no-underline underline underline-offset-2 hover:opacity-80"
			>
				{m.auth_register_to_login()}
			</a>
		{:else}
			<h1 class="text-[20px] font-semibold text-(--app-text)">{m.auth_register_title()}</h1>
			<p class="mt-2 text-[13px] leading-5 text-(--app-text-muted)">{m.auth_register_text()}</p>

			<form
				method="POST"
				action="?/register"
				class="mt-6 flex flex-col gap-4"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
			>
				<TextField
					id="register-name"
					label={m.auth_register_name()}
					autocomplete="name"
					maxlength={60}
					bind:value={name}
				/>
				<TextField
					id="register-email"
					label={m.auth_register_email()}
					type="email"
					placeholder="name@example.com"
					autocomplete="email"
					bind:value={email}
				/>
				<TextField
					id="register-password"
					label={m.auth_register_password()}
					type="password"
					autocomplete="new-password"
					bind:value={password}
				/>
				<TextField
					id="register-password-confirm"
					label={m.auth_register_password_confirm()}
					type="password"
					autocomplete="new-password"
					bind:value={passwordConfirm}
				/>
				{#if form?.register && 'errorKey' in form.register}
					<p class="text-[13px] text-(--app-tone-critical-text)">
						{authErrorMessage(form.register.errorKey)}
					</p>
				{/if}
				<Button variant="primary" type="submit" disabled={submitting} class="text-[14px]">
					{submitting ? m.auth_register_submitting() : m.auth_register_submit()}
				</Button>
			</form>

			<a
				href={resolve('/login' as Pathname)}
				class="mt-6 block text-center text-[13px] font-medium text-(--app-text) no-underline underline underline-offset-2 hover:opacity-80"
			>
				{m.auth_register_to_login()}
			</a>
		{/if}
	</Card>
</div>
