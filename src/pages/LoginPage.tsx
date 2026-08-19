import { useState } from 'react';
import { Flame, LogIn, Eye, EyeOff, Building2, Shield, Network, Wrench, HardHat } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

type LoginMode = 'manager' | 'admin' | 'dhsse' | 'network' | 'technician';

export function LoginPage() {
  const { signIn, signInWithStationCode } = useAuth();
  const [mode, setMode] = useState<LoginMode>('admin');
  const [email, setEmail] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'manager') {
      const { error: errMsg } = await signInWithStationCode(stationCode);
      setLoading(false);
      if (errMsg) setError(errMsg);
    } else {
      const { error: errMsg } = await signIn(email, password);
      setLoading(false);
      if (errMsg) {
        setError(errMsg === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : errMsg);
      }
    }
  };

  const tabs: { id: LoginMode; label: string; icon: typeof Building2 }[] = [
    { id: 'admin', label: 'Admin', icon: Shield },
    { id: 'dhsse', label: 'DHSSE', icon: HardHat },
    { id: 'manager', label: 'Gérant', icon: Building2 },
    { id: 'network', label: 'Réseau', icon: Network },
    { id: 'technician', label: 'DEX', icon: Wrench },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/30 mb-4">
            <Flame className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">ExtinguisherTracker</h1>
          <p className="text-sm text-slate-500 mt-1">Connexion à votre espace</p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setMode(tab.id); setError(null); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all whitespace-nowrap',
                  mode === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'manager' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Code station</label>
              <input
                type="text"
                value={stationCode}
                onChange={(e) => setStationCode(e.target.value.toUpperCase())}
                required
                autoFocus
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition font-mono tracking-wide"
                placeholder="ST-001"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
                  placeholder="vous@stations.fr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-11 text-slate-900 placeholder-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2.5 text-white font-medium shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? (
              <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Se connecter
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
