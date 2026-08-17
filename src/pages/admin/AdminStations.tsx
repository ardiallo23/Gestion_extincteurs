import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Building2, Plus, Pencil, Trash2, MapPin, Flame, XCircle,
  CheckCircle2, Circle, LayoutGrid, Wrench, Droplets, ShoppingBag, Zap, Fuel, Plug,
  Search, X, ChevronRight, Building, Crosshair, UserCircle, Layers,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Station } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';

type StationForm = {
  code: string;
  name: string;
  address: string;
  city: string;
  track_islands: number;
  has_service_bay: boolean;
  has_wash_bay: boolean;
  has_shop: boolean;
  electrical_cabinets: number;
  has_depotting_zone: boolean;
  has_generator_room: boolean;
};

const emptyForm: StationForm = {
  code: '',
  name: '',
  address: '',
  city: '',
  track_islands: 0,
  has_service_bay: false,
  has_wash_bay: false,
  has_shop: false,
  electrical_cabinets: 0,
  has_depotting_zone: false,
  has_generator_room: false,
};

const INFRA_ITEMS = [
  { key: 'track_islands', label: 'Îlots piste', short: 'Piste', icon: LayoutGrid, type: 'count' as const },
  { key: 'has_service_bay', label: 'Baie de service', short: 'Service', icon: Wrench, type: 'bool' as const },
  { key: 'has_wash_bay', label: 'Baie de lavage', short: 'Lavage', icon: Droplets, type: 'bool' as const },
  { key: 'has_shop', label: 'Boutique', short: 'Boutique', icon: ShoppingBag, type: 'bool' as const },
  { key: 'electrical_cabinets', label: 'Armoires électriques', short: 'Élec.', icon: Zap, type: 'count' as const },
  { key: 'has_depotting_zone', label: 'Zone de dépotage', short: 'Dépotage', icon: Fuel, type: 'bool' as const },
  { key: 'has_generator_room', label: 'Local groupe électrogène', short: 'Local GE', icon: Plug, type: 'bool' as const },
] as const;

