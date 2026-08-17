import { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Trash2, Pencil, Shield, Store, Mail, Eye, EyeOff, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { Profile, Station } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';

const emptyForm = {
  email: '',
  password: '',
  fullName: '',
  role: 'manager' as 'admin' | 'manager' | 'technician',
  station_id: '',
};

export function AdminUsers() {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = useState<(Profile & { station_name?: string | null })[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [uRes, sRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('stations').select('*').order('name'),
    ]);
    const stMap = new Map<string, string>();
    (sRes.data || []).forEach((s: Station) => stMap.set(s.id, s.name));
    setUsers(
      (uRes.data || []).map((u: Profile) => ({
        ...u,
        station_name: u.station_id ? stMap.get(u.station_id) || null : null,
      })),
    );
    setStations(sRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, station_id: stations[0]?.id || '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (u: Profile) => {
    setEditTarget(u);
    setForm({
      email: u.email,
      password: '',
      fullName: u.full_name || '',
      role: u.role,
      station_id: u.station_id || '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    if (editTarget) {
      const updates: Partial<Profile> = {
        full_name: form.fullName.trim(),
        role: form.role,
        station_id: form.role === 'admin' || form.role === 'technician' ? null : form.station_id || null,
      };
      const { error: err } = await supabase.from('profiles').update(updates).eq('id', editTarget.id);
      if (err) setError(err.message);
    } else {
      if (!form.email.trim() || !form.password) {
        setError('Email et mot de passe requis');
        setSaving(false);
        return;
      }
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          role: form.role,
          stationId: form.role === 'manager' ? form.station_id : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erreur lors de la création');
      }
    }

    setSaving(false);
    if (!error) {
      setModalOpen(false);
      await loadData();
    }
  };

  const handleDelete = async (u: Profile) => {
    if (u.id === currentUser?.id) {
      alert('Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    if (!confirm(`Supprimer le compte de ${u.email} ? Son profil sera supprimé.`)) return;
    const { error: err } = await supabase.from('profiles').delete().eq('id', u.id);
    if (err) {
      alert('Erreur: ' + err.message);
      return;
    }
    await loadData();
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comptes utilisateurs</h1>
          <p className="text-slate-500 mt-1">{users.length} compte(s)</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-white font-medium shadow-lg shadow-red-500/20 hover:brightness-110 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvel utilisateur</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div
            key={u.id}
            className={cn(
              'rounded-xl bg-white border p-5 shadow-sm hover:shadow-md transition-all',
              u.role === 'admin' ? 'border-blue-200' : u.role === 'technician' ? 'border-amber-200' : 'border-slate-200',
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full font-semibold text-sm',
                    u.role === 'admin'
                      ? 'bg-blue-100 text-blue-700'
                      : u.role === 'technician'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700',
                  )}
                >
                  {(u.full_name || u.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{u.full_name || 'Sans nom'}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3" />
                    {u.email}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  u.role === 'admin' ? 'bg-blue-50 text-blue-700' : u.role === 'technician' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
                )}
              >
                {u.role === 'admin' ? <Shield className="h-3 w-3" /> : u.role === 'technician' ? <Wrench className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                {u.role === 'admin' ? 'Administrateur' : u.role === 'technician' ? 'Technicien' : 'Gérant'}
              </span>
              {u.station_name && (
                <span className="text-xs text-slate-500 truncate">{u.station_name}</span>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => openEdit(u)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </button>
              {u.id !== currentUser?.id && (
                <button
                  onClick={() => handleDelete(u)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom complet</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
              placeholder="Pierre Dubois"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={!!editTarget}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition disabled:bg-slate-50 disabled:text-slate-400"
              placeholder="gerant@stations.fr"
            />
            {editTarget && (
              <p className="text-xs text-slate-400 mt-1">L'email ne peut pas être modifié.</p>
            )}
          </div>
          {!editTarget && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-11 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
                  placeholder="Min. 6 caractères"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rôle</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'manager' })}
                className={cn(
                  'flex-1 min-w-[120px] rounded-lg border px-4 py-2.5 text-sm font-medium transition',
                  form.role === 'manager'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                )}
              >
                <Store className="h-4 w-4 inline mr-1.5" />
                Gérant
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'admin' })}
                className={cn(
                  'flex-1 min-w-[120px] rounded-lg border px-4 py-2.5 text-sm font-medium transition',
                  form.role === 'admin'
                    ? 'border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                )}
              >
                <Shield className="h-4 w-4 inline mr-1.5" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'technician' })}
                className={cn(
                  'flex-1 min-w-[120px] rounded-lg border px-4 py-2.5 text-sm font-medium transition',
                  form.role === 'technician'
                    ? 'border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-200'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                )}
              >
                <Wrench className="h-4 w-4 inline mr-1.5" />
                Technicien
              </button>
            </div>
          </div>
          {form.role === 'manager' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Station assignée</label>
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
          )}
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
              {saving ? 'Enregistrement…' : editTarget ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
