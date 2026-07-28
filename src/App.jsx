import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Auth } from './components/Auth';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Sparkles } from 'lucide-react';

export function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoRole, setDemoRole] = useState(null); // 'admin' | 'pegawai' | null for demo mode
  
  // Theme State: Default to 'dark' mode as requested
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    // 1. Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen to Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setProfile(data);
      } else {
        setProfile({
          id: userId,
          nama_lengkap: 'User Pegawai',
          nip: '19900101001',
          role: 'pegawai',
          kategori_pegawai: 'reguler'
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setDemoRole(null);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '4px solid rgba(232, 48, 14, 0.2)',
          borderTopColor: 'var(--color-brand-primary)',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'var(--text-gold)', fontWeight: 600 }}>Memuat Sistem Absensi Presisi...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isConfigured = isSupabaseConfigured();

  // If in Demo Mode
  if (demoRole) {
    const demoProfile = demoRole === 'admin'
      ? { id: 'demo-admin-id', nama_lengkap: 'Drs. Budi Santoso, M.Si', nip: '197505122000031001', role: 'admin', kategori_pegawai: 'reguler' }
      : { id: 'demo-pegawai-id', nama_lengkap: 'Siti Rahmawati', nip: '199208152019032005', role: 'pegawai', kategori_pegawai: 'pamdal' };

    return demoRole === 'admin' ? (
      <AdminDashboard profile={demoProfile} onLogout={() => setDemoRole(null)} theme={theme} toggleTheme={toggleTheme} />
    ) : (
      <EmployeeDashboard profile={demoProfile} onLogout={() => setDemoRole(null)} theme={theme} toggleTheme={toggleTheme} />
    );
  }

  // Authenticated View
  if (session && profile) {
    return profile.role === 'admin' ? (
      <AdminDashboard profile={profile} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
    ) : (
      <EmployeeDashboard profile={profile} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
    );
  }

  // Login View
  return (
    <div>
      {!isConfigured && (
        <div style={{
          background: 'var(--surface-card)',
          borderBottom: '1px solid var(--surface-card-border)',
          padding: '12px 20px',
          textAlign: 'center',
          fontSize: '0.88rem',
          color: 'var(--text-gold)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Sparkles size={18} />
            <span><strong>Mode Demo Interaktif Active</strong>: Coba UI langsung atau hubungkan URL Supabase di `.env`</span>
            <div style={{ display: 'inline-flex', gap: '8px', marginLeft: '10px' }}>
              <button onClick={() => setDemoRole('pegawai')} className="btn btn-gold" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                Pratinjau Dashboard Pegawai
              </button>
              <button onClick={() => setDemoRole('admin')} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                Pratinjau Dashboard Admin
              </button>
            </div>
          </div>
        </div>
      )}

      <Auth onLoginSuccess={(sess) => setSession(sess)} theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
}