function ToggleField({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium transition-all',
        value
          ? 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200 shadow-sm shadow-red-500/5'
          : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300',
      )}
    >
      {value ? (
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-red-500" />
      ) : (
        <Circle className="h-4 w-4 flex-shrink-0 text-slate-300" />
      )}
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-left flex-1">{label}</span>
    </button>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  sublabel,
  gradient,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
  sublabel?: string;
  gradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow group">
      <div className={cn('absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-10 transition-opacity group-hover:opacity-20', gradient)} />
      <div className="relative flex items-center gap-3.5">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md flex-shrink-0', gradient)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
          <p className="text-xs font-medium text-slate-500 mt-1.5 truncate">{label}</p>
          {sublabel && <p className="text-[10px] text-slate-400 mt-0.5">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

export function AdminStations() {
  const [stations, setStations] = useState<(Station & { ext_count: number; manager_name: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [form, setForm] = useState<StationForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('stations').select('*').order('name');
    const { data: extData } = await supabase
      .from('extinguishers')
      .select('station_id, id')
      .eq('active', true);
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, station_id, role')
      .eq('role', 'manager');

    const extCount = new Map<string, number>();
    extData?.forEach((e: any) => {
      extCount.set(e.station_id, (extCount.get(e.station_id) || 0) + 1);
    });
    const managerMap = new Map<string, string>();
    profileData?.forEach((p: any) => {
      if (p.station_id) managerMap.set(p.station_id, p.full_name || '');
    });

    setStations(
      (data || []).map((s: Station) => ({
        ...s,
        ext_count: extCount.get(s.id) || 0,
        manager_name: managerMap.get(s.id) || null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (s: Station) => {
    setEditing(s);
    setForm({
      code: s.code || '',
      name: s.name,
      address: s.address || '',
      city: s.city || '',
      track_islands: s.track_islands,
      has_service_bay: s.has_service_bay,
      has_wash_bay: s.has_wash_bay,
      has_shop: s.has_shop,
      electrical_cabinets: s.electrical_cabinets,
      has_depotting_zone: s.has_depotting_zone,
      has_generator_room: s.has_generator_room,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      setError('Le code station est requis');
      return;
    }
    if (!form.name.trim()) {
      setError('Le nom est requis');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      track_islands: form.track_islands,
      has_service_bay: form.has_service_bay,
      has_wash_bay: form.has_wash_bay,
      has_shop: form.has_shop,
      electrical_cabinets: form.electrical_cabinets,
      has_depotting_zone: form.has_depotting_zone,
      has_generator_room: form.has_generator_room,
    };
    if (editing) {
      const { error: err } = await supabase.from('stations').update(payload).eq('id', editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('stations').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    setModalOpen(false);
    await loadStations();
  };

  const handleDelete = async (s: Station) => {
    if (!confirm(`Supprimer la station "${s.name}" ? Tous ses extincteurs et historique seront supprimés.`)) return;
    await supabase.from('stations').delete().eq('id', s.id);
    setSelectedId(null);
    await loadStations();
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return stations;
    const q = search.trim().toLowerCase();
    return stations.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q) ||
      (s.manager_name || '').toLowerCase().includes(q),
    );
  }, [stations, search]);

  const selected = useMemo(
    () => stations.find((s) => s.id === selectedId) || null,
    [stations, selectedId],
  );

  const stats = useMemo(() => {
    const total = stations.length;
    const totalExt = stations.reduce((s, st) => s + st.ext_count, 0);
    const totalInfra = stations.reduce((s, st) => {
      return s + INFRA_ITEMS.reduce((acc, item) => {
        const val = st[item.key as keyof Station] as boolean | number;
        const active = typeof val === 'number' ? val > 0 : val;
        return acc + (active ? 1 : 0);
      }, 0);
    }, 0);
    const avgExt = total > 0 ? Math.round(totalExt / total) : 0;
    return { total, totalExt, totalInfra, avgExt };
  }, [stations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-red-500 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-orange-500 blur-3xl" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/30 ring-1 ring-white/10">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Stations</h1>
              <p className="text-slate-400 mt-0.5 text-sm">Gestion du parc et de l'infrastructure</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-medium text-slate-900 shadow-lg hover:bg-slate-50 hover:scale-[1.02] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle station</span>
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStat icon={Building} label="Stations totales" value={stats.total} gradient="bg-gradient-to-br from-red-500 to-orange-500" />
        <SummaryStat icon={Flame} label="Extincteurs actifs" value={stats.totalExt} gradient="bg-gradient-to-br from-sky-500 to-blue-600" />
        <SummaryStat icon={Layers} label="Équipements infrastructure" value={stats.totalInfra} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <SummaryStat icon={Crosshair} label="Moyenne par station" value={stats.avgExt} sublabel="extincteurs / station" gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom, ville, gérant…)"
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 outline-none transition"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Effacer
          </button>
        )}
      </div>

      {/* List layout */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{filtered.length}</span> station{filtered.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-slate-400 hidden sm:block">Cliquez une ligne pour les détails · Survolez pour les actions</p>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {filtered.map((s, idx) => {
            const infraCount = INFRA_ITEMS.reduce((acc, item) => {
              const val = s[item.key as keyof Station] as boolean | number;
              const active = typeof val === 'number' ? val > 0 : val;
              return acc + (active ? 1 : 0);
            }, 0);
            const isSelected = selectedId === s.id;

            return (
              <div
                key={s.id}
                className={cn(
                  'group relative flex items-center gap-4 pl-5 pr-5 py-4 transition-all cursor-pointer count-up',
                  isSelected ? 'bg-red-50/40' : 'hover:bg-slate-50/50',
                )}
                style={{ animationDelay: `${idx * 0.04}s` }}
                onClick={() => setSelectedId(isSelected ? null : s.id)}
              >
                {/* Left accent bar */}
                <div className={cn(
                  'absolute left-0 top-0 bottom-0 w-1 transition-all',
                  isSelected ? 'bg-gradient-to-b from-red-500 to-orange-500 opacity-100'
                  : 'bg-gradient-to-b from-red-500 to-orange-500 opacity-0 group-hover:opacity-40',
                )} />

                {/* Icon + name */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 transition-all',
                    isSelected
                      ? 'bg-gradient-to-br from-red-500 to-orange-500 shadow-md shadow-red-500/20'
                      : 'bg-slate-100 group-hover:bg-slate-200',
                  )}>
                    <Building2 className={cn('h-6 w-6 transition-colors', isSelected ? 'text-white' : 'text-slate-500')} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600 tabular-nums">
                        {s.code}
                      </span>
                      <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{s.city || 'Ville non renseignée'}{s.address ? ` · ${s.address}` : ''}</span>
                    </p>
                  </div>
                </div>

                {/* Infrastructure chips — desktop */}
                <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
                  {INFRA_ITEMS.map((item) => {
                    const val = s[item.key as keyof Station] as boolean | number;
                    const active = typeof val === 'number' ? val > 0 : val;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.key}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                          active
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                            : 'bg-slate-50 text-slate-300',
                        )}
                        title={item.label}
                      >
                        <Icon className={cn('h-3.5 w-3.5', active ? 'text-emerald-600' : 'text-slate-300')} />
                        <span>{typeof val === 'number' ? `${val}` : ''}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Ext count — framed */}
                <div className="flex flex-col items-center justify-center flex-shrink-0 w-14 h-12 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-lg font-bold text-slate-800 tabular-nums leading-none">{s.ext_count}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wide">ext.</span>
                </div>

                {/* Manager */}
                <div className="hidden md:flex items-center gap-2 flex-shrink-0 w-40">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 flex-shrink-0">
                    <UserCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 truncate">{s.manager_name}</span>
                </div>

                {/* Infra count — mobile */}
                <div className="flex lg:hidden items-center gap-1.5 flex-shrink-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                    <Crosshair className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-600 tabular-nums">{infraCount}/7</span>
                </div>

                {/* Chevron */}
                <ChevronRight className={cn(
                  'h-4 w-4 flex-shrink-0 transition-all',
                  isSelected ? 'rotate-90 text-red-500' : 'text-slate-300 group-hover:text-slate-400',
                )} />

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-3">
              <Building2 className="h-8 w-8 opacity-30" />
            </div>
            <p className="font-medium text-slate-500">Aucune station ne correspond à votre recherche</p>
            <p className="text-xs text-slate-400 mt-1">Modifiez la recherche ou créez une nouvelle station</p>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden fade-in-scale">
          {/* Gradient header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-5">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-red-500 blur-3xl" />
            </div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/20 ring-1 ring-white/10">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 text-xs font-mono font-semibold text-slate-200 tabular-nums ring-1 ring-white/15">
                      {selected.code}
                    </span>
                    <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {selected.address || 'Adresse non renseignée'}{selected.city ? ` · ${selected.city}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Infrastructure detail */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">Infrastructure équipée</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {INFRA_ITEMS.map((item) => {
                  const val = selected[item.key as keyof Station] as boolean | number;
                  const active = typeof val === 'number' ? val > 0 : val;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className={cn(
                        'rounded-xl border p-3 transition-all',
                        active
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-slate-100 bg-slate-50/30',
                      )}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0',
                          active ? 'bg-emerald-100' : 'bg-slate-100',
                        )}>
                          <Icon className={cn('h-4 w-4', active ? 'text-emerald-600' : 'text-slate-300')} />
                        </div>
                        {active ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-300 ml-auto flex-shrink-0" />
                        )}
                      </div>
                      <p className={cn('text-xs font-medium truncate', active ? 'text-slate-700' : 'text-slate-400')}>
                        {item.short}
                      </p>
                      <p className={cn('text-[11px] mt-0.5', active ? 'text-emerald-600 font-semibold' : 'text-slate-400')}>
                        {typeof val === 'number' ? `${val} unité${val > 1 ? 's' : ''}` : val ? 'Présent' : 'Absent'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary sidebar */}
            <div className="space-y-3">
              {/* Ext count card */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-orange-500 p-4 text-white shadow-lg shadow-red-500/20">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-4 w-4 text-white/80" />
                    <span className="text-xs font-medium text-white/80">Extincteurs actifs</span>
                  </div>
                  <p className="text-3xl font-bold tabular-nums leading-none">{selected.ext_count}</p>
                  <p className="text-[10px] text-white/60 mt-1.5">sur cette station</p>
                </div>
              </div>

              {/* Manager card */}
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                    <UserCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">Gérant assigné</span>
                </div>
                <p className="text-sm font-bold text-emerald-800 pl-1">
                  {selected.manager_name}
                </p>
              </div>

              <button
                onClick={() => openEdit(selected)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
              >
                <Pencil className="h-4 w-4" />
                Modifier la station
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier la station' : 'Nouvelle station'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Code station *</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition font-mono"
                  placeholder="ST-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
                  placeholder="Station Nord"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Adresse</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
                placeholder="12 Avenue des Lilas"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ville</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
                placeholder="Lille"
              />
            </div>
          </div>

          {/* Infrastructure section */}
          <div className="rounded-xl bg-slate-50/70 border border-slate-100 p-4 space-y-4">
            <p className="text-sm font-semibold text-slate-700">Infrastructure de la station</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Nombre d'îlots sur la piste</label>
                <input
                  type="number"
                  min={0}
                  value={form.track_islands}
                  onChange={(e) => setForm({ ...form, track_islands: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Nombre d'armoires électriques</label>
                <input
                  type="number"
                  min={0}
                  value={form.electrical_cabinets}
                  onChange={(e) => setForm({ ...form, electrical_cabinets: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ToggleField
                label="Baie de service"
                icon={Wrench}
                value={form.has_service_bay}
                onChange={(v) => setForm({ ...form, has_service_bay: v })}
              />
              <ToggleField
                label="Baie de lavage"
                icon={Droplets}
                value={form.has_wash_bay}
                onChange={(v) => setForm({ ...form, has_wash_bay: v })}
              />
              <ToggleField
                label="Boutique"
                icon={ShoppingBag}
                value={form.has_shop}
                onChange={(v) => setForm({ ...form, has_shop: v })}
              />
              <ToggleField
                label="Zone de depotage"
                icon={Fuel}
                value={form.has_depotting_zone}
                onChange={(v) => setForm({ ...form, has_depotting_zone: v })}
              />
              <ToggleField
                label="Local GE (groupe électrogène)"
                icon={Plug}
                value={form.has_generator_room}
                onChange={(v) => setForm({ ...form, has_generator_room: v })}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/20 hover:brightness-110 transition disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
