import type { LayoutServerLoad } from './$types';

/**
 * Perfil del visitante para la zona pública: si hay sesión Supabase se lee
 * la fila de profiles (RLS: solo la propia) para pintar el avatar en el
 * header público. Defensivo igual que el resto: sin Supabase o sin fila el
 * header cae al icono genérico de cuenta.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.supabase) return { profile: null };

	const session = await locals.safeGetSession();
	if (!session) return { profile: null };

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, display_name, avatar_url')
		.eq('id', session.user.id)
		.single();

	return { profile: profile ?? null };
};
