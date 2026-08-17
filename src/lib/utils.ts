import type { ExtinguisherLiveStatus } from './types';
import { INSPECTION_WARNING_DAYS } from './constants';

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function inspectionState(nextDate: string | null | undefined): 'overdue' | 'upcoming' | 'ok' | 'none' {
  const days = daysUntil(nextDate);
  if (days === null) return 'none';
  if (days < 0) return 'overdue';
  if (days <= INSPECTION_WARNING_DAYS) return 'upcoming';
  return 'ok';
}

export function validityState(
  lastInspectionDate: string | null | undefined,
  nextInspectionDate: string | null | undefined,
): 'overdue' | 'upcoming' | 'ok' | 'none' {
  const days = validityDaysLeft(lastInspectionDate, nextInspectionDate);
  if (days === null) return 'none';
  if (days < 0) return 'overdue';
  if (days <= INSPECTION_WARNING_DAYS) return 'upcoming';
  return 'ok';
}

export function validityDaysLeft(
  lastInspectionDate: string | null | undefined,
  nextInspectionDate: string | null | undefined,
): number | null {
  const ref = nextInspectionDate || lastInspectionDate;
  if (!ref) return null;
  return daysUntil(ref);
}

export function validityEndDate(
  lastInspectionDate: string | null | undefined,
  nextInspectionDate: string | null | undefined,
): string | null {
  const ref = lastInspectionDate;
  if (!ref) return nextInspectionDate || null;
  const d = new Date(ref);
  if (isNaN(d.getTime())) return nextInspectionDate || null;
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

export function statusColor(status: ExtinguisherLiveStatus): string {
  switch (status) {
    case 'good':
      return 'emerald';
    case 'defective':
      return 'red';
    case 'missing':
      return 'red';
    default:
      return 'slate';
  }
}

export function statusLabel(status: ExtinguisherLiveStatus): string {
  switch (status) {
    case 'good':
      return 'Bon état';
    case 'defective':
      return 'Défectueux';
    case 'missing':
      return 'Non vérifié';
    default:
      return 'Inconnu';
  }
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
