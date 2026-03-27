import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';
import { apiConfig, auth0Config } from '@/config/auth0.config';
import { SKIP_AUTH } from '@/config/skip-auth';

class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export function useApi() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const fetchWithAuth = useCallback(
    async <T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (isAuthenticated && !SKIP_AUTH) {
        try {
          const token = await getAccessTokenSilently({
            authorizationParams: { audience: auth0Config.audience },
          });
          (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        } catch (error) {
          console.error('Error obteniendo token:', error);
          throw new Error('No se pudo obtener el token de autenticación');
        }
      }

      const url = endpoint.startsWith('http')
        ? endpoint
        : `${apiConfig.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `Error ${response.status}: ${response.statusText}`,
          response.status,
          errorData,
        );
      }

      return response.json();
    },
    [getAccessTokenSilently, isAuthenticated],
  );

  const get = useCallback(<T = unknown>(endpoint: string) => fetchWithAuth<T>(endpoint), [fetchWithAuth]);

  const post = useCallback(
    <T = unknown>(endpoint: string, data: unknown) =>
      fetchWithAuth<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    [fetchWithAuth],
  );

  const put = useCallback(
    <T = unknown>(endpoint: string, data: unknown) =>
      fetchWithAuth<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
    [fetchWithAuth],
  );

  const patch = useCallback(
    <T = unknown>(endpoint: string, data?: unknown) =>
      fetchWithAuth<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
    [fetchWithAuth],
  );

  const del = useCallback(
    <T = unknown>(endpoint: string) => fetchWithAuth<T>(endpoint, { method: 'DELETE' }),
    [fetchWithAuth],
  );

  return { get, post, put, patch, del, fetchWithAuth };
}
