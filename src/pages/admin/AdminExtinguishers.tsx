import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FireExtinguisher,
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CalendarClock,
  MapPin,
  X,
  Gauge,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Station, Extinguisher } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { cn, formatDate, validityState, validityDaysLeft, validityEndDate } from '@/lib/utils';
import {
  EXTINGUISHER_TYPES,
  EXTINGUISHER_LOCATIONS,
  EXTINGUISHER_PRESSURE_TYPES,
  EXTINGUISHER_CAPACITIES,
} from '@/lib/constants';

type SortField = 'station_name' | 'label' | 'type' | 'pressure_type' | 'location' | 'serial_number' | 'capacity' | 'install_date' | 'last_inspection_date' | 'next_inspection_date' | 'active';
type SortDir = 'asc' | 'desc';
type ConformityFilter = 'all' | 'ok' | 'upcoming' | 'overdue' | 'inactive';

const emptyForm = {
  station_id: '',
  label: '',
  type: 'Poudre',
  pressure_type: 'Pression permanente' as string,
  location: 'Piste',
  serial_number: '',
  capacity: '',
  install_date: '',
  last_inspection_date: '',
  next_inspection_date: '',
  active: true,
};

const typeColors: Record<string, { bg: string; text: string; ring: string }> = {
  CO2: { bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200' },
  Eau: { bg: 'bg-cyan-50', text: 'text-cyan-700', ring: 'ring-cyan-200' },
  Poudre: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200' },
};

function getTypeStyle(type: string | null) {
  return typeColors[type || ''] || { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200' };
}

function SortBtnInline({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1.5 hover:text-slate-700 transition-colors whitespace-nowrap"
    >
      {label}
      {!isActive ? (
        <ArrowUpDown className="h-3 w-3 text-slate-300" />
      ) : sortDir === 'asc' ? (
        <ArrowUp className="h-3 w-3 text-red-500" />
      ) : (
        <ArrowDown className="h-3 w-3 text-red-500" />
      )}
    </button>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accent,
  filter,
  currentFilter,
  onFilter,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: number;
  sublabel?: string;
  accent: 'emerald' | 'amber' | 'red' | 'slate' | 'blue';
  filter: ConformityFilter;
  currentFilter: ConformityFilter;
  onFilter: (f: ConformityFilter) => void;
}) {
  const accents: Record<string, { bar: string; iconBg: string; iconText: string; ring: string; activeBg: string; activeRing: string }> = {
    emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', ring: 'ring-emerald-200', activeBg: 'bg-emerald-50', activeRing: 'ring-emerald-300' },
    amber: { bar: 'bg-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600', ring: 'ring-amber-200', activeBg: 'bg-amber-50', activeRing: 'ring-amber-300' },
    red: { bar: 'bg-red-500', iconBg: 'bg-red-50', iconText: 'text-red-600', ring: 'ring-red-200', activeBg: 'bg-red-50', activeRing: 'ring-red-300' },
    slate: { bar: 'bg-slate-400', iconBg: 'bg-slate-100', iconText: 'text-slate-500', ring: 'ring-slate-200', activeBg: 'bg-slate-100', activeRing: 'ring-slate-300' },
    blue: { bar: 'bg-sky-500', iconBg: 'bg-sky-50', iconText: 'text-sky-600', ring: 'ring-sky-200', activeBg: 'bg-sky-50', activeRing: 'ring-sky-300' },
  };
  const a = accents[accent];
  const isActive = currentFilter === filter;
  return (
    <button
      onClick={() => onFilter(isActive ? 'all' : filter)}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-white p-4 text-left transition-all duration-200 hover:shadow-md',
        isActive ? cn('ring-2', a.activeRing, a.activeBg) : 'border-slate-200 hover:border-slate-300',
      )}
    >
      <div className={cn('absolute left-0 top-0 h-full w-1', a.bar)} />
      <div className="flex items-center gap-3 pl-1.5">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0', a.iconBg)}>
          <Icon className={cn('h-5 w-5', a.iconText)} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
          <p className="text-xs font-medium text-slate-500 mt-1 truncate">{label}</p>
          {sublabel && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sublabel}</p>}
        </div>
      </div>
    </button>
  );
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
              state === 'overdue'
                ? color
                : i < filled ? color : 'bg-slate-200',
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
        {/* Green — conforme */}
        <span className={cn('h-2 w-2 rounded-full transition-all', state === 'ok' ? 'bg-emerald-500 text-emerald-500 animate-[trafficBlink_1.2s_ease-in-out_infinite]' : 'bg-slate-200')} />
        {/* Orange — à venir */}
        <span className={cn('h-2 w-2 rounded-full transition-all', state === 'upcoming' ? 'bg-amber-500 text-amber-500 animate-[trafficBlink_1.2s_ease-in-out_infinite]' : 'bg-slate-200')} />
        {/* Red — non conforme */}
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

