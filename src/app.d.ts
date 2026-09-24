import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			/** Undefined si el entorno no tiene credenciales de Supabase. */
			supabase: SupabaseClient<Database> | undefined;
			safeGetSession(): Promise<{ session: Session; user: User } | null>;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
