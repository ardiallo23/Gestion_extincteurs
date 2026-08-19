import { useEffect, useState, useCallback, useMemo } from 'react';
import { ShieldCheck, ShieldAlert, Building2, MapPin, LayoutGrid, Zap, Wrench, Droplets, Fuel, Plug, ShoppingBag, Flame, ChevronDown, ChevronRight, CircleCheck as CheckCircle2, Circle as XCircle, ChartBar as BarChart3, TrendingDown, TrendingUp, TriangleAlert as AlertTriangle, Gauge, Layers, ArrowUpDown, Printer, FileCheck, Calendar, Lightbulb, Flag, ListChecks, Scale } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { StationCompliance } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  ComplianceHeatmap, ComplianceDonut, ComplianceRadar,
  LOCATION_SHORT,
  type RuleDef,
} from '@/components/ComplianceCharts';

const RULES: RuleDef[] = [
  { key: 'r1', label: 'Îlots piste — Poudre ABC 9kg', icon: LayoutGrid, expectedField: 'r1_expected', actualField: 'r1_actual' },
  { key: 'r2', label: 'Armoires électriques — CO2', icon: Zap, expectedField: 'r2_expected', actualField: 'r2_actual' },
  { key: 'r3', label: 'Baie de service — Poudre ABC 9kg', icon: Wrench, expectedField: 'r3_expected', actualField: 'r3_actual' },
  { key: 'r4', label: 'Baie de lavage — Poudre ABC 9kg', icon: Droplets, expectedField: 'r4_expected', actualField: 'r4_actual' },
  { key: 'r5', label: 'Zone de depotage — Poudre ABC 50kg', icon: Fuel, expectedField: 'r5_expected', actualField: 'r5_actual' },
  { key: 'r6', label: 'Local GE — CO2', icon: Plug, expectedField: 'r6_expected', actualField: 'r6_actual' },
  { key: 'r7', label: 'Boutique — Extincteur à eau', icon: ShoppingBag, expectedField: 'r7_expected', actualField: 'r7_actual' },
];

function isRuleCompliant(c: StationCompliance, rule: RuleDef): boolean {
  return c[rule.actualField] === c[rule.expectedField];
}

function stationPassCount(c: StationCompliance): number {
  return RULES.filter((r) => isRuleCompliant(c, r)).length;
}

function stationMissingCount(c: StationCompliance): number {
  return RULES.reduce((s, r) => s + Math.max(0, (c[r.expectedField] as number) - (c[r.actualField] as number)), 0);
}

function stationSurplusCount(c: StationCompliance): number {
  return RULES.reduce((s, r) => s + Math.max(0, (c[r.actualField] as number) - (c[r.expectedField] as number)), 0);
}

type SortMode = 'name' | 'compliance' | 'missing';

