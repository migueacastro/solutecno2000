import { m } from '$lib/paraglide/messages.js';
import { errorMessage } from '$lib/i18n/errors';

export type ActionResponse = { ok: boolean; error?: string; newId?: string };

/** POST a un ?/action y extracción del resultado (sin form ni enhance).
 *  El server devuelve claves de error (errorKey); aquí se traducen. */
export async function callAction(
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
