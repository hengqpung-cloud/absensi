-- ========================================================
-- SKEMA DATABASE SUPABASE: APLIKASI ABSENSI PEGAWAI
-- ========================================================

-- 1. TABEL PROFILES (Ekstensi Pengguna)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_lengkap TEXT NOT NULL,
    nip TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'pegawai')) DEFAULT 'pegawai',
    kategori_pegawai TEXT NOT NULL CHECK (kategori_pegawai IN ('reguler', 'pamdal')) DEFAULT 'reguler',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL COMPANY_SETTINGS (Pengaturan Kantor & Jam Kerja)
CREATE TABLE IF NOT EXISTS public.company_settings (
    id INT PRIMARY KEY DEFAULT 1,
    nama_kantor TEXT NOT NULL DEFAULT 'Kantor Utama',
    latitude DOUBLE PRECISION NOT NULL DEFAULT -6.175392,
    longitude DOUBLE PRECISION NOT NULL DEFAULT 106.827153,
    radius_meter INT NOT NULL DEFAULT 50,
    jam_masuk_reguler TIME NOT NULL DEFAULT '08:00',
    jam_pulang_senin_kamis TIME NOT NULL DEFAULT '16:00',
    jam_pulang_jumat TIME NOT NULL DEFAULT '16:30',
    jam_masuk_pamdal_siang TIME NOT NULL DEFAULT '08:00',
    jam_pulang_pamdal_siang TIME NOT NULL DEFAULT '20:00',
    jam_masuk_pamdal_malam TIME NOT NULL DEFAULT '20:00',
    jam_pulang_pamdal_malam TIME NOT NULL DEFAULT '08:00',
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert Default Company Setting
INSERT INTO public.company_settings (id, nama_kantor, latitude, longitude, radius_meter)
VALUES (1, 'Kantor Utama', -6.175392, 106.827153, 50)
ON CONFLICT (id) DO NOTHING;

-- 3. TABEL ATTENDANCES (Log Absensi)
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tanggal_shift DATE NOT NULL,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('reguler', 'pamdal_siang', 'pamdal_malam')),
    waktu_masuk TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    waktu_pulang TIMESTAMPTZ,
    lat_masuk DOUBLE PRECISION NOT NULL,
    lng_masuk DOUBLE PRECISION NOT NULL,
    lat_pulang DOUBLE PRECISION,
    lng_pulang DOUBLE PRECISION,
    foto_masuk_url TEXT NOT NULL,
    foto_pulang_url TEXT,
    status_masuk TEXT NOT NULL CHECK (status_masuk IN ('tepat_waktu', 'terlambat')),
    status_pulang TEXT CHECK (status_pulang IN ('tepat_waktu', 'pulang_cepat')),
    jarak_masuk_meter DOUBLE PRECISION NOT NULL,
    jarak_pulang_meter DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk mempercepat query berdasarkan user dan tanggal
CREATE INDEX IF NOT EXISTS idx_attendances_user_shift ON public.attendances (user_id, tanggal_shift);

-- ========================================================
-- AUTOMATIC PROFILE TRIGGER UNTUK USER BARU
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nama_lengkap, nip, role, kategori_pegawai)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'nip', SPLIT_PART(NEW.email, '@', 1)),
    'pegawai',
    'reguler'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES PERMISSIVE
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin Insert Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin Update Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Read Settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admin Update Settings" ON public.company_settings;
DROP POLICY IF EXISTS "User Read Own Attendances" ON public.attendances;
DROP POLICY IF EXISTS "User Insert Own Attendance" ON public.attendances;
DROP POLICY IF EXISTS "User Update Own Attendance" ON public.attendances;

-- Create ALL Policies
CREATE POLICY "Enable All Profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable All Settings" ON public.company_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable All Attendances" ON public.attendances FOR ALL USING (true) WITH CHECK (true);
