import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';

type Role = 'admin' | 'operador' | 'lector';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: Role[];
}

interface NavSection {
  label: string;
  items: NavItem[];
  roles?: Role[];
}

const navSections: NavSection[] = [
  {
    label: '',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  // Add your nav sections here:
  // {
  //   label: 'Gestión',
  //   items: [
  //     { label: 'Usuarios', href: '/users', icon: Users, roles: ['admin'] },
  //   ],
  // },
];

export function Sidebar() {
  const location = useLocation();
  const { role } = useCurrentUser();
  const [expanded, setExpanded] = useState(false);

  const visibleSections = navSections
    .filter((s) => !s.roles || s.roles.includes(role as Role))
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => !item.roles || item.roles.includes(role as Role)),
    }))
    .filter((s) => s.items.length > 0);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        'hidden md:flex flex-col border-r bg-sidebar-background text-sidebar-foreground transition-all duration-300 ease-in-out overflow-hidden',
        expanded ? 'w-52' : 'w-[52px]',
      )}
    >
      <div className="flex h-14 items-center px-[10px] shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
            {{PROYECTO}}
          </div>
          <div
            className={cn(
              'flex flex-col overflow-hidden transition-opacity duration-200 whitespace-nowrap',
              expanded ? 'opacity-100' : 'opacity-0',
            )}
          >
            <span className="text-sm font-semibold leading-tight">{{CLIENTE}}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{{NOMBRE_COMPLETO}}</span>
          </div>
        </div>
      </div>

      <hr className="opacity-50" />

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-[10px]">
        {visibleSections.map((section, idx) => (
          <div key={section.label || idx}>
            {idx > 0 && <hr className="my-2 opacity-30" />}
            {section.label && (
              <div
                className={cn(
                  'mb-1 overflow-hidden transition-opacity duration-200 whitespace-nowrap',
                  expanded ? 'opacity-60 px-2' : 'opacity-0 h-0 mb-0',
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/50">
                  {section.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors overflow-hidden whitespace-nowrap',
                    isActive(item.href)
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span
                    className={cn(
                      'transition-opacity duration-200',
                      expanded ? 'opacity-100' : 'opacity-0',
                    )}
                  >
                    {item.label}
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
