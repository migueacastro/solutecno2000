import { env } from '$env/dynamic/public';

/**
 * Nombre de la app, configurable por entorno.
 * Agrega PUBLIC_APP_NAME en .env / Vercel para sobrescribir el fallback;
 * al ser dynamic/public no requiere rebuild para cambiar en Vercel (solo redeploy).
 */
export const APP_NAME: string = env.PUBLIC_APP_NAME || 'SolutionsTecno';
