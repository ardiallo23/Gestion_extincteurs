import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FireExtinguisher, Pencil, Search, ShieldCheck, AlertTriangle, XCircle,
  CalendarClock, MapPin, X, Gauge, Plus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { Extinguisher } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { cn, formatDate, validityState, validityDaysLeft, validityEndDate } from '@/lib/utils';
import {
  EXTINGUISHER_TYPES,
  EXTINGUISHER_LOCATIONS,
  EXTINGUISHER_PRESSURE_TYPES,
  EXTINGUISHER_CAPACITIES,
} from '@/lib/constants';

type SortField = 'label' | 'type' | 'pressure_type' | 'location' | 'serial_number' | 'capacity' | 'install_date' | 'last_inspection_date' | 'next_inspection_date' | 'active';
type SortDir = 'asc' | 'desc';
type ConformityFilter = 'all' | 'ok' | 'upcoming' | 'overdue' | 'inactive';

const typeColors: Record<string, { bg: string; text: string; ring: string }> = {
  CO2: { bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200' },
  Eau: { bg: 'bg-cyan-50', text: 'text-cyan-700', ring: 'ring-cyan-200' },
  Poudre: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200' },
};

function getTypeStyle(type: string | null) {
  return typeColors[type || ''] || { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200' };
}

function ComplianceBar({ state, days }: { state: 'overdue' | 'upcoming' | 'ok' | 'none'; days: number | null }) {
  const segments = 12;
  let filled: number;
  let color: string;
  if (state === 'ok') { filled = segments; color = 'bg-emerald-500'; }
  else if (state === 'upcoming') { filled = Math.max(2, Math.round(segments * Math.max(0, (days ?? 0)) / 30)); color = 'bg-amber-500'; }
  else if (state === 'overdue') { filled = segments; color = 'bg-red-500'; }
  else { filled = 0; color = 'bg-slate-300'; }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              state === 'overdue' ? color : i < filled ? color : 'bg-slate-200',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function ConformityBadge({ state, active, days }: { state: 'overdue' | 'upcoming' | 'ok' | 'none'; active: boolean; days: number | null }) {
  if (!active) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="flex flex-col gap-0.5 p-1 rounded-md bg-slate-900/5">
          <span className="h-2 w-2 rounded-full bg-slate-200" />
          <span className="h-2 w-2 rounded-full bg-slate-200" />
          <span className="h-2 w-2 rounded-full bg-slate-400 text-slate-400 animate-[trafficBlink_1.2s_ease-in-out_infinite]" />
        </span>
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Inactif</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="flex flex-col gap-0.5 p-1 rounded-md bg-slate-900/5">
        <span className={cn('h-2 w-2 rounded-full transition-all', state === 'ok' ? 'bg-emerald-500 text-emerald-500 animate-[trafficBlink_1.2s_ease-in-out_infinite]' : 'bg-slate-200')} />
        <span className={cn('h-2 w-2 rounded-full transition-all', state === 'upcoming' ? 'bg-amber-500 text-amber-500 animate-[trafficBlink_1.2s_ease-in-out_infinite]' : 'bg-slate-200')} />
        <span className={cn('h-2 w-2 rounded-full transition-all', state === 'overdue' ? 'bg-red-500 text-red-500 animate-[trafficBlink_0.8s_ease-in-out_infinite]' : 'bg-slate-200')} />
      </span>
      <div className="flex flex-col">
        <span className={cn(
          'text-xs font-semibold whitespace-nowrap leading-none',
          state === 'overdue' ? 'text-red-600' : state === 'upcoming' ? 'text-amber-600' : 'text-emerald-600',
        )}>
          {state === 'overdue' ? 'Non conforme' : state === 'upcoming' ? 'À venir' : 'Conforme'}
        </span>
        {days !== null && (
          <span className={cn(
            'text-[10px] font-medium mt-0.5',
            days < 0 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-slate-400',
          )}>
            {days < 0 ? `Retard ${Math.abs(days)}j` : `J-${days}`}
          </span>
        )}
      </div>
    </div>
  );
}

export function ManagerExtinguishers() {
  const { profile } = useAuth();
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterConformity, setFilterConformity] = useState<ConformityFilter>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('label');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Extinguisher | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [form, setForm] = useState({
    label: '',
    type: 'Poudre',
    pressure_type: 'Pression permanente',
    location: 'Piste',
    serial_number: '',
    capacity: '',
    install_date: '',
    last_inspection_date: '',
    next_inspection_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.station_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('extinguishers')
      .select('*')
      .eq('station_id', profile.station_id)
      .order('label');
    setExtinguishers((data as Extinguisher[]) || []);
    setLoading(false);
  }, [profile?.station_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEdit = (e: Extinguisher) => {
    setEditing(e);
    setIsAddMode(false);
    setForm({
      label: e.label,
      type: e.type || 'Poudre',
      pressure_type: e.pressure_type || 'Pression permanente',
      location: e.location || 'Piste',
      serial_number: e.serial_number || '',
      capacity: e.capacity || '',
      install_date: e.install_date || '',
      last_inspection_date: e.last_inspection_date || '',
      next_inspection_date: e.next_inspection_date || '',
    });
    setError(null);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setIsAddMode(true);
    setForm({
      label: '',
      type: 'Poudre',
      pressure_type: 'Pression permanente',
      location: 'Piste',
      serial_number: '',
      capacity: '',
      install_date: new Date().toISOString().split('T')[0],
      last_inspection_date: new Date().toISOString().split('T')[0],
      next_inspection_date: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) { setError('Le libellé est requis'); return; }
    if (!profile?.station_id) { setError('Station non identifiée'); return; }
    setSaving(true);
    setError(null);
    const computedNext = form.last_inspection_date
      ? validityEndDate(form.last_inspection_date, null)
      : form.next_inspection_date || null;
    const payload = {
      label: form.label.trim(),
      type: form.type,
      pressure_type: form.pressure_type,
      location: form.location,
      serial_number: form.serial_number.trim() || null,
      capacity: form.capacity.trim() || null,
      install_date: form.install_date || null,
      last_inspection_date: form.last_inspection_date || null,
      next_inspection_date: computedNext,
      station_id: profile.station_id,
      active: true,
    };
    if (editing && !isAddMode) {
      const { error: err } = await supabase.from('extinguishers').update(payload).eq('id', editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('extinguishers').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    setModalOpen(false);
    await loadData();
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const stats = useMemo(() => {
    const active = extinguishers.filter((e) => e.active);
    const ok = active.filter((e) => validityState(e.last_inspection_date, e.next_inspection_date) === 'ok').length;
    const upcoming = active.filter((e) => validityState(e.last_inspection_date, e.next_inspection_date) === 'upcoming').length;
    const overdue = active.filter((e) => validityState(e.last_inspection_date, e.next_inspection_date) === 'overdue').length;
    const inactive = extinguishers.filter((e) => !e.active).length;
    const total = extinguishers.length;
    return { ok, upcoming, overdue, inactive, total, active: active.length };
  }, [extinguishers]);

  const complianceRate = stats.total > 0 ? Math.round((stats.ok / stats.total) * 100) : 0;

  const filtered = useMemo(() => {
    let result = extinguishers;
    if (filterLocation !== 'all') result = result.filter((e) => e.location === filterLocation);
    if (filterType !== 'all') result = result.filter((e) => e.type === filterType);
    if (filterConformity !== 'all') {
      if (filterConformity === 'inactive') {
        result = result.filter((e) => !e.active);
      } else {
        result = result.filter((e) => e.active && validityState(e.last_inspection_date, e.next_inspection_date) === filterConformity);
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((e) =>
        e.label.toLowerCase().includes(q) ||
        (e.serial_number || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q),
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = [...result].sort((a, b) => {
      let av: string | number | boolean | null = a[sortField];
      let bv: string | number | boolean | null = b[sortField];
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return sorted;
  }, [extinguishers, filterLocation, filterType, filterConformity, search, sortField, sortDir]);

  const activeFiltersCount = [filterLocation !== 'all', filterType !== 'all', filterConformity !== 'all', search].filter(Boolean).length;

  const resetFilters = () => {
    setFilterLocation('all');
    setFilterType('all');
    setFilterConformity('all');
    setSearch('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/20">
            <FireExtinguisher className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mes extincteurs</h1>
            <p className="text-slate-500 mt-0.5">Gérez les extincteurs de votre station</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 hover:brightness-110 transition"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {/* Compliance overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Taux de conformité</span>
          </div>
          <p className="text-3xl font-bold tabular-nums leading-none">{complianceRate}%</p>
          <div className="mt-3 h-2 rounded-full bg-slate-700 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                complianceRate >= 75 ? 'bg-emerald-400' : complianceRate >= 50 ? 'bg-amber-400' : 'bg-red-400',
              )}
              style={{ width: `${complianceRate}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">{stats.ok} conformes sur {stats.total}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Conformes</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums leading-none">{stats.ok}</p>
          <p className="text-[10px] text-emerald-500 mt-1.5">Inspection à jour</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">À venir</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 tabular-nums leading-none">{stats.upcoming}</p>
          <p className="text-[10px] text-amber-500 mt-1.5">&lt; 30 jours</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-xs font-medium text-red-700">Non conformes</span>
          </div>
          <p className="text-2xl font-bold text-red-700 tabular-nums leading-none">{stats.overdue}</p>
          <p className="text-[10px] text-red-500 mt-1.5">Inspection dépassée</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FireExtinguisher className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">Inactifs</span>
          </div>
          <p className="text-2xl font-bold text-slate-600 tabular-nums leading-none">{stats.inactive}</p>
          <p className="text-[10px] text-slate-400 mt-1.5">Hors service</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (libellé, n° série…)"
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:border-red-400 focus:ring-2 focus:ring-red-500/10 outline-none transition"
          />
        </div>
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-red-400 focus:ring-2 focus:ring-red-500/10 outline-none transition cursor-pointer"
        >
          <option value="all">Tous les emplacements</option>
          {EXTINGUISHER_LOCATIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-red-400 focus:ring-2 focus:ring-red-500/10 outline-none transition cursor-pointer"
        >
          <option value="all">Tous les types</option>
          {EXTINGUISHER_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Réinitialiser ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{filtered.length}</span> extincteur{filtered.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-slate-400 hidden sm:block">Survolez une ligne pour modifier</p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="text-left py-3 px-3 font-medium text-slate-500 w-10"></th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap">Libellé</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap">Type</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden lg:table-cell">Pression</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap">Emplacement</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden xl:table-cell">Capacité</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden xl:table-cell">N° série</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden md:table-cell">Installation</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden lg:table-cell">Dernière insp.</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap min-w-[120px]">Expire le</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden sm:table-cell min-w-[180px]">Conformité</th>
                <th className="text-center py-3 px-3 font-medium text-slate-500 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => {
                const valState = e.active ? validityState(e.last_inspection_date, e.next_inspection_date) : 'none';
                const valDays = validityDaysLeft(e.last_inspection_date, e.next_inspection_date);
                const expiryDate = validityEndDate(e.last_inspection_date, e.next_inspection_date);
                const ts = getTypeStyle(e.type);
                return (
                  <tr
                    key={e.id}
                    className={cn(
                      'transition-colors hover:bg-slate-50/60 group',
                      !e.active && 'opacity-50',
                      e.active && valState === 'overdue' && 'bg-red-50/30',
                    )}
                  >
                    <td className="py-3.5 px-3">
                      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 ring-1', ts.bg, ts.ring)}>
                        <FireExtinguisher className={cn('h-4 w-4', ts.text)} />
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-slate-900 truncate">{e.label}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', ts.bg, ts.text)}>
                        {e.type || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 hidden lg:table-cell">
                      <span className="text-slate-500 text-xs">{e.pressure_type || '—'}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs">{e.location || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 hidden xl:table-cell">
                      <span className="text-slate-600 text-xs font-medium tabular-nums">{e.capacity || '—'}</span>
                    </td>
                    <td className="py-3.5 px-3 hidden xl:table-cell">
                      <span className="text-slate-500 font-mono text-xs tabular-nums">{e.serial_number || '—'}</span>
                    </td>
                    <td className="py-3.5 px-3 hidden md:table-cell">
                      <span className="text-slate-500 text-xs tabular-nums">{formatDate(e.install_date)}</span>
                    </td>
                    <td className="py-3.5 px-3 hidden lg:table-cell">
                      <span className="text-slate-500 text-xs tabular-nums">{formatDate(e.last_inspection_date)}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <CalendarClock className={cn('h-3.5 w-3.5 flex-shrink-0', valState === 'overdue' ? 'text-red-500' : valState === 'upcoming' ? 'text-amber-500' : 'text-slate-400')} />
                          <span className={cn(
                            'text-xs font-medium tabular-nums',
                            valState === 'overdue' ? 'text-red-600' : valState === 'upcoming' ? 'text-amber-600' : 'text-slate-600',
                          )}>
                            {formatDate(expiryDate)}
                          </span>
                        </div>
                        <ComplianceBar state={valState} days={valDays} />
                      </div>
                    </td>
                    <td className="py-3.5 px-3 hidden sm:table-cell min-w-[180px]">
                      <ConformityBadge state={valState} active={e.active} days={valDays} />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => openEdit(e)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-3">
              <FireExtinguisher className="h-8 w-8 opacity-30" />
            </div>
            <p className="font-medium text-slate-500">Aucun extincteur ne correspond à ces critères</p>
            <p className="text-xs text-slate-400 mt-1">Modifiez les filtres ou réinitialisez la recherche</p>
          </div>
        )}
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-3">
        {filtered.length > 0 && (
          <p className="text-sm text-slate-500 px-1">
            <span className="font-semibold text-slate-700">{filtered.length}</span> extincteur{filtered.length > 1 ? 's' : ''}
          </p>
        )}
        {filtered.map((e) => {
          const valState = e.active ? validityState(e.last_inspection_date, e.next_inspection_date) : 'none';
          const valDays = validityDaysLeft(e.last_inspection_date, e.next_inspection_date);
          const ts = getTypeStyle(e.type);
          return (
            <div
              key={e.id}
              className={cn(
                'rounded-xl bg-white border p-4 shadow-sm',
                e.active && valState === 'overdue' ? 'border-red-200' : 'border-slate-200',
                !e.active && 'opacity-60',
              )}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ring-1', ts.bg, ts.ring)}>
                  <FireExtinguisher className={cn('h-5 w-5', ts.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{e.label}</p>
                  <p className="text-xs text-slate-400 truncate">{e.type} · {e.pressure_type} · {e.capacity}</p>
                </div>
                <button
                  onClick={() => openEdit(e)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {e.location || '—'}
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarClock className={cn('h-3.5 w-3.5', valState === 'overdue' ? 'text-red-500' : valState === 'upcoming' ? 'text-amber-500' : 'text-slate-400')} />
                  <span className={cn('font-medium', valState === 'overdue' ? 'text-red-600' : valState === 'upcoming' ? 'text-amber-600' : 'text-slate-600')}>
                    {e.active ? (valState === 'overdue' ? 'Non conforme' : valState === 'upcoming' ? 'À venir' : 'Conforme') : 'Inactif'}
                    {valDays !== null && e.active && (
                      <span className="ml-1">({valDays < 0 ? `retard ${Math.abs(valDays)}j` : `J-${valDays}`})</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-3">
              <FireExtinguisher className="h-8 w-8 opacity-30" />
            </div>
            <p className="font-medium text-slate-500">Aucun extincteur ne correspond</p>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isAddMode ? "Ajouter un extincteur" : "Modifier l'extincteur"}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Libellé *</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
                placeholder="EXT-NORD-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
              >
                {EXTINGUISHER_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mode de mise en pression</label>
              <select
                value={form.pressure_type}
                onChange={(e) => setForm({ ...form, pressure_type: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
              >
                {EXTINGUISHER_PRESSURE_TYPES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Emplacement</label>
              <select
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
              >
                {EXTINGUISHER_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">N° de série</label>
              <input
                value={form.serial_number}
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
                placeholder="SN-N-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Capacité</label>
              <select
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
              >
                <option value="">—</option>
                {EXTINGUISHER_CAPACITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date d'installation</label>
              <input
                type="date"
                value={form.install_date}
                onChange={(e) => setForm({ ...form, install_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Dernière inspection</label>
              <input
                type="date"
                value={form.last_inspection_date}
                onChange={(e) => {
                  const newLast = e.target.value;
                  const autoNext = newLast ? validityEndDate(newLast, null) : '';
                  setForm({ ...form, last_inspection_date: newLast, next_inspection_date: autoNext || form.next_inspection_date });
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prochaine inspection <span className="text-xs font-normal text-slate-400">(auto : +1 an)</span></label>
              <input
                type="date"
                value={form.next_inspection_date}
                onChange={(e) => setForm({ ...form, next_inspection_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
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
              {saving ? 'Enregistrement…' : isAddMode ? 'Ajouter' : 'Modifier'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
