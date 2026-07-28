import React, { useState, useEffect } from 'react';
import { 
  Users, MapPin, FileSpreadsheet, FileText, Settings, 
  Plus, Edit, Trash2, Shield, LogOut, Search, Filter, RefreshCw, CheckCircle2, AlertTriangle, Sun, Moon 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function AdminDashboard({ profile, onLogout, theme, toggleTheme }) {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'employees' | 'settings'
  
  // Data States
  const [employees, setEmployees] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [settings, setSettings] = useState({
    nama_kantor: 'Kantor Utama',
    latitude: -6.175392,
    longitude: 106.827153,
    radius_meter: 50,
    jam_masuk_reguler: '08:00',
    jam_pulang_senin_kamis: '16:00',
    jam_pulang_jumat: '16:30',
    jam_masuk_pamdal_siang: '08:00',
    jam_pulang_pamdal_siang: '20:00',
    jam_masuk_pamdal_malam: '20:00',
    jam_pulang_pamdal_malam: '08:00'
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    nama_lengkap: '',
    nip: '',
    password: '',
    role: 'pegawai',
    kategori_pegawai: 'reguler'
  });
  const [loadingAction, setLoadingAction] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchEmployees();
    fetchAttendances();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('company_settings').select('*').eq('id', 1).single();
      if (data) setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (data) setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchAttendances = async () => {
    try {
      const { data } = await supabase
        .from('attendances')
        .select(`
          *,
          profiles:user_id (nama_lengkap, nip, kategori_pegawai)
        `)
        .order('created_at', { ascending: false });
      if (data) setAttendances(data);
    } catch (err) {
      console.error('Error fetching attendances:', err);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoadingAction(true);
    setAlertMsg(null);

    try {
      const email = `${newEmployee.nip.trim()}@absensi.local`;
      
      // Gunakan secondary Supabase client dengan persistSession: false
      // agar tidak menimpa / merubah sesi login Admin yang sedang aktif!
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ztqdmyuhvhqijfgesgfg.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5RdYRzwZJcXO__p1wBVulA_3kOn73pI';
      
      const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });

      const { data: authData, error: authErr } = await tempAuthClient.auth.signUp({
        email,
        password: newEmployee.password,
        options: {
          data: {
            nama_lengkap: newEmployee.nama_lengkap,
            nip: newEmployee.nip
          }
        }
      });

      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (userId) {
        // Simpan / update profil pegawai baru
        const { error: profileErr } = await supabase.from('profiles').upsert({
          id: userId,
          nama_lengkap: newEmployee.nama_lengkap,
          nip: newEmployee.nip,
          role: newEmployee.role,
          kategori_pegawai: newEmployee.kategori_pegawai
        });

        if (profileErr) throw profileErr;
      }

      setAlertMsg({ type: 'success', text: `Berhasil! Pegawai ${newEmployee.nama_lengkap} (NIP: ${newEmployee.nip}) telah ditambahkan.` });
      setIsEmployeeModalOpen(false);
      setNewEmployee({ nama_lengkap: '', nip: '', password: '', role: 'pegawai', kategori_pegawai: 'reguler' });
      fetchEmployees();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message || 'Gagal menambahkan pegawai baru.' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoadingAction(true);
    setAlertMsg(null);

    try {
      const { error } = await supabase.from('company_settings').update({
        nama_kantor: settings.nama_kantor,
        latitude: settings.latitude,
        longitude: settings.longitude,
        radius_meter: settings.radius_meter,
        jam_masuk_reguler: settings.jam_masuk_reguler,
        jam_pulang_senin_kamis: settings.jam_pulang_senin_kamis,
        jam_pulang_jumat: settings.jam_pulang_jumat,
        jam_masuk_pamdal_siang: settings.jam_masuk_pamdal_siang,
        jam_pulang_pamdal_siang: settings.jam_pulang_pamdal_siang,
        jam_masuk_pamdal_malam: settings.jam_masuk_pamdal_malam,
        jam_pulang_pamdal_malam: settings.jam_pulang_pamdal_malam
      }).eq('id', 1);

      if (error) throw error;
      setAlertMsg({ type: 'success', text: 'Pengaturan kantor & jam kerja berhasil diperbarui!' });
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message || 'Gagal memperbarui pengaturan kantor.' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung Geolocation.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettings((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
        alert(`Koordinat kantor berhasil diperbarui ke lokasi Anda saat ini:\nLat: ${pos.coords.latitude}, Lng: ${pos.coords.longitude}`);
      },
      (err) => alert('Gagal mendapatkan lokasi GPS dari perangkat Anda.')
    );
  };

  const filteredAttendances = attendances.filter((item) => {
    const matchesSearch =
      item.profiles?.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.profiles?.nip?.includes(searchQuery);
    const matchesDate = filterDate ? item.tanggal_shift === filterDate : true;
    return matchesSearch && matchesDate;
  });

  const exportToExcel = () => {
    const excelData = filteredAttendances.map((item, idx) => ({
      No: idx + 1,
      Tanggal: item.tanggal_shift,
      Nama: item.profiles?.nama_lengkap || '-',
      NIP: item.profiles?.nip || '-',
      Kategori: item.profiles?.kategori_pegawai || '-',
      Shift: item.shift_type,
      JamMasuk: item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleTimeString('id-ID') : '-',
      StatusMasuk: item.status_masuk === 'tepat_waktu' ? 'Tepat Waktu' : 'Terlambat',
      JarakMasukMeter: item.jarak_masuk_meter,
      JamPulang: item.waktu_pulang ? new Date(item.waktu_pulang).toLocaleTimeString('id-ID') : '-',
      StatusPulang: item.status_pulang || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Absensi');
    XLSX.writeFile(workbook, `Laporan_Absensi_Pegawai_${filterDate || 'All'}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`LAPORAN REKAPITULASI ABSENSI PEGAWAI`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal Perolehan: ${filterDate || 'Semua Tanggal'}`, 14, 22);

    const tableColumn = ['No', 'Nama', 'NIP', 'Shift', 'Jam Masuk', 'Status', 'Jam Pulang'];
    const tableRows = filteredAttendances.map((item, idx) => [
      idx + 1,
      item.profiles?.nama_lengkap || '-',
      item.profiles?.nip || '-',
      item.shift_type,
      item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      item.status_masuk === 'tepat_waktu' ? 'Tepat Waktu' : 'Terlambat',
      item.waktu_pulang ? new Date(item.waktu_pulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [102, 3, 0] }
    });

    doc.save(`Laporan_Absensi_${filterDate || 'All'}.pdf`);
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Admin Top Header */}
      <header className="glass-header" style={{ padding: '16px 24px' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={24} color="#ffdc73" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800 }} className="text-gradient">
                Administrator Portal Absensi
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {profile.nama_lengkap} (ADMIN)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={`Ubah ke ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={18} color="#ffdc73" /> : <Moon size={18} color="#660300" />}
            </button>

            <button onClick={onLogout} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 16px' }}>

        {alertMsg && (
          <div style={{
            background: alertMsg.type === 'error' ? 'rgba(232, 48, 14, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${alertMsg.type === 'error' ? 'var(--color-brand-primary)' : '#10b981'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: alertMsg.type === 'error' ? 'var(--color-brand-primary)' : '#10b981'
          }}>
            {alertMsg.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            <span style={{ fontWeight: 600 }}>{alertMsg.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <button
            className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileText size={18} /> Laporan & Rekap Absensi
          </button>
          <button
            className={`btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('employees')}
          >
            <Users size={18} /> Kelola Pegawai ({employees.length})
          </button>
          <button
            className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} /> Pengaturan Kantor & Jam Kerja
          </button>
        </div>

        {/* TAB 1: REPORTS & REKAP */}
        {activeTab === 'reports' && (
          <div>
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '240px' }}>
                    <Search size={16} color="var(--text-gold)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '36px', paddingRight: '12px', height: '40px' }}
                      placeholder="Cari Nama / NIP..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '170px', height: '40px' }}
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />

                  <button onClick={fetchAttendances} className="btn btn-outline" style={{ height: '40px', padding: '0 14px' }}>
                    <RefreshCw size={16} /> Filter
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={exportToExcel} className="btn btn-gold" style={{ height: '40px' }}>
                    <FileSpreadsheet size={18} /> Export Excel
                  </button>
                  <button onClick={exportToPDF} className="btn btn-primary" style={{ height: '40px' }}>
                    <FileText size={18} /> Export PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--surface-card-border)', color: 'var(--text-gold)' }}>
                    <th style={{ padding: '12px' }}>Tanggal</th>
                    <th style={{ padding: '12px' }}>Pegawai</th>
                    <th style={{ padding: '12px' }}>NIP</th>
                    <th style={{ padding: '12px' }}>Shift</th>
                    <th style={{ padding: '12px' }}>Jam Masuk</th>
                    <th style={{ padding: '12px' }}>Status Masuk</th>
                    <th style={{ padding: '12px' }}>Jam Pulang</th>
                    <th style={{ padding: '12px' }}>Bukti Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendances.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Tidak ada data absensi yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendances.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--table-border)' }}>
                        <td style={{ padding: '12px' }}>{row.tanggal_shift}</td>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{row.profiles?.nama_lengkap || '-'}</td>
                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{row.profiles?.nip || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <span className="badge badge-gold">{row.shift_type}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {row.waktu_masuk ? new Date(row.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} ({row.jarak_masuk_meter}m)
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge ${row.status_masuk === 'tepat_waktu' ? 'badge-success' : 'badge-danger'}`}>
                            {row.status_masuk === 'tepat_waktu' ? 'Tepat Waktu' : 'Terlambat'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {row.waktu_pulang ? new Date(row.waktu_pulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {row.foto_masuk_url && (
                            <a href={row.foto_masuk_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-gold)', textDecoration: 'underline' }}>
                              Lihat Foto
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: EMPLOYEES MANAGEMENT */}
        {activeTab === 'employees' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }} className="text-gold">
                Daftar Seluruh Pegawai
              </h2>
              <button onClick={() => setIsEmployeeModalOpen(true)} className="btn btn-gold">
                <Plus size={18} /> Tambah Pegawai Baru
              </button>
            </div>

            <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--surface-card-border)', color: 'var(--text-gold)' }}>
                    <th style={{ padding: '12px' }}>NIP / NIK</th>
                    <th style={{ padding: '12px' }}>Nama Lengkap</th>
                    <th style={{ padding: '12px' }}>Peran (Role)</th>
                    <th style={{ padding: '12px' }}>Kategori Pegawai</th>
                    <th style={{ padding: '12px' }}>Tanggal Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--table-border)' }}>
                      <td style={{ padding: '12px', fontWeight: 700 }} className="text-gold">{emp.nip}</td>
                      <td style={{ padding: '12px' }}>{emp.nama_lengkap}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${emp.role === 'admin' ? 'badge-danger' : 'badge-gold'}`}>
                          {emp.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className="badge badge-success">
                          {emp.kategori_pegawai.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {new Date(emp.created_at).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="glass-panel" style={{ padding: '28px', maxWidth: '750px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }} className="text-gold">
              Pengaturan Lokasi Kantor & Batas Jam Kerja
            </h2>

            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label className="form-label">Nama Kantor / Instansi</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.nama_kantor}
                  onChange={(e) => setSettings({ ...settings, nama_kantor: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Latitude Kantor</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={settings.latitude}
                    onChange={(e) => setSettings({ ...settings, latitude: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Longitude Kantor</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={settings.longitude}
                    onChange={(e) => setSettings({ ...settings, longitude: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Radius (Meter)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.radius_meter}
                    onChange={(e) => setSettings({ ...settings, radius_meter: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="btn btn-outline"
                style={{ width: '100%', marginBottom: '24px' }}
              >
                <MapPin size={16} /> Ambil Koordinat GPS Perangkat Saya Saat Ini
              </button>

              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }} className="text-gradient">
                Target Jam Kerja Pegawai Reguler
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Jam Masuk (Reguler)</label>
                  <input
                    type="time"
                    className="form-input"
                    value={settings.jam_masuk_reguler}
                    onChange={(e) => setSettings({ ...settings, jam_masuk_reguler: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Jam Pulang (Senin - Kamis)</label>
                  <input
                    type="time"
                    className="form-input"
                    value={settings.jam_pulang_senin_kamis}
                    onChange={(e) => setSettings({ ...settings, jam_pulang_senin_kamis: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Jam Pulang (Jumat)</label>
                  <input
                    type="time"
                    className="form-input"
                    value={settings.jam_pulang_jumat}
                    onChange={(e) => setSettings({ ...settings, jam_pulang_jumat: e.target.value })}
                  />
                </div>
              </div>

              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }} className="text-gradient">
                Target Jam Kerja Pegawai Pamdal (Shift)
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Pamdal Shift Siang (Masuk / Pulang)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="time"
                      className="form-input"
                      value={settings.jam_masuk_pamdal_siang}
                      onChange={(e) => setSettings({ ...settings, jam_masuk_pamdal_siang: e.target.value })}
                    />
                    <input
                      type="time"
                      className="form-input"
                      value={settings.jam_pulang_pamdal_siang}
                      onChange={(e) => setSettings({ ...settings, jam_pulang_pamdal_siang: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Pamdal Shift Malam (Masuk / Pulang Esok)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="time"
                      className="form-input"
                      value={settings.jam_masuk_pamdal_malam}
                      onChange={(e) => setSettings({ ...settings, jam_masuk_pamdal_malam: e.target.value })}
                    />
                    <input
                      type="time"
                      className="form-input"
                      value={settings.jam_pulang_pamdal_malam}
                      onChange={(e) => setSettings({ ...settings, jam_pulang_pamdal_malam: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loadingAction}>
                {loadingAction ? 'Menyimpan...' : 'Simpan Perubahan Pengaturan'}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* Modal Add Employee */}
      {isEmployeeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEmployeeModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '18px', fontSize: '1.2rem' }} className="text-gold">
              Tambah Pegawai Baru
            </h3>

            <form onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap Pegawai</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Ahmad Subagyo"
                  value={newEmployee.nama_lengkap}
                  onChange={(e) => setNewEmployee({ ...newEmployee, nama_lengkap: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nomor Induk Pegawai (NIP / NIK)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: 19890102001"
                  value={newEmployee.nip}
                  onChange={(e) => setNewEmployee({ ...newEmployee, nip: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password Akses Akun</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Minimal 6 karakter"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Peran Akses Sistem</label>
                  <select
                    className="form-select"
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  >
                    <option value="pegawai">Pegawai</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Kategori Pegawai</label>
                  <select
                    className="form-select"
                    value={newEmployee.kategori_pegawai}
                    onChange={(e) => setNewEmployee({ ...newEmployee, kategori_pegawai: e.target.value })}
                  >
                    <option value="reguler">Reguler</option>
                    <option value="pamdal">Pamdal (Shift)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={loadingAction}
                >
                  {loadingAction ? 'Menyimpan...' : 'Simpan Pegawai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
