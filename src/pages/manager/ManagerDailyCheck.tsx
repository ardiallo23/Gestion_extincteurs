import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Save,
  Flame,
  AlertTriangle,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { Extinguisher, DailyCheck as DailyCheckType } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

interface CheckForm {
  status: 'good' | 'defective';
  pressure_ok: boolean;
  seal_ok: boolean;
  accessible: boolean;
  last_inspection_date: string;
  comment: string;
}

export function ManagerDailyCheck() {
  const { profile } = useAuth();
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [existingChecks, setExistingChecks] = useState<Map<string, DailyCheckType>>(new Map());
  const [forms, setForms] = useState<Record<string, CheckForm>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.station_id) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [extRes, checksRes] = await Promise.all([
      supabase
        .from('extinguishers')
        .select('*')
        .eq('station_id', profile.station_id)
        .eq('active', true)
        .order('label'),
      supabase
        .from('daily_checks')
        .select('*')
        .eq('station_id', profile.station_id)
        .eq('check_date', today),
    ]);

    setExtinguishers(extRes.data || []);
    const cMap = new Map<string, DailyCheckType>();
    (checksRes.data || []).forEach((c) => cMap.set(c.extinguisher_id, c as DailyCheckType));
    setExistingChecks(cMap);

    // Initialize forms
    const newForms: Record<string, CheckForm> = {};
    (extRes.data || []).forEach((e: Extinguisher) => {
      const existing = cMap.get(e.id);
      if (existing) {
        newForms[e.id] = {
          status: existing.status,
          pressure_ok: existing.pressure_ok,
          seal_ok: existing.seal_ok,
          accessible: existing.accessible,
          last_inspection_date: existing.last_inspection_date || e.last_inspection_date || '',
          comment: existing.comment || '',
        };
      } else {
        newForms[e.id] = {
          status: 'good',
          pressure_ok: true,
          seal_ok: true,
          accessible: true,
          last_inspection_date: e.last_inspection_date || '',
          comment: '',
        };
      }
    });
    setForms(newForms);
    setLoading(false);
  }, [profile?.station_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (extinguisherId: string) => {
    const form = forms[extinguisherId];
    if (!form || !profile?.station_id) return;
    setSavingId(extinguisherId);
    setError(null);

    const existing = existingChecks.get(extinguisherId);
    const payload = {
      extinguisher_id: extinguisherId,
      station_id: profile.station_id,
      check_date: new Date().toISOString().split('T')[0],
      status: form.status,
      pressure_ok: form.pressure_ok,
      seal_ok: form.seal_ok,
      accessible: form.accessible,
      last_inspection_date: form.last_inspection_date || null,
      comment: form.comment.trim() || null,
      created_by: profile.id,
    };

    if (existing) {
      const { error: err } = await supabase.from('daily_checks').update(payload).eq('id', existing.id);
      if (err) {
        setError(err.message);
        setSavingId(null);
        return;
      }
    } else {
      const { data, error: err } = await supabase.from('daily_checks').insert(payload).select('*').maybeSingle();
      if (err) {
        setError(err.message);
        setSavingId(null);
        return;
      }
      if (data) {
        setExistingChecks(new Map(existingChecks).set(extinguisherId, data as DailyCheckType));
      }
    }

    setSavingId(null);
    setSavedId(extinguisherId);
    setTimeout(() => setSavedId(null), 2000);
  };

  const updateForm = (id: string, updates: Partial<CheckForm>) => {
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  };

  // Auto-set defective if any check fails
  const autoStatus = (form: CheckForm): 'good' | 'defective' => {
    if (!form.pressure_ok || !form.seal_ok || !form.accessible) return 'defective';
    return form.status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  const completedCount = extinguishers.filter((e) => existingChecks.has(e.id)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saisie quotidienne</h1>
          <p className="text-slate-500 mt-1">
            {completedCount}/{extinguishers.length} extincteur(s) vérifié(s) aujourd'hui · {formatDate(new Date().toISOString())}
          </p>
        </div>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            completedCount === extinguishers.length && extinguishers.length > 0
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700',
          )}
        >
          {completedCount === extinguishers.length && extinguishers.length > 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Saisie complète
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4" />
              {extinguishers.length - completedCount} restant(s)
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {extinguishers.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Flame className="h-10 w-10 mx-auto mb-2 opacity-30" />
          Aucun extincteur actif à vérifier.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {extinguishers.map((ext) => {
            const form = forms[ext.id];
            if (!form) return null;
            const isSaved = existingChecks.has(ext.id);
            const justSaved = savedId === ext.id;
            const effectiveStatus = autoStatus(form);

            return (
              <div
                key={ext.id}
                className={cn(
                  'rounded-xl bg-white border p-5 shadow-sm transition-all',
                  isSaved
                    ? effectiveStatus === 'good'
                      ? 'border-emerald-200'
                      : 'border-red-200'
                    : 'border-slate-200',
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        isSaved
                          ? effectiveStatus === 'good'
                            ? 'bg-emerald-100'
                            : 'bg-red-100'
                          : 'bg-slate-100',
                      )}
                    >
                      <Flame
                        className={cn(
                          'h-5 w-5',
                          isSaved
                            ? effectiveStatus === 'good'
                              ? 'text-emerald-600'
                              : 'text-red-600'
                            : 'text-slate-500',
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{ext.label}</p>
                      <p className="text-xs text-slate-400">
                        {ext.type} · {ext.pressure_type} · {ext.capacity} · {ext.location}
                      </p>
                    </div>
                  </div>
                  {isSaved && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        effectiveStatus === 'good'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700',
                      )}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Enregistré
                    </span>
                  )}
                </div>

                {/* Status toggle */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-500 mb-2">État général</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateForm(ext.id, { status: 'good' })}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition',
                        form.status === 'good'
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Bon état
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm(ext.id, { status: 'defective' })}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition',
                        form.status === 'defective'
                          ? 'border-red-400 bg-red-50 text-red-700 ring-2 ring-red-200'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                      )}
                    >
                      <XCircle className="h-4 w-4" />
                      Défectueux
                    </button>
                  </div>
                </div>

                {/* Check toggles */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <CheckToggle
                    label="Pression"
                    ok={form.pressure_ok}
                    onChange={(v) => updateForm(ext.id, { pressure_ok: v })}
                  />
                  <CheckToggle
                    label="Plombage"
                    ok={form.seal_ok}
                    onChange={(v) => updateForm(ext.id, { seal_ok: v })}
                  />
                  <CheckToggle
                    label="Accessible"
                    ok={form.accessible}
                    onChange={(v) => updateForm(ext.id, { accessible: v })}
                  />
                </div>

                {/* Last inspection date */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Date de dernière vérification
                  </label>
                  <input
                    type="date"
                    value={form.last_inspection_date}
                    onChange={(e) => updateForm(ext.id, { last_inspection_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
                  />
                </div>

                {/* Comment */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    <MessageSquare className="h-3 w-3 inline mr-1" />
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    value={form.comment}
                    onChange={(e) => updateForm(ext.id, { comment: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition resize-none"
                    placeholder="Observations…"
                  />
                </div>

                {/* Save button */}
                <button
                  onClick={() => handleSave(ext.id)}
                  disabled={savingId === ext.id}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                    justSaved
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20 hover:brightness-110',
                    'disabled:opacity-60',
                  )}
                >
                  {savingId === ext.id ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : justSaved ? (
                    <>
                      <Check className="h-4 w-4" />
                      Enregistré !
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {isSaved ? 'Mettre à jour' : 'Enregistrer'}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CheckToggle({
  label,
  ok,
  onChange,
}: {
  label: string;
  ok: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!ok)}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-lg border py-2.5 text-xs font-medium transition',
        ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700',
      )}
    >
      <span
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full',
          ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white',
        )}
      >
        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </span>
      {label}
    </button>
  );
}
