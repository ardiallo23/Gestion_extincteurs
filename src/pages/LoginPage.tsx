import { useState } from 'react';
import { Flame, LogIn, Eye, EyeOff, ChevronRight, Building2, Shield, Wrench } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { DEMO_CREDENTIALS } from '@/lib/constants';
import { cn } from '@/lib/utils';

type LoginMode = 'admin' | 'manager' | 'technician';

export function LoginPage() {
  const { signIn, signInWithStationCode } = useAuth();
  const [mode, setMode] = useState<LoginMode>('manager');
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
    if (mode === 'admin') {
      const { error: errMsg } = await signIn(email, password);
      setLoading(false);
      if (errMsg) {
        setError(errMsg === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : errMsg);
      }
    } else {
      const { error: errMsg } = await signInWithStationCode(stationCode);
      setLoading(false);
      if (errMsg) {
        setError(errMsg);
      }
    }
  };

  const fillCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  const fillStationCode = (code: string) => {
    setStationCode(code);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Left panel — branding */}
      <div className="relative lg:w-1/2 bg-slate-900 text-white p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(239,68,68,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(249,115,22,0.3) 0%, transparent 50%)',
        }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/30">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-lg leading-tight">ExtinguisherTracker</p>
              <p className="text-slate-400 text-sm">Réseau de stations-service</p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
              Suivi en temps réel<br />de vos extincteurs
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Visibilité centralisée sur l'ensemble du parc. Repérez un problème en un coup d'œil
              grâce aux indicateurs lumineux.
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 mt-12">
          <div className="rounded-xl bg-slate-800/50 backdrop-blur border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span className="text-xs text-slate-400">Vert</span>
            </div>
            <p className="text-sm font-medium">Bon état</p>
          </div>
          <div className="rounded-xl bg-slate-800/50 backdrop-blur border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-xs text-slate-400">Rouge</span>
            </div>
            <p className="text-sm font-medium">Défaut / manquant</p>
          </div>
          <div className="rounded-xl bg-slate-800/50 backdrop-blur border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-400">Orange</span>
            </div>
            <p className="text-sm font-medium">À inspecter</p>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Connexion</h2>
          <p className="text-slate-500 mb-6">Accédez à votre espace de suivi</p>

          {/* Mode selector */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setMode('manager'); setError(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                mode === 'manager' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Building2 className="h-4 w-4" />
              Gérant
            </button>
            <button
              type="button"
              onClick={() => { setMode('admin'); setError(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                mode === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => { setMode('technician'); setError(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                mode === 'technician' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Wrench className="h-4 w-4" />
              Technicien
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

          {/* Demo credentials */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Comptes de démonstration
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="space-y-1.5">
              {mode === 'admin' ? (
                DEMO_CREDENTIALS.filter((c) => c.label.includes('Admin')).map((cred) => (
                  <button
                    key={cred.email}
                    onClick={() => fillCredentials(cred.email, cred.password)}
                    className="group flex items-center justify-between w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left hover:border-red-300 hover:bg-red-50/30 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{cred.label}</p>
                      <p className="text-xs text-slate-400 truncate">{cred.email}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-red-400 flex-shrink-0" />
                  </button>
                ))
              ) : mode === 'technician' ? (
                DEMO_CREDENTIALS.filter((c) => c.label.includes('Technicien')).map((cred) => (
                  <button
                    key={cred.email}
                    onClick={() => fillCredentials(cred.email, cred.password)}
                    className="group flex items-center justify-between w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left hover:border-red-300 hover:bg-red-50/30 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{cred.label}</p>
                      <p className="text-xs text-slate-400 truncate">{cred.email}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-red-400 flex-shrink-0" />
                  </button>
                ))
              ) : (
                DEMO_CREDENTIALS.filter((c) => !c.label.includes('Admin') && !c.label.includes('Technicien') && c.code).map((cred) => (
                  <button
                    key={cred.email}
                    onClick={() => fillStationCode(cred.code!)}
                    className="group flex items-center justify-between w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left hover:border-red-300 hover:bg-red-50/30 transition-all"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-mono font-semibold text-slate-600 tabular-nums">
                        {cred.code}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{cred.label}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-red-400 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
