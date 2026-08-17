import { Flame } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-2xl bg-red-500/30" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
            <Flame className="h-8 w-8 text-white" />
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium">Chargement…</p>
      </div>
    </div>
  );
}
