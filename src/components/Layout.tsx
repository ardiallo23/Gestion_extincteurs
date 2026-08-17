import { type ReactNode, useState } from 'react';
import {
  Flame,
  LayoutDashboard,
  Building2,
  FireExtinguisher,
  Users,
  History,
  LogOut,
  Menu,
  X,
  ClipboardCheck,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

export type PageKey =
  | 'dashboard'
  | 'stations'
  | 'extinguishers'
  | 'compliance'
  | 'users'
  | 'history'
  | 'daily-check';

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
}

interface LayoutProps {
  children: ReactNode;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  stationName?: string | null;
}

export function Layout({ children, currentPage, onNavigate, stationName }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isTechnician = profile?.role === 'technician';

  const navItems: NavItem[] = isTechnician
    ? [
        { key: 'compliance', label: 'Conformité', icon: ShieldCheck },
      ]
    : isAdmin
    ? [
        { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
        { key: 'stations', label: 'Stations', icon: Building2 },
        { key: 'extinguishers', label: 'Extincteurs', icon: FireExtinguisher },
        { key: 'compliance', label: 'Conformité', icon: ShieldCheck },
        { key: 'users', label: 'Comptes gérants', icon: Users },
        { key: 'history', label: 'Historique', icon: History },
      ]
    : [
        { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
        { key: 'daily-check', label: 'Saisie quotidienne', icon: ClipboardCheck },
        { key: 'extinguishers', label: 'Extincteurs', icon: FireExtinguisher },
        { key: 'history', label: 'Historique', icon: History },
      ];

  const handleNav = (key: PageKey) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  const initials = (profile?.full_name || profile?.email || '?')
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 flex flex-col transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/20">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">ExtinguisherTracker</p>
            <p className="text-slate-400 text-xs">Stations-service</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                isAdmin ? 'bg-blue-500/20 text-blue-300' : isTechnician ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300',
              )}
            >
              {isAdmin ? 'Administrateur' : isTechnician ? 'Technicien' : 'Gérant'}
            </span>
            {stationName && (
              <span className="flex items-center gap-1 text-xs text-slate-400 truncate">
                <MapPin className="h-3 w-3" />
                {stationName}
              </span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={cn(
                  'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
                )}
              >
                <Icon className={cn('h-5 w-5', active ? 'text-red-400' : '')} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-white text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {profile?.full_name || 'Utilisateur'}
              </p>
              <p className="text-slate-500 text-xs truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between h-16 bg-slate-900 px-4 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
              <Flame className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm">ExtinguisherTracker</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-300 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">{children}</main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-slate-900 border-t border-slate-800 safe-area-inset">
          <div className="flex items-center justify-around px-2 py-1.5" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.key)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors min-w-0 flex-1',
                    active ? 'text-red-400' : 'text-slate-500',
                  )}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-red-400')} />
                  <span className="truncate max-w-full">{item.label.split(' ')[0]}</span>
                </button>
              );
            })}
            <button
              onClick={signOut}
              className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-slate-500 transition-colors min-w-0 flex-1"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Sortir</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
