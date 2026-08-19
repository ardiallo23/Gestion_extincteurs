import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Layout, type PageKey } from '@/components/Layout';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminStations } from '@/pages/admin/AdminStations';
import { AdminExtinguishers } from '@/pages/admin/AdminExtinguishers';
import { AdminCompliance } from '@/pages/admin/AdminCompliance';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminHistory } from '@/pages/admin/AdminHistory';
import { ManagerDashboard } from '@/pages/manager/ManagerDashboard';
import { ManagerDailyCheck } from '@/pages/manager/ManagerDailyCheck';
import { ManagerExtinguishers } from '@/pages/manager/ManagerExtinguishers';
import { ManagerHistory } from '@/pages/manager/ManagerHistory';
import { supabase } from '@/lib/supabase';
import type { Station } from '@/lib/types';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('dashboard');
  const [stationName, setStationName] = useState<string | null>(null);

  // Load station name for manager
  useEffect(() => {
    if (profile?.station_id) {
      supabase
        .from('stations')
        .select('name')
        .eq('id', profile.station_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setStationName((data as Station).name);
        });
    } else {
      setStationName(null);
    }
  }, [profile?.station_id]);

  // Reset to appropriate page when switching users
  useEffect(() => {
    setPage(profile?.role === 'technician' ? 'compliance' : 'dashboard');
  }, [profile?.id]);

  if (loading) return <LoginPage />;

  if (!session || !profile) return <LoginPage />;

  const isAdmin = profile.role === 'admin';
  const isTechnician = profile.role === 'technician';

  const renderPage = () => {
    if (isTechnician) {
      return <AdminCompliance />;
    }
    if (isAdmin) {
      switch (page) {
        case 'dashboard':
          return <AdminDashboard onNavigate={setPage} />;
        case 'stations':
          return <AdminStations />;
        case 'extinguishers':
          return <AdminExtinguishers />;
        case 'compliance':
          return <AdminCompliance />;
        case 'users':
          return <AdminUsers />;
        case 'history':
          return <AdminHistory />;
        default:
          return <AdminDashboard onNavigate={setPage} />;
      }
    } else {
      switch (page) {
        case 'dashboard':
          return <ManagerDashboard onNavigate={setPage} />;
        case 'daily-check':
          return <ManagerDailyCheck />;
        case 'extinguishers':
          return <ManagerExtinguishers />;
        case 'history':
          return <ManagerHistory />;
        default:
          return <ManagerDashboard onNavigate={setPage} />;
      }
    }
  };

  return (
    <Layout currentPage={page} onNavigate={setPage} stationName={stationName}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
