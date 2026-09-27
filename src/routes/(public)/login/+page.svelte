<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import { authErrorMessage } from '$lib/i18n/auth-errors';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';

	/**
	 * Login clásico email/password + Google. El form action establece la
	 * sesión server-side (cookies) y redirige por rol; aquí solo se pinta el
	 * formulario y el error traducido con authErrorMessage. Google va por
	 * OAuth client-side con callback server-side en /auth/callback (un solo
	 * lugar intercambia el código PKCE, sea de email o de Google).
	 */
	let { form, data }: PageProps = $props();

	let email = $state('');
	let password = $state('');
	let submitting = $state(false);
	let googleError = $state('');

	/** Inicia el OAuth de Google: el navegador sigue el redirect del provider. */
	async function signInWithGoogle(): Promise<void> {
		googleError = '';
		const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${window.location.origin}/auth/callback` }
		});
		if (error) {
			googleError = authErrorMessage('unexpected');
		}
	}
</script>

<div class="flex min-h-[70vh] items-center justify-center px-4 py-10">
	<Card class="w-full max-w-sm p-8">
		<h1 class="text-[20px] font-semibold text-(--app-text)">{m.auth_login_title()}</h1>
		<p class="mt-2 text-[13px] leading-5 text-(--app-text-muted)">{m.auth_login_text()}</p>

		<form
			method="POST"
			action="?/login"
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
				id="login-email"
				label={m.auth_login_email()}
				type="email"
				placeholder="name@example.com"
				autocomplete="email"
				bind:value={email}
			/>
			<TextField
				id="login-password"
				label={m.auth_login_password()}
				type="password"
				autocomplete="current-password"
				bind:value={password}
			/>
			{#if form?.login?.errorKey}
				<p class="text-[13px] text-(--app-tone-critical-text)">
					{authErrorMessage(form.login.errorKey)}
				</p>
			{/if}
			<Button variant="primary" type="submit" disabled={submitting} class="text-[14px]">
				{submitting ? m.auth_login_submitting() : m.auth_login_submit()}
			</Button>
		</form>

		<!-- Error reportado por /auth/callback (link de verificación expirado). -->
		{#if data.callbackError}
			<p class="mt-4 text-[13px] text-(--app-tone-critical-text)">
				{authErrorMessage(data.callbackError)}
			</p>
		{/if}

		<!-- Divisor entre el login por email y el botón de Google. -->
		<div class="my-5 h-px bg-(--app-border)"></div>

		<Button variant="secondary" size="md" class="w-full text-[14px]" onclick={signInWithGoogle}>
			{m.auth_login_google()}
		</Button>
		{#if googleError}
			<p class="mt-3 text-[13px] text-(--app-tone-critical-text)">{googleError}</p>
		{/if}

		<a
			href={resolve('/register' as Pathname)}
			class="mt-6 block text-center text-[13px] font-medium text-(--app-text) no-underline underline underline-offset-2 hover:opacity-80"
		>
			{m.auth_login_to_register()}
		</a>
	</Card>
</div>
