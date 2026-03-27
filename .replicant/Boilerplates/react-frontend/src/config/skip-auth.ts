/**
 * Flag para saltar la autenticación Auth0 en desarrollo.
 *
 * Cuando VITE_SKIP_AUTH=true, la app:
 * - No requiere login de Auth0
 * - ProtectedRoute deja pasar directamente
 * - useApi no inyecta Bearer token
 * - useCurrentUser retorna un usuario admin mock
 */
export const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true';

if (SKIP_AUTH && import.meta.env.DEV) {
  console.warn('⚠️ SKIP_AUTH activo — autenticación Auth0 deshabilitada');
}
