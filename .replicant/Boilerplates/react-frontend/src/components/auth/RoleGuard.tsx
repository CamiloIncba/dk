import { useCurrentUser } from '@/hooks/use-current-user';
import type { Role } from '@/types';

interface RoleGuardProps {
  children: React.ReactNode;
  roles: Role[];
  fallback?: React.ReactNode;
}

/** Only renders children if user has one of the allowed roles */
export function RoleGuard({ children, roles, fallback = null }: RoleGuardProps) {
  const { role } = useCurrentUser();

  if (!roles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
