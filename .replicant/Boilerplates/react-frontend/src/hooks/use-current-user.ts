import { useAuth0 } from '@auth0/auth0-react';
import { useQuery } from '@tanstack/react-query';
import { SKIP_AUTH } from '@/config/skip-auth';
import { useApi } from './use-api';
import type { CurrentUser, Role } from '@/types';

declare global {
  interface Window {
    __MOCK_ROLE__?: Role;
  }
}

/**
 * 🔐 Estándar NOR-PAN: "Auth0 autentica, la BD autoriza"
 *
 * Este hook obtiene el usuario actual desde el backend (GET /users/me),
 * donde el ROL se resuelve desde MongoDB — NO desde claims JWT de Auth0.
 *
 * Flujo:
 * 1. Auth0 autentica → JWT con sub (auth0Id)
 * 2. useApi inyecta Bearer token en cada request
 * 3. Backend GET /users/me busca en MongoDB por auth0Id → devuelve { role, ... }
 * 4. Este hook expone role, isAdmin, canWrite, etc.
 *
 * ⚠️ Anti-patrón: NO leer roles de auth0User[namespace/roles].
 *    Eso requiere Auth0 Actions/Rules y es difícil de mantener.
 */

function getMockUser(): CurrentUser {
  const role: Role = (typeof window !== 'undefined' && window.__MOCK_ROLE__) || 'admin';

  const mockProfiles: Record<Role, CurrentUser> = {
    admin: {
      id: 'mock-admin-001',
      email: 'admin@example.com',
      nombre: 'Admin',
      apellido: 'Dev',
      role: 'admin',
      lastLogin: new Date().toISOString(),
    },
    operador: {
      id: 'mock-operador-001',
      email: 'operador@example.com',
      nombre: 'Operador',
      apellido: 'Dev',
      role: 'operador',
      lastLogin: new Date().toISOString(),
    },
    lector: {
      id: 'mock-lector-001',
      email: 'lector@example.com',
      nombre: 'Lector',
      apellido: 'Dev',
      role: 'lector',
      lastLogin: new Date().toISOString(),
    },
  };

  return mockProfiles[role];
}

export function useCurrentUser() {
  const { isAuthenticated, isLoading: auth0Loading } = useAuth0();
  const { get } = useApi();

  // Fetch user profile from backend (role comes from MongoDB)
  const query = useQuery({
    queryKey: ['current-user'],
    queryFn: () => get<CurrentUser>('/users/me'),
    enabled: isAuthenticated && !SKIP_AUTH,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // SKIP_AUTH mode: return mock user
  if (SKIP_AUTH) {
    const mock = getMockUser();
    return {
      user: mock,
      role: mock.role,
      isAdmin: mock.role === 'admin',
      isOperador: mock.role === 'operador',
      isLector: mock.role === 'lector',
      canWrite: mock.role === 'admin' || mock.role === 'operador',
      isLoading: false,
      error: null,
    };
  }

  const user = query.data ?? null;
  const role: Role = user?.role ?? 'lector';

  return {
    user,
    role,
    isAdmin: role === 'admin',
    isOperador: role === 'operador',
    isLector: role === 'lector',
    canWrite: role === 'admin' || role === 'operador',
    isLoading: auth0Loading || query.isLoading,
    error: query.error,
  };
}
