import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Camera, Clock, CheckCircle2, AlertTriangle, 
  LogOut, RefreshCw, Calendar, Shield, Moon, Sun, Image as ImageIcon, LogIn, Upload
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateHaversineDistance } from '../utils/haversine';
import { compressImageFromElement } from '../utils/compressImage';
import { getTodaySchedule, checkLateArrival, checkEarlyDeparture, getShiftDate } from '../utils/schedule';

export function EmployeeDashboard({ profile, onLogout, theme, toggleTheme }) {
  const [settings, setSettings] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);

  // GPS State
  const [userCoords, setUserCoords] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [isInRadius, setIsInRadius] = useState(false);

  // Camera & Image State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhotoBlob, setCapturedPhotoBlob] = useState(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);
  const [photoError, setPhotoError] = useState(null);

  // Shift & Mode State
  const [selectedShift, setSelectedShift] = useState(
    profile?.kategori_pegawai === 'pamdal' ? 'pamdal_siang' : 'reguler'
  );
  const [attendanceMode, setAttendanceMode] = useState('masuk'); // 'masuk' | 'pulang'
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedHistoryPhoto, setSelectedHistoryPhoto] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCompanySettings();
    fetchAttendanceHistory();
    startGpsTracking();

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (userCoords && settings) {
      const dist = calculateHaversineDistance(
        userCoords.latitude,
        userCoords.longitude,
        settings.latitude,
        settings.longitude
      );
      setDistanceMeters(dist);
      setIsInRadius(dist <= (settings.radius_meter || 50));
    }
  }, [userCoords, settings]);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase.from('company_settings').select('*').eq('id', 1).single();
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (data) {
        setAttendances(data);
        const shiftDate = getShiftDate(profile.kategori_pegawai, selectedShift);
        const todayRec = data.find((item) => item.tanggal_shift === shiftDate);
        setTodayAttendance(todayRec || null);

        if (todayRec?.waktu_masuk && !todayRec?.waktu_pulang) {
          setAttendanceMode('pulang');
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung Geolocation GPS.');
      return;
    }

    navigator.geolocation.watchPosition(
      (pos) => {
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setGpsError(null);
      },
      (err) => {
        setGpsError('Gagal mengakses GPS. Izinkan lokasi di browser HP/Laptop Anda.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Universal Camera Opener
  const startCamera = async () => {
    setPhotoError(null);
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });
      } catch (e1) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Autoplay prevented:', playErr);
        }
      }
      setIsCameraActive(true);
    } catch (err) {
      setPhotoError('Kamera tidak dapat diakses langsung. Silakan gunakan tombol "Upload Foto Selfie" di bawah.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const blob = await compressImageFromElement(videoRef.current);
      setCapturedPhotoBlob(blob);
      setCapturedPhotoUrl(URL.createObjectURL(blob));
      stopCamera();
    } catch (err) {
      setPhotoError('Gagal mengambil foto snapshot kamera.');
    }
  };

  // Handle File Input Fallback
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setPhotoError(null);
      const blob = await compressImageFromElement(file);
      setCapturedPhotoBlob(blob);
      setCapturedPhotoUrl(URL.createObjectURL(blob));
      stopCamera();
    } catch (err) {
      setPhotoError('Gagal memproses file foto selfie.');
    }
  };

  const resetPhoto = () => {
    setCapturedPhotoBlob(null);
    setCapturedPhotoUrl(null);
    startCamera();
  };

  const handleClockIn = async () => {
    if (!isInRadius) {
      setMessage({ type: 'error', text: 'Gagal Absen: Anda berada di luar radius lokasi kantor!' });
      return;
    }
    if (!capturedPhotoBlob) {
      setMessage({ type: 'error', text: 'Gagal Absen: Ambil foto selfie bukti fisik terlebih dahulu!' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const fileName = `masuk_${profile.id}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, capturedPhotoBlob, { contentType: 'image/jpeg' });

      let photoUrl = '';
      if (uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('attendance-photos')
          .getPublicUrl(fileName);
        photoUrl = publicUrlData?.publicUrl || '';
      }

      const currentSchedule = getTodaySchedule(profile.kategori_pegawai, selectedShift, settings || {});
      const statusMasuk = checkLateArrival(new Date(), currentSchedule.jamMasuk);
      const shiftDate = getShiftDate(profile.kategori_pegawai, selectedShift);

      const { data: newRec, error: dbErr } = await supabase.from('attendances').insert({
        user_id: profile.id,
        tanggal_shift: shiftDate,
        shift_type: selectedShift,
        waktu_masuk: new Date().toISOString(),
        lat_masuk: userCoords.latitude,
        lng_masuk: userCoords.longitude,
        foto_masuk_url: photoUrl,
        status_masuk: statusMasuk,
        jarak_masuk_meter: distanceMeters
      }).select().single();

      if (dbErr) throw dbErr;

      setMessage({ type: 'success', text: 'Berhasil Absen Masuk! Kehadiran Anda telah dicatat.' });
      setTodayAttendance(newRec);
      setAttendanceMode('pulang');
      setCapturedPhotoBlob(null);
      setCapturedPhotoUrl(null);
      fetchAttendanceHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan absensi.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!isInRadius) {
      setMessage({ type: 'error', text: 'Gagal Absen: Anda berada di luar radius lokasi kantor!' });
      return;
    }
    if (!capturedPhotoBlob) {
      setMessage({ type: 'error', text: 'Gagal Absen: Ambil foto selfie bukti fisik terlebih dahulu!' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const fileName = `pulang_${profile.id}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, capturedPhotoBlob, { contentType: 'image/jpeg' });

      let photoUrl = '';
      if (uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('attendance-photos')
          .getPublicUrl(fileName);
        photoUrl = publicUrlData?.publicUrl || '';
      }

      const currentSchedule = getTodaySchedule(profile.kategori_pegawai, selectedShift, settings || {});
      const statusPulang = checkEarlyDeparture(new Date(), currentSchedule.jamPulang, currentSchedule.isCrossMidnight);

      if (todayAttendance?.id) {
        const { error: dbErr } = await supabase
          .from('attendances')
          .update({
            waktu_pulang: new Date().toISOString(),
            lat_pulang: userCoords.latitude,
            lng_pulang: userCoords.longitude,
            foto_pulang_url: photoUrl,
            status_pulang: statusPulang,
            jarak_pulang_meter: distanceMeters
          })
          .eq('id', todayAttendance.id);

        if (dbErr) throw dbErr;
      } else {
        const shiftDate = getShiftDate(profile.kategori_pegawai, selectedShift);
        const { error: dbErr } = await supabase.from('attendances').insert({
          user_id: profile.id,
          tanggal_shift: shiftDate,
          shift_type: selectedShift,
          waktu_masuk: new Date().toISOString(),
          waktu_pulang: new Date().toISOString(),
          lat_masuk: userCoords.latitude,
          lng_masuk: userCoords.longitude,
          lat_pulang: userCoords.latitude,
          lng_pulang: userCoords.longitude,
          foto_masuk_url: photoUrl,
          foto_pulang_url: photoUrl,
          status_masuk: 'tepat_waktu',
          status_pulang: statusPulang,
          jarak_masuk_meter: distanceMeters,
          jarak_pulang_meter: distanceMeters
        });

        if (dbErr) throw dbErr;
      }

      setMessage({ type: 'success', text: 'Berhasil Absen Pulang! Selamat beristirahat.' });
      setCapturedPhotoBlob(null);
      setCapturedPhotoUrl(null);
      fetchAttendanceHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan absensi pulang.' });
    } finally {
      setSubmitting(false);
    }
  };

  const scheduleInfo = getTodaySchedule(profile.kategori_pegawai, selectedShift, settings || {});

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Top Bar Header */}
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
                Portal Absensi Pegawai
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {profile.nama_lengkap} ({profile.nip}) • <span className="text-gold" style={{ fontWeight: 600 }}>{profile.kategori_pegawai.toUpperCase()}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

      {/* Main Content Container */}
      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 16px' }}>
        
        {/* Banner Alert Message */}
        {message && (
          <div style={{
            background: message.type === 'error' ? 'rgba(232, 48, 14, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${message.type === 'error' ? 'var(--color-brand-primary)' : '#10b981'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: message.type === 'error' ? 'var(--color-brand-primary)' : '#10b981'
          }}>
            {message.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            <span style={{ fontWeight: 600 }}>{message.text}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* LEFT COLUMN: Absen Action Box */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }} className="text-gold">
                Form Absensi Presisi
              </h2>
              <span className="badge badge-gold">
                <Clock size={14} /> {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            </div>

            {/* TAB SELECTOR: Absen Masuk vs Absen Pulang */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <button
                className={`btn ${attendanceMode === 'masuk' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAttendanceMode('masuk')}
                style={{ padding: '10px' }}
              >
                <LogIn size={16} /> Absen Masuk
              </button>
              <button
                className={`btn ${attendanceMode === 'pulang' ? 'btn-gold' : 'btn-outline'}`}
                onClick={() => setAttendanceMode('pulang')}
                style={{ padding: '10px' }}
              >
                <LogOut size={16} /> Absen Pulang
              </button>
            </div>

            {/* Status Absen Masuk jika sudah dicatat */}
            {todayAttendance?.waktu_masuk && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '0.82rem',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} /> Absen Masuk: {new Date(todayAttendance.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                {todayAttendance?.waktu_pulang && ` | Pulang: ${new Date(todayAttendance.waktu_pulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
              </div>
            )}

            {/* Shift Selector if Pamdal */}
            {profile.kategori_pegawai === 'pamdal' && (
              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">Pilih Shift Kerja Pamdal</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className={`btn ${selectedShift === 'pamdal_siang' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedShift('pamdal_siang')}
                  >
                    <Sun size={16} /> Shift Siang (08-20)
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedShift === 'pamdal_malam' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedShift('pamdal_malam')}
                  >
                    <Moon size={16} /> Shift Malam (20-08)
                  </button>
                </div>
              </div>
            )}

            {/* Shift Schedule Info Card */}
            <div style={{
              background: 'var(--surface-card)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              borderLeft: '4px solid var(--text-gold)',
              fontSize: '0.85rem'
            }}>
              <div><strong>Jadwal:</strong> {scheduleInfo.namaShift}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                Target Masuk: <span className="text-gold">{scheduleInfo.jamMasuk}</span> | Target Pulang: <span className="text-gold">{scheduleInfo.jamPulang}</span>
              </div>
            </div>

            {/* GPS Location Status Indicator */}
            <div style={{
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              background: isInRadius ? 'rgba(16, 185, 129, 0.12)' : 'rgba(232, 48, 14, 0.12)',
              border: `1px solid ${isInRadius ? 'rgba(16, 185, 129, 0.3)' : 'rgba(232, 48, 14, 0.3)'}`,
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color={isInRadius ? '#10b981' : '#e8300e'} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isInRadius ? '#10b981' : '#e8300e' }}>
                    {isInRadius ? 'Dalam Radius Kantor' : 'Di Luar Radius Kantor'}
                  </span>
                </div>
                {distanceMeters !== null && (
                  <span className={`badge ${isInRadius ? 'badge-success' : 'badge-danger'}`}>
                    {distanceMeters} meter
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {settings ? `Kantor: ${settings.nama_kantor} (Maks ${settings.radius_meter}m)` : 'Memuat data kantor...'}
              </p>
              {gpsError && (
                <p style={{ fontSize: '0.78rem', color: 'var(--color-brand-primary)', marginTop: '6px' }}>
                  ⚠️ {gpsError}
                </p>
              )}
            </div>

            {/* Camera Preview / Captured Photo / File Upload */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label">Bukti Foto Selfie Live / File</label>
                {capturedPhotoUrl && (
                  <button onClick={resetPhoto} style={{ background: 'none', border: 'none', color: 'var(--text-gold)', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <RefreshCw size={14} style={{ display: 'inline', marginRight: '4px' }} /> Foto Ulang
                  </button>
                )}
              </div>

              <div className="camera-box">
                {capturedPhotoUrl ? (
                  <img src={capturedPhotoUrl} alt="Selfie Preview" />
                ) : isCameraActive ? (
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Camera size={44} color="var(--text-gold)" style={{ marginBottom: '10px' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      Buka kamera live atau upload foto selfie dari perangkat HP/Laptop Anda
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button onClick={startCamera} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                        <Camera size={16} /> Buka Kamera Live
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="btn btn-gold" style={{ fontSize: '0.85rem' }}>
                        <Upload size={16} /> Upload Foto Selfie
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden File Input for Native Camera/File Upload */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="user"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

              {isCameraActive && !capturedPhotoUrl && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    onClick={capturePhoto}
                    className="btn btn-gold"
                    style={{ flex: 2 }}
                  >
                    <Camera size={18} /> Ambil Foto Snapshot
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                  >
                    <Upload size={18} /> Upload
                  </button>
                </div>
              )}

              {photoError && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-brand-primary)', marginTop: '6px' }}>
                  {photoError}
                </p>
              )}
            </div>

            {/* Action Buttons: Clock In / Clock Out based on active Tab */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {attendanceMode === 'masuk' ? (
                <button
                  onClick={handleClockIn}
                  className="btn btn-primary pulse-active"
                  style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
                  disabled={!isInRadius || !capturedPhotoBlob || submitting}
                >
                  {submitting ? 'Memproses Absen Masuk...' : 'ABSEN MASUK (CLOCK IN)'}
                </button>
              ) : (
                <button
                  onClick={handleClockOut}
                  className="btn btn-gold pulse-active"
                  style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
                  disabled={!isInRadius || !capturedPhotoBlob || submitting}
                >
                  {submitting ? 'Memproses Absen Pulang...' : 'ABSEN PULANG (CLOCK OUT)'}
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Personal Attendance History */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }} className="text-gradient">
                Riwayat Absensi Pribadi
              </h2>
              <button onClick={fetchAttendanceHistory} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {attendances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Calendar size={40} style={{ opacity: 0.4, marginBottom: '10px' }} />
                <p>Belum ada catatan riwayat absensi.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
                {attendances.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--surface-card)',
                      border: '1px solid var(--surface-card-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }} className="text-gold">
                        {item.tanggal_shift}
                      </span>
                      <span className={`badge ${item.status_masuk === 'tepat_waktu' ? 'badge-success' : 'badge-danger'}`}>
                        {item.status_masuk === 'tepat_waktu' ? 'Tepat Waktu' : 'Terlambat'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <div>
                        <strong>Masuk:</strong> {new Date(item.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ({item.jarak_masuk_meter}m)
                      </div>
                      <div>
                        <strong>Pulang:</strong> {item.waktu_pulang ? new Date(item.waktu_pulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    </div>

                    {/* Photos Preview Buttons */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      {item.foto_masuk_url && (
                        <button
                          onClick={() => setSelectedHistoryPhoto(item.foto_masuk_url)}
                          className="btn btn-outline"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <ImageIcon size={12} /> Foto Masuk
                        </button>
                      )}
                      {item.foto_pulang_url && (
                        <button
                          onClick={() => setSelectedHistoryPhoto(item.foto_pulang_url)}
                          className="btn btn-outline"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          <ImageIcon size={12} /> Foto Pulang
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Modal Preview Photo */}
      {selectedHistoryPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedHistoryPhoto(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '14px', fontSize: '1.1rem' }} className="text-gold">Bukti Foto Absen Selfie</h3>
            <img src={selectedHistoryPhoto} alt="Bukti Foto Absen" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }} />
            <button onClick={() => setSelectedHistoryPhoto(null)} className="btn btn-primary" style={{ width: '100%' }}>
              Tutup Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
