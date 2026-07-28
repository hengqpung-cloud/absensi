import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, Sparkles, Sun, Moon, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Auth({ onLoginSuccess, theme, toggleTheme }) {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setDebugInfo(null);
    setLoading(true);

    try {
      const inputVal = nip.trim();
      const email = inputVal.includes('@') ? inputVal : `${inputVal}@absensi.local`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setDebugInfo({
          attemptedEmail: email,
          rawMessage: error.message,
          status: error.status || 'Auth Error'
        });
        throw new Error(error.message);
      }

      if (data?.session) {
        onLoginSuccess(data.session);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top right theme toggle */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={`Ubah ke ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={20} color="#ffdc73" /> : <Moon size={20} color="#660300" />}
        </button>
      </div>

      {/* Decorative Glow Elements */}
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'rgba(232, 48, 14, 0.15)',
        filter: 'blur(80px)',
        top: '10%',
        left: '15%',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(255, 220, 115, 0.12)',
        filter: 'blur(90px)',
        bottom: '15%',
        right: '15%',
        pointerEvents: 'none'
      }} />

      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '36px 28px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-dark) 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(232, 48, 14, 0.4)',
            marginBottom: '14px'
          }}>
            <Shield size={32} color="#ffdc73" />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }} className="text-gradient">
            Sistem Absensi Pegawai
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Presisi Lokasi GPS & Selfie Bukti Fisik
          </p>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(232, 48, 14, 0.15)',
            border: '1px solid rgba(232, 48, 14, 0.4)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            marginBottom: '20px',
            color: 'var(--color-brand-primary)',
            fontSize: '0.88rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, marginBottom: '4px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>Gagal Login: {errorMsg}</span>
            </div>

            {debugInfo && (
              <div style={{
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px dashed rgba(232, 48, 14, 0.3)',
                fontSize: '0.78rem',
                color: 'var(--text-muted)'
              }}>
                <div><strong>Email Target:</strong> {debugInfo.attemptedEmail}</div>
                <div><strong>Pesan Supabase:</strong> {debugInfo.rawMessage}</div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">NIP / Email Pegawai</label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-gold)" style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)'
              }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '42px' }}
                placeholder="Masukkan NIP atau Email"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password Kode Akses</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--text-gold)" style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)'
              }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '42px' }}
                placeholder="Masukkan Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            {loading ? 'Memverifikasi...' : 'Masuk ke Sistem'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          paddingTop: '18px',
          borderTop: '1px solid var(--surface-card-border)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '6px' }}>
            <Sparkles size={14} color="var(--text-gold)" />
            <span>Presisi Kehadiran Real-Time</span>
          </div>
          <span>Aplikasi Absensi Pegawai • Powered by Supabase & Vercel</span>
        </div>
      </div>
    </div>
  );
}
