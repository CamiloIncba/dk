import { Auth0Provider, AppState, Auth0Context } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { auth0Config } from '@/config/auth0.config';
import { SKIP_AUTH } from '@/config/skip-auth';

interface Props {
  children: React.ReactNode;
}

function MockAuth0Provider({ children }: Props) {
  const mockContextValue = {
    isAuthenticated: true,
    isLoading: false,
    user: {
      sub: 'mock|admin-001',
      name: 'Admin Dev',
      email: 'admin@example.com',
      picture: undefined,
      email_verified: true,
    },
    getAccessTokenSilently: async () => 'mock-token',
    getAccessTokenWithPopup: async () => 'mock-token',
    getIdTokenClaims: async () => undefined,
    loginWithRedirect: async () => {},
    loginWithPopup: async () => {},
    logout: () => { window.location.href = '/'; },
    handleRedirectCallback: async () => ({ appState: {} }),
  } as any;

  return (
    <Auth0Context.Provider value={mockContextValue}>
      {children}
    </Auth0Context.Provider>
  );
}

export function Auth0ProviderWithNavigate({ children }: Props) {
  const navigate = useNavigate();

  if (SKIP_AUTH) {
    return <MockAuth0Provider>{children}</MockAuth0Provider>;
  }

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo || window.location.pathname);
  };

  if (!auth0Config.domain || !auth0Config.clientId) {
    if (import.meta.env.DEV) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ Auth0 No Configurado</h2>
            <p className="text-gray-600 mb-4">
              Configura las variables en <code className="bg-gray-100 px-1">.env</code>:
            </p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`VITE_AUTH0_DOMAIN=tu-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=tu_client_id
VITE_AUTH0_AUDIENCE=https://api.example.com`}
            </pre>
            <p className="text-gray-500 text-sm mt-4">
              O usa <code className="bg-gray-100 px-1">VITE_SKIP_AUTH=true</code> para desarrollo.
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: auth0Config.redirectUri,
        audience: auth0Config.audience,
        scope: auth0Config.scope,
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
