import { createSupabaseBrowserClient } from '$lib/supabase/client';

/**
 * Cierra la sesión del navegador. El caller decide la navegación después
 * (patrón de ProfileMenu/Sidebar: goto + invalidateAll reejecuta los guards).
 */
export async function signOutBrowser(): Promise<void> {
	await createSupabaseBrowserClient().auth.signOut();
}
