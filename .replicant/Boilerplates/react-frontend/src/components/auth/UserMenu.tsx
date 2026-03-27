import { useAuth0 } from '@auth0/auth0-react';
import { LogOut, User } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { SKIP_AUTH } from '@/config/skip-auth';

export function UserMenu() {
  const { logout } = useAuth0();
  const { user, role } = useCurrentUser();

  const handleLogout = () => {
    if (SKIP_AUTH) {
      window.location.href = '/login';
      return;
    }
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors"
      title={`${user?.nombre || 'User'} (${role})`}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
        <User className="h-4 w-4" />
      </div>
      <div className="hidden md:flex flex-col items-start">
        <span className="text-xs font-medium leading-tight">{user?.nombre || 'User'}</span>
        <span className="text-[10px] text-muted-foreground leading-tight capitalize">{role}</span>
      </div>
      <LogOut className="h-3.5 w-3.5 text-muted-foreground ml-1" />
    </button>
  );
}
