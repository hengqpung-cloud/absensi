# 🛡️ Sistem Absensi Pegawai Presisi

Aplikasi **Absensi Pegawai Presisi** adalah platform pencatatan kehadiran modern berbasis web responsive yang memanfaatkan **100% tools gratis (Free Tier Stack)**. Aplikasi ini dirancang untuk memastikan validitas kehadiran pegawai secara presisi menggunakan **GPS Geolocation (Haversine Formula)**, **Bukti Foto Selfie Live / File Upload**, serta penanganan jadwal kerja khusus untuk **Pegawai Reguler** dan **Pegawai Shift (Pamdal)**.

![License](https://img.shields.io/badge/License-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.3-blue.svg)
![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-emerald.svg)
![Vercel](https://img.shields.io/badge/Deployment-Vercel-black.svg)

---

## 🎨 Palet Warna Brand Lembaga

Antarmuka aplikasi dibangun menggunakan sistem desain custom glassmorphism yang menerapkan palet warna brand resmi:
* **Deep Maroon / Primary Dark**: `#660300`
* **Vibrant Red / Crimson Accent**: `#e8300e`
* **Warm Gold / Accent Badge**: `#ffdc73`
* **Dark Chocolate Surface / Background**: `#340705`

---

## ✨ Fitur Utama

### 📱 1. Portal Pegawai (Mobile & Desktop Responsive)
* **Validasi Lokasi GPS Presisi**: Mengukur jarak real-time (dalam meter) dari koordinat lokasi kantor. Tombol absen terkunci secara otomatis jika pegawai berada di luar batas radius kantor.
* **Kamera Selfie Live & Upload File**:
  * Mengambil foto snapshot secara live dari webcam browser.
  * Opsi fallback **Upload Foto Selfie** dari galeri HP atau kamera native perangkat.
  * Kompresi otomatis di sisi browser menggunakan Canvas API dari ~3MB menjadi **~50KB–100KB** per foto.
* **Manajemen Shift Kerja Lengkap**:
  * **Pegawai Reguler**: Jam pulang otomatis menyesuaikan hari (Senin–Kamis pukul `16:00`, Jumat pukul `16:30`).
  * **Pegawai Pamdal (Pengamanan Dalam)**: Mendukung Shift Siang (`08:00–20:00`) dan Shift Malam (`20:00–08:00` esok harinya, lintas tanggal).
* **Mode Absen Masuk (Clock In) & Absen Pulang (Clock Out)**: Pegawai dapat berpindah tab mode absen secara bebas kapan saja.
* **Riwayat Absensi Pribadi**: Menampilkan log kehadiran bulanan lengkap dengan indikator status keterlambatan dan preview foto selfie.

### 🏢 2. Portal Administrator
* **Monitoring Real-Time**: Ringkasan jumlah kehadiran, keterlambatan, dan status pegawai hari ini.
* **Manajemen Data Pegawai**: Tambah akun pegawai baru, atur peran (Admin/Pegawai), dan tentukan kategori (Reguler/Pamdal) tanpa merusak sesi login Admin.
* **Pengaturan Kantor & Jam Kerja**: Mengatur koordinat Latitude/Longitude kantor (dilengkapi fitur *Dapatkan Lokasi GPS Saya Saat Ini*), radius (meter), dan batas jam kerja.
* **Ekspor Laporan Resmi**:
  * **Export to Excel (`.xlsx`)**: Mengunduh tabel rekap absensi lengkap ke lembar kerja Excel.
  * **Export to PDF (`.pdf`)**: Mencetak dokumen rekapitulasi absensi berwarna sesuai identitas brand.

### 🌗 3. Fitur Light & Dark Mode
* Mendukung **Dark Mode** (default) dan **Light Mode** cerah berpotongan kontras tinggi yang dapat diganti kapan saja via tombol toggle ☀️/🌙 dan tersimpan otomatis di `localStorage`.

---

## 🛠️ Tech Stack & Dependencies

* **Frontend**: React 18, Vite, Lucide Icons (`lucide-react`).
* **Styling**: Custom Vanilla CSS Glassmorphism Design System (Tanpa kerangka kerja berat).
* **Backend & Database**: **Supabase** (PostgreSQL Database, Supabase Auth, Supabase Storage).
* **Utility Libraries**: `xlsx` (SheetJS) untuk ekspor Excel, `jspdf` & `jspdf-autotable` untuk ekspor PDF.
* **Hosting**: Vercel / Netlify (Free Tier Hosting dengan SSL HTTPS gratis).

---

## 🗄️ Langkah Setup Database Supabase (3 Langkah)

1. Buat proyek baru gratis di [Supabase.com](https://supabase.com/).
2. Buka menu **SQL Editor**, buat query baru, lalu salin dan jalankan seluruh isi berkas [supabase/schema.sql](file:///d:/Absensi/supabase/schema.sql).  
   *(Script ini membuat tabel `profiles`, `company_settings`, `attendances`, Trigger otomatis `handle_new_user`, serta aturan RLS)*.
3. Buka menu **Storage**, buat bucket baru bernama `attendance-photos` dan centang opsi **Public Bucket**.

---

## 🚀 Panduan Pengembangan Lokal (Local Development)

### 1. Kloning Repository & Install Dependensi
```bash
git clone https://github.com/hengqpung-cloud/absensi.git
cd absensi
npm install
```

### 2. Konfigurasi Environment Variables
Buat berkas `.env` di direktori utama dan isi dengan kredensial Supabase Anda:
```env
VITE_SUPABASE_URL=https://id-proyek-anda.supabase.co
VITE_SUPABASE_ANON_KEY=kunci-anon-public-supabase-anda
```

### 3. Jalankan Server Pengembang Lokal
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

### 4. Build untuk Produksi
```bash
npm run build
```

---

## 📄 Struktur Berkas Proyek

```
.
├── supabase/
│   └── schema.sql                # Script SQL Skema Database, RLS, Trigger & Storage
├── src/
│   ├── components/
│   │   ├── Auth.jsx              # Komponen Login NIP / Email & Password
│   │   ├── EmployeeDashboard.jsx # Dashboard Pegawai (GPS, Camera Live, Upload, History)
│   │   └── AdminDashboard.jsx    # Dashboard Admin (Stats, Pegawai, Settings, Export)
│   ├── lib/
│   │   └── supabase.js           # Inisialisasi Supabase Client SDK
│   ├── utils/
│   │   ├── haversine.js           # Formula Kalkulasi Jarak GPS Presisi (Meter)
│   │   ├── compressImage.js      # Utility Kompresi Foto Snapshot Canvas / File (~50KB)
│   │   └── schedule.js           # Logika Jam Kerja Reguler & Pamdal Shift Malam
│   ├── App.jsx                   # Main Router, Sesi Auth, & Switcher Tema (Light/Dark)
│   ├── index.css                 # Custom CSS Design System (Brand Palette & Glassmorphism)
│   └── main.jsx                  # Entrypoint React Root
├── .env.example                  # Template Konfigurasi Environment Variables
├── DESIGN.md                     # Dokumen Spesifikasi Arsitektur Sistem
├── index.html                    # Single Page Application HTML
├── package.json                  # Konfigurasi Dependensi Proyek
└── vite.config.js                # Konfigurasi Server Vite
```

---

## 📝 Lisensi & Hak Cipta

Dikembangkan untuk pencatatan absensi pegawai yang efisien, aman, dan hemat biaya.  
Lisensi di bawah **MIT License**.
