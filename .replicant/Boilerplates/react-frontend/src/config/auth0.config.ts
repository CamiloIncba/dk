// Auth0 Configuration
export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || '',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || '',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE || '',
  redirectUri: `${window.location.origin}/callback`,
  scope: 'openid profile email',
};

if (import.meta.env.DEV) {
  if (!auth0Config.domain) console.warn('⚠️ VITE_AUTH0_DOMAIN no está configurado');
  if (!auth0Config.clientId) console.warn('⚠️ VITE_AUTH0_CLIENT_ID no está configurado');
}

export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:{{PORT_BACKEND}}/api',
};