export function AdminCompliance() {
  const { profile } = useAuth();
  const [compliance, setCompliance] = useState<StationCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>('compliance');

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('station_compliance').select('*').order('station_name');
    setCompliance((data as StationCompliance[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortedCompliance = useMemo(() => {
    const sorted = [...compliance];
    if (sortMode === 'name') {
      sorted.sort((a, b) => a.station_name.localeCompare(b.station_name));
    } else if (sortMode === 'compliance') {
      sorted.sort((a, b) => stationPassCount(b) - stationPassCount(a));
    } else if (sortMode === 'missing') {
      sorted.sort((a, b) => stationMissingCount(b) - stationMissingCount(a));
    }
    return sorted;
  }, [compliance, sortMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  const totalRules = compliance.length * RULES.length;
  const passedRules = compliance.reduce((sum, c) => sum + stationPassCount(c), 0);
  const fullyCompliant = compliance.filter((c) => stationPassCount(c) === RULES.length).length;
  const nonCompliant = compliance.length - fullyCompliant;
  const complianceRate = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0;
  const totalMissing = compliance.reduce((s, c) => s + stationMissingCount(c), 0);
  const totalSurplus = compliance.reduce((s, c) => s + stationSurplusCount(c), 0);
  const totalExpected = compliance.reduce((s, c) => s + RULES.reduce((rs, r) => rs + (c[r.expectedField] as number), 0), 0);
  const totalActual = compliance.reduce((s, c) => s + RULES.reduce((rs, r) => rs + (c[r.actualField] as number), 0), 0);
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const rateColor = complianceRate >= 80 ? 'emerald' : complianceRate >= 50 ? 'amber' : 'red';
  const rateHex = complianceRate >= 80 ? '#059669' : complianceRate >= 50 ? '#d97706' : '#dc2626';

  const stationDetailHeader = (
    <div className="relative z-10 flex items-center gap-3 flex-shrink-0 flex-wrap">
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
        {compliance.length} station{compliance.length > 1 ? 's' : ''}
      </span>
      {profile?.role !== 'technician' && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); window.print(); }}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimer
        </button>
      )}
      <div className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 p-0.5 shadow-sm">
        {([
          { key: 'compliance' as SortMode, label: 'Conformité' },
          { key: 'missing' as SortMode, label: 'Manquants' },
          { key: 'name' as SortMode, label: 'Nom' },
        ]).map((opt) => (
          <button
            type="button"
            key={opt.key}
            onClick={(e) => { e.stopPropagation(); setSortMode(opt.key); }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              sortMode === opt.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* === HERO BANNER === */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(239,68,68,0.3) 0%, transparent 40%), radial-gradient(circle at 85% 30%, rgba(249,115,22,0.2) 0%, transparent 40%)',
        }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: title + meta */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/30">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold leading-tight">Rapport de conformité</h1>
                  <p className="text-slate-400 text-sm mt-0.5">
                    Équipement d'extinction vs infrastructure des stations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="h-4 w-4" />
                  {today}
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Building2 className="h-4 w-4" />
                  {compliance.length} station{compliance.length > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <FileCheck className="h-4 w-4" />
                  {RULES.length} règles vérifiées
                </span>
              </div>
            </div>

            {/* Right: compliance gauge */}
            <div className="flex items-center gap-5 rounded-2xl bg-white/5 backdrop-blur border border-white/10 px-6 py-5">
              <HeroGauge percent={complianceRate} color={rateHex} />
              <div className="min-w-[140px]">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Taux global</p>
                <p className="text-4xl font-bold tabular-nums mt-1" style={{ color: rateHex }}>
                  {complianceRate}%
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  {complianceRate >= 80 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 text-xs font-medium">
                      <ShieldCheck className="h-3 w-3" /> Conforme
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-300 px-2.5 py-0.5 text-xs font-medium">
                      <ShieldAlert className="h-3 w-3" /> {nonCompliant} station{nonCompliant > 1 ? 's' : ''} en alerte
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hero inline stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-6 rounded-xl bg-white/5 overflow-hidden border border-white/10">
            <HeroStat label="Stations conformes" value={fullyCompliant} total={compliance.length} accent="emerald" />
            <HeroStat label="Règles respectées" value={passedRules} total={totalRules} accent="sky" />
            <HeroStat label="Extincteurs manquants" value={totalMissing} accent={totalMissing > 0 ? 'red' : 'emerald'} icon={<TrendingDown className="h-3.5 w-3.5" />} />
            <HeroStat label="Extincteurs en surplus" value={totalSurplus} accent={totalSurplus > 0 ? 'amber' : 'slate'} icon={<ArrowUpDown className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </div>

      {/* === EXECUTIVE SUMMARY === */}
      <ExecutiveSummary
        compliance={compliance}
        rules={RULES}
        complianceRate={complianceRate}
        fullyCompliant={fullyCompliant}
        nonCompliant={nonCompliant}
        totalMissing={totalMissing}
        totalSurplus={totalSurplus}
        totalActual={totalActual}
        totalExpected={totalExpected}
      />

      {/* === PRIORITY ALERTS === */}
      <PriorityAlerts compliance={compliance} rules={RULES} />

      {/* === SECTION 1: CHARTS === */}
      <SectionHeader number="01" icon={BarChart3} title="Analyse visuelle" subtitle="Répartition et taux de couverture" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceDonut compliance={compliance} rules={RULES} />
        <ComplianceRadar compliance={compliance} rules={RULES} />
      </div>

      {/* === SECTION 2: HEATMAP === */}
      <SectionHeader number="02" icon={LayoutGrid} title="Matrice de conformité" subtitle="Vue d'ensemble par station et par règle" />
      <ComplianceHeatmap compliance={compliance} rules={RULES} />

      {/* === SECTION 3: BAR CHARTS === */}
      <SectionHeader number="03" icon={BarChart3} title="Comparatif quantitatif" subtitle="Extincteurs installés vs requis par emplacement et par station" />
      <LocationComparisonChart compliance={compliance} rules={RULES} />
      <StationComparisonChart compliance={compliance} rules={RULES} />

      {/* === SECTION 4: RULES REFERENCE === */}
      <SectionHeader number="04" icon={Layers} title="Référentiel réglementaire" subtitle="Règles d'équipement appliquées" />
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {RULES.map((r, i) => {
            const Icon = r.icon;
            return (
              <div
                key={r.key}
                className="flex items-center gap-3 text-sm text-slate-600 rounded-xl hover:bg-slate-50 px-3 py-2 transition-colors count-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex-shrink-0">
                  <Icon className="h-4 w-4 text-slate-600" />
                </div>
                <span className="flex-1">{r.label}</span>
                <span className="text-xs font-mono text-slate-400">{r.key.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* === SECTION 5: STATION DETAIL === */}
      <SectionHeader number="05" icon={ListChecks} title="Détail par station" subtitle="Inspection règle par règle" rightContent={stationDetailHeader} />

      <div className="space-y-2.5">
          {sortedCompliance.map((c, idx) => {
            const passed = stationPassCount(c);
            const allOk = passed === RULES.length;
            const isExpanded = expanded.has(c.station_id);
            const failedRules = RULES.filter((r) => !isRuleCompliant(c, r));
            const stationMissing = stationMissingCount(c);
            const stationSurplus = stationSurplusCount(c);
            const stationPct = Math.round((passed / RULES.length) * 100);
            const pctColor = stationPct === 100 ? 'emerald' : stationPct >= 70 ? 'amber' : 'red';

            return (
              <div
                key={c.station_id}
                className={cn(
                  'rounded-2xl bg-white border shadow-sm overflow-hidden count-up hover:shadow-lg transition-all',
                  allOk ? 'border-slate-200' : 'border-l-4',
                  !allOk && (pctColor === 'red' ? 'border-l-red-400' : 'border-l-amber-400'),
                )}
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <button
                  type="button"
                  onClick={() => toggle(c.station_id)}
                  className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-slate-50/50 transition-colors text-left"
                >
                  {/* Chevron */}
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-slate-400 transition-transform" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400 transition-transform" />
                    )}
                  </div>

                  {/* Station icon with ring */}
                  <div className="relative flex-shrink-0">
                    <MiniGauge percent={stationPct} size={44} />
                    <div className={cn(
                      'absolute inset-0 flex items-center justify-center',
                    )}>
                      <Building2 className={cn('h-4 w-4', allOk ? 'text-emerald-600' : pctColor === 'red' ? 'text-red-600' : 'text-amber-600')} />
                    </div>
                  </div>

                  {/* Name + city */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{c.station_name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {c.station_city || '—'}
                      <span className="text-slate-300 mx-0.5">·</span>
                      <span className="tabular-nums">{stationPct}%</span>
                    </p>
                  </div>

                  {/* Score + badge */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className={cn(
                      'text-base sm:text-lg font-bold tabular-nums',
                      allOk ? 'text-emerald-600' : pctColor === 'red' ? 'text-red-600' : 'text-amber-600',
                    )}>
                      {passed}<span className="text-slate-300 text-xs sm:text-sm font-normal">/{RULES.length}</span>
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap',
                      allOk
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                        : pctColor === 'red'
                        ? 'bg-red-50 text-red-700 ring-1 ring-red-200/60'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
                    )}>
                      {allOk ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Conforme
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-3.5 w-3.5" />
                          {failedRules.length} défaut{failedRules.length > 1 ? 's' : ''}
                          {stationMissing > 0 && <span className="ml-0.5">· −{stationMissing}</span>}
                          {stationSurplus > 0 && <span className="ml-0.5">· +{stationSurplus}</span>}
                        </>
                      )}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 sm:px-5 py-4 space-y-2 fade-in-scale">
                    {RULES.map((rule) => {
                      const Icon = rule.icon;
                      const expected = c[rule.expectedField] as number;
                      const actual = c[rule.actualField] as number;
                      const ok = isRuleCompliant(c, rule);
                      const short = actual < expected;
                      const excess = actual > expected;
                      const maxVal = Math.max(expected, actual, 1);
                      const actualBarW = Math.min((actual / maxVal) * 100, 100);
                      const expectedBarW = Math.min((expected / maxVal) * 100, 100);

                      return (
                        <div
                          key={rule.key}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all',
                            ok
                              ? 'border-slate-100 bg-slate-50/40 hover:bg-slate-50'
                              : short
                              ? 'border-red-200 bg-red-50/40 hover:bg-red-50'
                              : 'border-amber-200 bg-amber-50/40 hover:bg-amber-50',
                          )}
                        >
                          <div className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 transition-colors',
                            ok ? 'bg-slate-100' : short ? 'bg-red-100' : 'bg-amber-100',
                          )}>
                            <Icon className={cn('h-4 w-4', ok ? 'text-slate-500' : short ? 'text-red-600' : 'text-amber-600')} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <p className={cn('text-sm font-medium', ok ? 'text-slate-700' : short ? 'text-red-700' : 'text-amber-700')}>
                                {rule.label}
                              </p>
                              <div className="flex items-center gap-2 text-xs tabular-nums flex-shrink-0">
                                <span className="text-slate-400">{actual}<span className="text-slate-300">/{expected}</span></span>
                                {short && <span className="text-red-500 font-bold">−{expected - actual}</span>}
                                {excess && <span className="text-amber-600 font-bold">+{actual - expected}</span>}
                              </div>
                            </div>
                            {/* Visual comparison bar */}
                            <div className="mt-2 relative h-4 rounded-md bg-slate-100 overflow-hidden">
                              {/* Expected marker */}
                              <div
                                className="absolute top-0 h-full bg-slate-200/80 border-r-2 border-slate-300"
                                style={{ width: `${expectedBarW}%` }}
                              />
                              {/* Actual fill */}
                              <div
                                className={cn(
                                  'absolute top-0 h-full rounded-md transition-all duration-700 flex items-center',
                                  ok ? 'bg-gradient-to-r from-emerald-400/80 to-emerald-500/80'
                                  : short ? 'bg-gradient-to-r from-red-400/80 to-red-500/80'
                                  : 'bg-gradient-to-r from-amber-400/80 to-amber-500/80',
                                )}
                                style={{ width: `${actualBarW}%` }}
                              />
                              {/* Tick mark for expected */}
                              <div
                                className="absolute top-0 h-full w-0.5 bg-slate-400 z-10"
                                style={{ left: `${expectedBarW}%` }}
                              />
                            </div>
                          </div>
                          {ok ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 flex-shrink-0">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                          ) : (
                            <div className={cn('flex items-center gap-1.5 flex-shrink-0', short ? 'text-red-500' : 'text-amber-500')}>
                              <XCircle className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {compliance.length === 0 && (
          <div className="text-center py-16 text-slate-400 rounded-2xl border border-dashed border-slate-200">
            <Flame className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Aucune station à analyser.</p>
          </div>
        )}

      {/* === FOOTER === */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-sm">
            <Flame className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">ExtinguisherTracker</p>
            <p className="text-xs text-slate-400">Rapport de conformité · {today}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{compliance.length} stations</span>
          <span className="flex items-center gap-1.5"><FileCheck className="h-3.5 w-3.5" />{RULES.length} règles</span>
          <span className="flex items-center gap-1.5"><Scale className="h-3.5 w-3.5" />Document confidentiel</span>
        </div>
      </div>
    </div>
  );
}

// === HERO COMPONENTS ===

function HeroGauge({ percent, color }: { percent: number; color: string }) {
  const size = 80;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)', filter: `drop-shadow(0 0 4px ${color}66)` }}
        />
      </svg>
    </div>
  );
}

// === SECTION HEADER ===

function SectionHeader({ number, icon: Icon, title, subtitle, rightContent }: {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  rightContent?: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex items-center justify-between flex-wrap gap-3 pt-2">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-bold tabular-nums shadow-sm">
          {number}
        </div>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-400" />
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">{title}</h2>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
      </div>
      {rightContent}
    </div>
  );
}

// === MINI GAUGE ===

function MiniGauge({ percent, size = 44 }: { percent: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 100 ? '#059669' : percent >= 70 ? '#d97706' : '#dc2626';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
    </div>
  );
}

// === EXECUTIVE SUMMARY ===

function ExecutiveSummary({ compliance, rules, complianceRate, fullyCompliant, nonCompliant, totalMissing, totalSurplus, totalActual, totalExpected }: {
  compliance: StationCompliance[];
  rules: RuleDef[];
  complianceRate: number;
  fullyCompliant: number;
  nonCompliant: number;
  totalMissing: number;
  totalSurplus: number;
  totalActual: number;
  totalExpected: number;
}) {
  const worstStation = useMemo(() => {
    if (compliance.length === 0) return null;
    let worst = compliance[0];
    let worstPass = stationPassCount(worst);
    for (const c of compliance) {
      const p = stationPassCount(c);
      if (p < worstPass) {
        worst = c;
        worstPass = p;
      }
    }
    return { station: worst, pass: worstPass };
  }, [compliance]);

  const verdict = complianceRate >= 80
    ? { label: 'Conformité satisfaisante', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ShieldCheck }
    : complianceRate >= 50
    ? { label: 'Conformité partielle — actions requises', color: 'text-amber-600', bg: 'bg-amber-50', icon: ShieldAlert }
    : { label: 'Non-conformité critique — intervention urgente', color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle };
  const VerdictIcon = verdict.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Verdict card */}
      <div className={cn('lg:col-span-2 rounded-2xl border p-5 shadow-sm', verdict.bg, 'border-slate-200')}>
        <div className="flex items-start gap-4">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0', verdict.bg, 'ring-1 ring-slate-200')}>
            <VerdictIcon className={cn('h-6 w-6', verdict.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Verdict</span>
              <span className={cn('text-2xl font-bold tabular-nums', verdict.color)}>{complianceRate}%</span>
            </div>
            <p className={cn('text-sm font-semibold', verdict.color)}>{verdict.label}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <SummaryMiniStat label="Conformes" value={fullyCompliant} total={compliance.length} color="text-emerald-600" />
              <SummaryMiniStat label="En alerte" value={nonCompliant} total={compliance.length} color={nonCompliant > 0 ? 'text-red-600' : 'text-slate-400'} />
              <SummaryMiniStat label="Manquants" value={totalMissing} color={totalMissing > 0 ? 'text-red-600' : 'text-slate-400'} />
              <SummaryMiniStat label="Surplus" value={totalSurplus} color={totalSurplus > 0 ? 'text-amber-600' : 'text-slate-400'} />
            </div>
          </div>
        </div>
      </div>

      {/* Worst station card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Flag className="h-4 w-4 text-red-500" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Priorité d'action</span>
        </div>
        {worstStation && worstStation.pass < rules.length ? (
          <>
            <p className="text-sm font-bold text-slate-800">{worstStation.station.station_name}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />{worstStation.station.station_city || '—'}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1">
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-700"
                    style={{ width: `${Math.round((worstStation.pass / rules.length) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-red-600 tabular-nums">{worstStation.pass}/{rules.length}</span>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              {rules.length - worstStation.pass} règle{(rules.length - worstStation.pass) > 1 ? 's' : ''} non respectée{(rules.length - worstStation.pass) > 1 ? 's' : ''}
              {stationMissingCount(worstStation.station) > 0 && (
                <span className="text-red-500 font-semibold"> · {stationMissingCount(worstStation.station)} extincteur{stationMissingCount(worstStation.station) > 1 ? 's' : ''} manquant{stationMissingCount(worstStation.station) > 1 ? 's' : ''}</span>
              )}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-emerald-600">Toutes les stations sont conformes</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryMiniStat({ label, value, total, color }: { label: string; value: number; total?: number; color: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums', color)}>
        {value}{total !== undefined && <span className="text-slate-300 text-sm font-normal"> / {total}</span>}
      </p>
    </div>
  );
}

// === PRIORITY ALERTS ===

function PriorityAlerts({ compliance, rules }: { compliance: StationCompliance[]; rules: RuleDef[] }) {
  const alerts = useMemo(() => {
    const items: { station: StationCompliance; rule: RuleDef; missing: number }[] = [];
    for (const c of compliance) {
      for (const r of rules) {
        const expected = c[r.expectedField] as number;
        const actual = c[r.actualField] as number;
        const missing = expected - actual;
        if (missing > 0) {
          items.push({ station: c, rule: r, missing });
        }
      }
    }
    items.sort((a, b) => b.missing - a.missing);
    return items.slice(0, 5);
  }, [compliance, rules]);

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700">Aucun manquant détecté</p>
          <p className="text-xs text-emerald-600/80">Tous les emplacements réglementaires sont correctement équipés sur l'ensemble du parc.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Alertes prioritaires</h2>
          <p className="text-xs text-slate-500">{alerts.length} manquant{alerts.length > 1 ? 's' : ''} critique{alerts.length > 1 ? 's' : ''} à traiter en premier</p>
        </div>
      </div>
      <div className="space-y-2">
        {alerts.map((alert, idx) => {
          const Icon = alert.rule.icon;
          return (
            <div
              key={`${alert.station.station_id}-${alert.rule.key}`}
              className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/30 px-4 py-3 hover:bg-red-50/60 transition-colors count-up"
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 flex-shrink-0">
                <Icon className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {alert.station.station_name}
                  <span className="text-slate-400 font-normal"> · {alert.rule.label}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-slate-400 tabular-nums">
                  {(alert.station[alert.rule.actualField] as number)}/{(alert.station[alert.rule.expectedField] as number)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-bold tabular-nums">
                  <TrendingDown className="h-3 w-3" />−{alert.missing}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroStat({
  label, value, total, accent, icon,
}: {
  label: string;
  value: number;
  total?: number;
  accent: 'emerald' | 'sky' | 'red' | 'amber' | 'slate';
  icon?: React.ReactNode;
}) {
  const colorMap = {
    emerald: 'text-emerald-300',
    sky: 'text-sky-300',
    red: 'text-red-300',
    amber: 'text-amber-300',
    slate: 'text-slate-300',
  };
  return (
    <div className="bg-slate-900 px-5 py-4">
      <p className="text-xs text-slate-400 font-medium leading-snug flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className={cn('text-2xl font-bold tabular-nums mt-1', colorMap[accent])}>
        {value}{total !== undefined && <span className="text-slate-500 text-lg font-normal"> / {total}</span>}
      </p>
    </div>
  );
}

// === CHART HELPERS ===

function ChartStat({ label, value, color, icon, delay = 0 }: { label: string; value: number; color: string; icon?: React.ReactNode; delay?: number }) {
  return (
    <div
      className="rounded-xl bg-slate-50 px-4 py-3 count-up hover:bg-slate-100 transition-colors"
      style={{ animationDelay: `${delay}s` }}
    >
      <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={cn('text-xl font-bold tabular-nums', color)}>{value}</p>
    </div>
  );
}

function ChartLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-sm bg-gradient-to-b from-slate-300 to-slate-400" />
        <span className="text-xs font-medium text-slate-600">Requis</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-sm bg-gradient-to-b from-red-500 to-orange-400" />
        <span className="text-xs font-medium text-slate-600">Installés (manque)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-sm bg-gradient-to-b from-amber-400 to-amber-500" />
        <span className="text-xs font-medium text-slate-600">Installés (surplus)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-sm bg-gradient-to-b from-emerald-400 to-emerald-500" />
        <span className="text-xs font-medium text-slate-600">Installés (conforme)</span>
      </div>
    </div>
  );
}

function GridLines({ height, maxValue, count = 4 }: { height: number; maxValue: number; count?: number }) {
  const lines = [];
  for (let i = 1; i <= count; i++) {
    const y = height - (i / count) * (height - 30);
    const value = Math.round((i / count) * maxValue);
    lines.push(
      <div key={i} className="absolute left-0 right-0 flex items-center" style={{ bottom: y }}>
        <span className="text-[10px] text-slate-300 font-medium tabular-nums w-8 text-right pr-2">{value}</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
    );
  }
  return <div className="absolute inset-0 pointer-events-none">{lines}</div>;
}

function ComplianceRing({ percent, size = 28 }: { percent: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 100 ? '#059669' : percent >= 70 ? '#d97706' : '#dc2626';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
    </div>
  );
}

// === LOCATION COMPARISON CHART ===

function LocationComparisonChart({ compliance, rules }: { compliance: StationCompliance[]; rules: RuleDef[] }) {
  const [view, setView] = useState<'global' | 'perStation'>('global');

  const globalData = useMemo(() => {
    return rules.map((r) => {
      const expected = compliance.reduce((sum, c) => sum + (c[r.expectedField] as number), 0);
      const actual = compliance.reduce((sum, c) => sum + (c[r.actualField] as number), 0);
      return {
        key: r.key,
        label: LOCATION_SHORT[r.key] || r.label,
        fullLabel: r.label,
        expected,
        actual,
        missing: Math.max(0, expected - actual),
        surplus: Math.max(0, actual - expected),
      };
    });
  }, [compliance, rules]);

  const totalExpected = globalData.reduce((s, d) => s + d.expected, 0);
  const totalActual = globalData.reduce((s, d) => s + d.actual, 0);
  const totalMissing = globalData.reduce((s, d) => s + d.missing, 0);
  const totalSurplus = globalData.reduce((s, d) => s + d.surplus, 0);

  const maxValue = Math.max(...globalData.map((d) => Math.max(d.expected, d.actual)), 1);
  const chartHeight = 280;
  const barWidth = 52;
  const groupWidth = barWidth * 2 + 10;
  const groupGap = 30;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-50 to-orange-50">
            <BarChart3 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Extincteurs installés vs requis</h2>
            <p className="text-xs text-slate-500">Comparaison par emplacement pour détecter les manquements</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-0.5">
          <button
            onClick={() => setView('global')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              view === 'global' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            Vue globale
          </button>
          <button
            onClick={() => setView('perStation')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              view === 'perStation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            Par station
          </button>
        </div>
      </div>

      {view === 'global' ? (
        <div className="p-5">
          <div className="mb-4"><ChartLegend /></div>

          <div className="overflow-x-auto">
            <div className="inline-flex flex-col" style={{ minWidth: globalData.length * (groupWidth + groupGap) + 50 }}>
              <div className="relative px-5" style={{ height: chartHeight }}>
                <GridLines height={chartHeight} maxValue={maxValue} />
                <div className="relative flex items-end gap-0 h-full">
                  {globalData.map((d, idx) => {
                    const expectedH = (d.expected / maxValue) * (chartHeight - 30);
                    const actualH = (d.actual / maxValue) * (chartHeight - 30);
                    const isShort = d.actual < d.expected;
                    const isSurplus = d.actual > d.expected;

                    return (
                      <div key={d.key} className="flex items-end gap-1.5 relative group flex-shrink-0" style={{ width: groupWidth, marginRight: groupGap }}>
                        <div className="relative flex flex-col items-center justify-end" style={{ width: barWidth }}>
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-b from-slate-300 to-slate-400 bar-grow relative overflow-hidden"
                            style={{ height: Math.max(expectedH, 3), animationDelay: `${idx * 0.08}s` }}
                          >
                            <div className="absolute inset-0 shimmer-bar opacity-50" />
                          </div>
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600 tabular-nums">{d.expected}</span>
                        </div>

                        <div className="relative flex flex-col items-center justify-end" style={{ width: barWidth }}>
                          <div
                            className={cn(
                              'w-full rounded-t-lg bar-grow relative overflow-hidden group-hover:brightness-110 transition-all',
                              isShort ? 'bg-gradient-to-b from-red-500 to-orange-400' : isSurplus ? 'bg-gradient-to-b from-amber-400 to-amber-500' : 'bg-gradient-to-b from-emerald-400 to-emerald-500',
                            )}
                            style={{ height: Math.max(actualH, 3), animationDelay: `${idx * 0.08 + 0.15}s` }}
                          >
                            <div className="absolute inset-0 shimmer-bar opacity-30" />
                          </div>
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 tabular-nums">{d.actual}</span>
                        </div>

                        {isShort && (
                          <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full bg-red-50 ring-1 ring-red-200 px-2 py-0.5 count-up">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            <span className="text-xs font-bold text-red-600 tabular-nums">-{d.missing}</span>
                          </div>
                        )}

                        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 z-30 hidden group-hover:block">
                          <div className="rounded-xl bg-slate-900 text-white text-xs px-3 py-2.5 whitespace-nowrap shadow-xl">
                            <p className="font-semibold">{d.fullLabel}</p>
                            <p className="text-slate-300 mt-1">Requis : {d.expected} · Installés : {d.actual}</p>
                            {isShort && <p className="text-red-400 font-medium mt-0.5">Manque : {d.missing}</p>}
                            {d.surplus > 0 && <p className="text-amber-400 font-medium mt-0.5">Surplus : {d.surplus}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="h-0.5 bg-slate-200 mx-5" />

              <div className="flex gap-0 px-5 pt-3">
                {globalData.map((d) => (
                  <div key={d.key} className="text-center flex-shrink-0" style={{ width: groupWidth, marginRight: groupGap }}>
                    <p className="text-xs font-medium text-slate-600">{d.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
            <ChartStat label="Total requis" value={totalExpected} color="text-slate-700" delay={0} />
            <ChartStat label="Total installés" value={totalActual} color="text-slate-700" delay={0.05} />
            <ChartStat label="Manquants" value={totalMissing} color="text-red-600" icon={<TrendingDown className="h-4 w-4" />} delay={0.1} />
            <ChartStat label="En surplus" value={totalSurplus} color="text-amber-600" delay={0.15} />
          </div>
        </div>
      ) : (
        <PerStationMiniCharts compliance={compliance} rules={rules} />
      )}
    </div>
  );
}

function PerStationMiniCharts({ compliance, rules }: { compliance: StationCompliance[]; rules: RuleDef[] }) {
  const maxValue = useMemo(() => {
    let max = 1;
    for (const c of compliance) {
      for (const r of rules) {
        max = Math.max(max, c[r.expectedField] as number, c[r.actualField] as number);
      }
    }
    return max;
  }, [compliance, rules]);

  return (
    <div className="p-5 space-y-4">
      <ChartLegend />

      {compliance.map((c, sIdx) => {
        const stationTotalExpected = rules.reduce((s, r) => s + (c[r.expectedField] as number), 0);
        const stationTotalActual = rules.reduce((s, r) => s + (c[r.actualField] as number), 0);
        const stationMissing = stationMissingCount(c);
        const stationSurplus = stationSurplusCount(c);
        const pct = stationTotalExpected > 0 ? Math.round((stationTotalActual / stationTotalExpected) * 100) : 100;

        return (
          <div key={c.station_id} className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 count-up hover:shadow-sm transition-shadow" style={{ animationDelay: `${sIdx * 0.08}s` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', stationMissing > 0 ? 'bg-red-50' : 'bg-emerald-50')}>
                  <Building2 className={cn('h-4 w-4', stationMissing > 0 ? 'text-red-500' : 'text-emerald-500')} />
                </div>
                <div>
                  <span className="font-semibold text-sm text-slate-800">{c.station_name}</span>
                  <span className="text-xs text-slate-400 ml-2 tabular-nums">{stationTotalActual} / {stationTotalExpected}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {stationMissing > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 px-2.5 py-0.5 text-xs font-medium ring-1 ring-red-200/60">
                    <AlertTriangle className="h-3 w-3" />{stationMissing} manquant{stationMissing > 1 ? 's' : ''}
                  </span>
                )}
                {stationSurplus > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-600 px-2.5 py-0.5 text-xs font-medium ring-1 ring-amber-200/60">
                    <AlertTriangle className="h-3 w-3" />{stationSurplus} surplus
                  </span>
                )}
                {stationMissing === 0 && stationSurplus === 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-600 px-2.5 py-0.5 text-xs font-medium ring-1 ring-emerald-200/60">
                    <CheckCircle2 className="h-3 w-3" />Conforme
                  </span>
                )}
              </div>
            </div>

            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3">
              <div
                className={cn('h-full rounded-full transition-all duration-700', pct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : pct >= 70 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-red-500')}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>

            <div className="flex items-end gap-1.5 h-24 overflow-x-auto pb-1">
              {rules.map((r, rIdx) => {
                const expected = c[r.expectedField] as number;
                const actual = c[r.actualField] as number;
                const expectedH = (expected / maxValue) * 68;
                const actualH = (actual / maxValue) * 68;
                const isShort = actual < expected;
                const isSurplus = actual > expected;
                return (
                  <div key={r.key} className="flex flex-col items-center flex-shrink-0 group relative" style={{ width: 48 }}>
                    <div className="flex items-end gap-1 h-[68px]">
                      <div className="w-4 rounded-t-md bg-gradient-to-b from-slate-300 to-slate-400 bar-grow" style={{ height: Math.max(expectedH, 2), animationDelay: `${sIdx * 0.08 + rIdx * 0.05}s` }} />
                      <div
                        className={cn('w-4 rounded-t-md bar-grow', isShort ? 'bg-gradient-to-b from-red-400 to-red-500' : isSurplus ? 'bg-gradient-to-b from-amber-400 to-amber-500' : 'bg-gradient-to-b from-emerald-400 to-emerald-500')}
                        style={{ height: Math.max(actualH, 2), animationDelay: `${sIdx * 0.08 + rIdx * 0.05 + 0.1}s` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">{LOCATION_SHORT[r.key]}</span>
                    {isShort && <span className="absolute -top-3.5 text-[10px] font-bold text-red-500 tabular-nums">-{expected - actual}</span>}
                    {isSurplus && <span className="absolute -top-3.5 text-[10px] font-bold text-amber-500 tabular-nums">+{actual - expected}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// === STATION COMPARISON CHART ===

function StationComparisonChart({ compliance, rules }: { compliance: StationCompliance[]; rules: RuleDef[] }) {
  const stationData = useMemo(() => {
    return compliance.map((c) => {
      const expected = rules.reduce((s, r) => s + (c[r.expectedField] as number), 0);
      const actual = rules.reduce((s, r) => s + (c[r.actualField] as number), 0);
      return {
        id: c.station_id,
        name: c.station_name,
        city: c.station_city,
        expected,
        actual,
        missing: Math.max(0, expected - actual),
        surplus: Math.max(0, actual - expected),
        pct: expected > 0 ? Math.round((actual / expected) * 100) : 100,
      };
    });
  }, [compliance, rules]);

  const maxValue = Math.max(...stationData.map((d) => Math.max(d.expected, d.actual)), 1);
  const chartHeight = 300;
  const barWidth = 60;
  const groupWidth = barWidth * 2 + 14;
  const groupGap = 36;

  const totalExpected = stationData.reduce((s, d) => s + d.expected, 0);
  const totalActual = stationData.reduce((s, d) => s + d.actual, 0);
  const totalMissing = stationData.reduce((s, d) => s + d.missing, 0);
  const totalSurplus = stationData.reduce((s, d) => s + d.surplus, 0);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-sky-50">
          <Gauge className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Extincteurs par station</h2>
          <p className="text-xs text-slate-500">Comparaison du nombre installé vs requis pour chaque station-service</p>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4"><ChartLegend /></div>

        <div className="overflow-x-auto">
          <div className="inline-flex flex-col" style={{ minWidth: stationData.length * (groupWidth + groupGap) + 50 }}>
            <div className="relative px-5" style={{ height: chartHeight }}>
              <GridLines height={chartHeight} maxValue={maxValue} />
              <div className="relative flex items-end gap-0 h-full">
                {stationData.map((d, idx) => {
                  const expectedH = (d.expected / maxValue) * (chartHeight - 30);
                  const actualH = (d.actual / maxValue) * (chartHeight - 30);
                  const isShort = d.actual < d.expected;
                  const isSurplus = d.actual > d.expected;

                  return (
                    <div key={d.id} className="flex items-end gap-2 relative group flex-shrink-0" style={{ width: groupWidth, marginRight: groupGap }}>
                      <div className="relative flex flex-col items-center justify-end" style={{ width: barWidth }}>
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-b from-slate-300 to-slate-400 bar-grow relative overflow-hidden"
                          style={{ height: Math.max(expectedH, 3), animationDelay: `${idx * 0.1}s` }}
                        >
                          <div className="absolute inset-0 shimmer-bar opacity-50" />
                        </div>
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600 tabular-nums">{d.expected}</span>
                      </div>

                      <div className="relative flex flex-col items-center justify-end" style={{ width: barWidth }}>
                        <div
                          className={cn(
                            'w-full rounded-t-lg bar-grow relative overflow-hidden group-hover:brightness-110 transition-all',
                            isShort ? 'bg-gradient-to-b from-red-500 to-orange-400' : isSurplus ? 'bg-gradient-to-b from-amber-400 to-amber-500' : 'bg-gradient-to-b from-emerald-400 to-emerald-500',
                          )}
                          style={{ height: Math.max(actualH, 3), animationDelay: `${idx * 0.1 + 0.15}s` }}
                        >
                          <div className="absolute inset-0 shimmer-bar opacity-30" />
                        </div>
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 tabular-nums">{d.actual}</span>
                      </div>

                      {isShort && (
                        <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full bg-red-50 ring-1 ring-red-200 px-2 py-0.5 count-up">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <span className="text-xs font-bold text-red-600 tabular-nums">-{d.missing}</span>
                        </div>
                      )}

                      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 z-30 hidden group-hover:block">
                        <div className="rounded-xl bg-slate-900 text-white text-xs px-3 py-2.5 whitespace-nowrap shadow-xl">
                          <p className="font-semibold">{d.name}</p>
                          {d.city && <p className="text-slate-400 text-[10px]">{d.city}</p>}
                          <p className="text-slate-300 mt-1">Requis : {d.expected} · Installés : {d.actual}</p>
                          {isShort && <p className="text-red-400 font-medium mt-0.5">Manque : {d.missing}</p>}
                          {d.surplus > 0 && <p className="text-amber-400 font-medium mt-0.5">Surplus : {d.surplus}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-0.5 bg-slate-200 mx-5" />

            <div className="flex gap-0 px-5 pt-3">
              {stationData.map((d) => (
                <div key={d.id} className="text-center flex-shrink-0 flex flex-col items-center gap-1" style={{ width: groupWidth, marginRight: groupGap }}>
                  <ComplianceRing percent={d.pct} size={28} />
                  <p className="text-xs font-medium text-slate-600 truncate" style={{ maxWidth: groupWidth }}>{d.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <ChartStat label="Total requis" value={totalExpected} color="text-slate-700" delay={0} />
          <ChartStat label="Total installés" value={totalActual} color="text-slate-700" delay={0.05} />
          <ChartStat label="Manquants" value={totalMissing} color="text-red-600" icon={<TrendingDown className="h-4 w-4" />} delay={0.1} />
          <ChartStat label="En surplus" value={totalSurplus} color="text-amber-600" delay={0.15} />
        </div>

        {/* Detail table */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left py-3 px-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Station</th>
                <th className="text-center py-3 px-2 font-semibold text-slate-500 text-xs uppercase tracking-wide">Requis</th>
                <th className="text-center py-3 px-2 font-semibold text-slate-500 text-xs uppercase tracking-wide">Installés</th>
                <th className="text-center py-3 px-2 font-semibold text-slate-500 text-xs uppercase tracking-wide">Manquants</th>
                <th className="text-center py-3 px-2 font-semibold text-slate-500 text-xs uppercase tracking-wide">Surplus</th>
                <th className="text-center py-3 px-2 font-semibold text-slate-500 text-xs uppercase tracking-wide">Taux</th>
                <th className="text-center py-3 px-2 font-semibold text-slate-500 text-xs uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stationData.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-3 px-3 font-medium text-slate-800">{d.name}</td>
                  <td className="text-center py-3 px-2 text-slate-600 tabular-nums">{d.expected}</td>
                  <td className="text-center py-3 px-2 text-slate-600 tabular-nums">{d.actual}</td>
                  <td className="text-center py-3 px-2 tabular-nums">
                    {d.missing > 0 ? <span className="font-bold text-red-600">{d.missing}</span> : <span className="text-slate-300">0</span>}
                  </td>
                  <td className="text-center py-3 px-2 tabular-nums">
                    {d.surplus > 0 ? <span className="font-bold text-amber-600">{d.surplus}</span> : <span className="text-slate-300">0</span>}
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className={cn('inline-flex items-center gap-1 text-xs font-bold tabular-nums', d.pct >= 100 ? 'text-emerald-600' : d.pct >= 70 ? 'text-amber-600' : 'text-red-600')}>
                      {d.pct}%
                    </span>
                  </td>
                  <td className="text-center py-3 px-2">
                    {d.missing === 0 && d.surplus === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-xs font-medium ring-1 ring-emerald-200/60">
                        <CheckCircle2 className="h-3 w-3" />Conforme
                      </span>
                    ) : d.missing > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-2.5 py-0.5 text-xs font-medium ring-1 ring-red-200/60">
                        <AlertTriangle className="h-3 w-3" />Manquant
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 text-xs font-medium ring-1 ring-amber-200/60">
                        <AlertTriangle className="h-3 w-3" />Surplus
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
