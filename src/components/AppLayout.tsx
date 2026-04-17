import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { UserWithRole } from '@/routes/_authenticated';
import {
  LayoutDashboard, Ticket, History, CalendarDays, Users, UserCog, Shield,
  Menu, X, Wrench, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { to: '/' as const, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets' as const, icon: Ticket, label: 'Tickets' },
  { to: '/clientes' as const, icon: Users, label: 'Clientes' },
  { to: '/tecnicos' as const, icon: UserCog, label: 'Técnicos' },
  { to: '/usuarios' as const, icon: Shield, label: 'Usuarios' },
  { to: '/historial' as const, icon: History, label: 'Historial' },
  { to: '/calendario' as const, icon: CalendarDays, label: 'Calendario' },
];

const adminRoutes = ['/clientes', '/tecnicos', '/usuarios'];

export function AppLayout({ children, user }: { children: React.ReactNode; user: UserWithRole }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const visibleNavItems = navItems.filter(item => {
    if (user.role === 'admin') return true;
    return !adminRoutes.includes(item.to);
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: '/login' });
  };

  const currentLabel = navItems.find((n) => n.to === location.pathname)?.label ?? 'ServiTech';

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Wrench className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-sidebar-primary-foreground">
            ServiTech
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
          <p className="mt-2 px-3 text-xs text-sidebar-foreground/50">© 2026 ServiTech</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="font-heading text-base font-semibold">{currentLabel}</h1>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
