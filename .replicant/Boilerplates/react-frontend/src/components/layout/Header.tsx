import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/auth/UserMenu';

export function Header() {
  return (
    <header className="fixed z-20 w-full px-2">
      <nav>
        <div className="mx-auto mt-2 max-w-6xl px-6 lg:px-12">
          <div className="relative flex flex-wrap items-center justify-between gap-4 py-3 lg:gap-0 lg:py-3">
            {/* Center: project info (customize per project) */}
            <div className="flex-1" />

            {/* Right: actions */}
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle size="sm" />
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