export function AdminExtinguishers() {
  const [extinguishers, setExtinguishers] = useState<(Extinguisher & { station?: Station })[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStation, setFilterStation] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterConformity, setFilterConformity] = useState<ConformityFilter>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('station_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Extinguisher | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [extRes, stRes] = await Promise.all([
      supabase.from('extinguishers').select('*, station:stations(*)').order('label'),
      supabase.from('stations').select('*').order('name'),
    ]);
    setExtinguishers((extRes.data as any[]) || []);
    setStations(stRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, station_id: stations[0]?.id || '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (e: Extinguisher) => {
    setEditing(e);
    setForm({
      station_id: e.station_id,
      label: e.label,
      type: e.type || 'Poudre',
      pressure_type: e.pressure_type || 'Pression permanente',
      location: e.location || 'Piste',
      serial_number: e.serial_number || '',
      capacity: e.capacity || '',
      install_date: e.install_date || '',
      last_inspection_date: e.last_inspection_date || '',
      next_inspection_date: e.next_inspection_date || '',
      active: e.active,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) { setError('Le libellé est requis'); return; }
    if (!form.station_id) { setError('La station est requise'); return; }
    setSaving(true);
    setError(null);
    const computedNext = form.last_inspection_date
      ? validityEndDate(form.last_inspection_date, null)
      : form.next_inspection_date || null;
    const payload = {
      station_id: form.station_id,
      label: form.label.trim(),
      type: form.type,
      pressure_type: form.pressure_type,
      location: form.location,
      serial_number: form.serial_number.trim() || null,
      capacity: form.capacity.trim() || null,
      install_date: form.install_date || null,
      last_inspection_date: form.last_inspection_date || null,
      next_inspection_date: computedNext,
      active: form.active,
    };
    if (editing) {
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

  const handleDelete = async (e: Extinguisher) => {
    if (!confirm(`Supprimer l'extincteur "${e.label}" ? Son historique sera supprimé.`)) return;
    await supabase.from('extinguishers').delete().eq('id', e.id);
    await loadData();
  };

  const toggleActive = async (e: Extinguisher) => {
    await supabase.from('extinguishers').update({ active: !e.active }).eq('id', e.id);
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
    if (filterStation !== 'all') result = result.filter((e) => e.station_id === filterStation);
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
        (e.station?.name || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q),
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = [...result].sort((a, b) => {
      let av: string | number | boolean | null = a[sortField];
      let bv: string | number | boolean | null = b[sortField];
      if (sortField === 'station_name') { av = a.station?.name || ''; bv = b.station?.name || ''; }
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return sorted;
  }, [extinguishers, filterStation, filterLocation, filterType, filterConformity, search, sortField, sortDir]);

  const activeFiltersCount = [filterStation !== 'all', filterLocation !== 'all', filterType !== 'all', filterConformity !== 'all', search].filter(Boolean).length;

  const resetFilters = () => {
    setFilterStation('all');
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/20">
            <FireExtinguisher className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Extincteurs</h1>
            <p className="text-slate-500 mt-0.5">Suivi et conformité du parc d'extincteurs</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          disabled={stations.length === 0}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2.5 text-white font-medium shadow-lg shadow-red-500/20 hover:brightness-110 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvel extincteur</span>
        </button>
      </div>

      {/* Compliance overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-lg">
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

        <StatCard icon={ShieldCheck} label="Conformes" value={stats.ok} sublabel="Inspection à jour" accent="emerald" filter="ok" currentFilter={filterConformity} onFilter={setFilterConformity} />
        <StatCard icon={AlertTriangle} label="À venir" value={stats.upcoming} sublabel="< 30 jours" accent="amber" filter="upcoming" currentFilter={filterConformity} onFilter={setFilterConformity} />
        <StatCard icon={XCircle} label="Non conformes" value={stats.overdue} sublabel="Inspection dépassée" accent="red" filter="overdue" currentFilter={filterConformity} onFilter={setFilterConformity} />
        <StatCard icon={FireExtinguisher} label="Inactifs" value={stats.inactive} sublabel="Hors service" accent="slate" filter="inactive" currentFilter={filterConformity} onFilter={setFilterConformity} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (libellé, n° série, station…)"
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:border-red-400 focus:ring-2 focus:ring-red-500/10 outline-none transition"
          />
        </div>
        <select
          value={filterStation}
          onChange={(e) => setFilterStation(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-red-400 focus:ring-2 focus:ring-red-500/10 outline-none transition cursor-pointer"
        >
          <option value="all">Toutes les stations</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
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

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{filtered.length}</span> extincteur{filtered.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-slate-400 hidden sm:block">Cliquez un en-tête pour trier · Survolez une ligne pour les actions</p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="text-left py-3 px-3 font-medium text-slate-500 w-10"></th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap">
                  <SortBtnInline field="label" label="Libellé" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap">
                  <SortBtnInline field="station_name" label="Station" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap">
                  <SortBtnInline field="type" label="Type" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden lg:table-cell">Pression</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap">
                  <SortBtnInline field="location" label="Emplacement" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden xl:table-cell">
                  <SortBtnInline field="capacity" label="Capacité" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden xl:table-cell">N° série</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden md:table-cell">
                  <SortBtnInline field="install_date" label="Installation" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden lg:table-cell">Dernière insp.</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap min-w-[120px]">
                  <SortBtnInline field="next_inspection_date" label="Expire le" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-left py-3 px-3 font-medium text-slate-500 whitespace-nowrap hidden sm:table-cell min-w-[180px]">Conformité</th>
                <th className="text-center py-3 px-3 font-medium text-slate-500 whitespace-nowrap">Actions</th>
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
                    {/* Type icon */}
                    <td className="py-3.5 px-3">
                      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 ring-1', ts.bg, ts.ring)}>
                        <FireExtinguisher className={cn('h-4 w-4', ts.text)} />
                      </div>
                    </td>

                    {/* Label */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">{e.label}</span>
                      </div>
                    </td>

                    {/* Station */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate block max-w-[140px] text-xs">{e.station?.name || '—'}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-3">
                      <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', ts.bg, ts.text)}>
                        {e.type || '—'}
                      </span>
                    </td>

                    {/* Pressure */}
                    <td className="py-3.5 px-3 hidden lg:table-cell">
                      <span className="text-slate-500 text-xs">{e.pressure_type || '—'}</span>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-3">
                      <span className="text-slate-600 text-xs">{e.location || '—'}</span>
                    </td>

                    {/* Capacity */}
                    <td className="py-3.5 px-3 hidden xl:table-cell">
                      <span className="text-slate-600 text-xs font-medium tabular-nums">{e.capacity || '—'}</span>
                    </td>

                    {/* Serial number */}
                    <td className="py-3.5 px-3 hidden xl:table-cell">
                      <span className="text-slate-500 font-mono text-xs tabular-nums">{e.serial_number || '—'}</span>
                    </td>

                    {/* Install date */}
                    <td className="py-3.5 px-3 hidden md:table-cell">
                      <span className="text-slate-500 text-xs tabular-nums">{formatDate(e.install_date)}</span>
                    </td>

                    {/* Last inspection */}
                    <td className="py-3.5 px-3 hidden lg:table-cell">
                      <span className="text-slate-500 text-xs tabular-nums">{formatDate(e.last_inspection_date)}</span>
                    </td>

                    {/* Next inspection with compliance bar */}
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

                    {/* Conformity badge — traffic light */}
                    <td className="py-3.5 px-3 hidden sm:table-cell min-w-[180px]">
                      <button
                        onClick={() => toggleActive(e)}
                        className="cursor-pointer"
                        title={
                          !e.active
                            ? 'Inactif — cliquer pour réactiver'
                            : valState === 'overdue'
                              ? `Non conforme — validité dépassée de ${Math.abs(valDays ?? 0)}j`
                              : valState === 'upcoming'
                                ? `Expire dans ${valDays}j`
                                : 'Conforme — validité à jour (1 an)'
                        }
                      >
                        <ConformityBadge state={valState} active={e.active} days={valDays} />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(e)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier l\'extincteur' : 'Nouvel extincteur'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Station *</label>
              <select
                value={form.station_id}
                onChange={(e) => setForm({ ...form, station_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
              >
                <option value="">Sélectionner…</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
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
            <div className="col-span-2">
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
            <div>
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
              {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
