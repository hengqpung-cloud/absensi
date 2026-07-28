/**
 - Logika Penentuan Status Absen (Terlambat/Tepat Waktu & Pulang Cepat)
 */

export function getTodaySchedule(kategoriPegawai, shiftType = 'reguler', settings = {}) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday

  if (kategoriPegawai === 'pamdal') {
    if (shiftType === 'pamdal_malam') {
      return {
        namaShift: 'Pamdal Shift Malam',
        jamMasuk: settings.jam_masuk_pamdal_malam || '20:00',
        jamPulang: settings.jam_pulang_pamdal_malam || '08:00',
        isCrossMidnight: true
      };
    }
    return {
      namaShift: 'Pamdal Shift Siang',
      jamMasuk: settings.jam_masuk_pamdal_siang || '08:00',
      jamPulang: settings.jam_pulang_pamdal_siang || '20:00',
      isCrossMidnight: false
    };
  }

  // Reguler Pegawai
  const isFriday = dayOfWeek === 5;
  return {
    namaShift: isFriday ? 'Reguler (Jumat)' : 'Reguler (Senin - Kamis)',
    jamMasuk: settings.jam_masuk_reguler || '08:00',
    jamPulang: isFriday
      ? (settings.jam_pulang_jumat || '16:30')
      : (settings.jam_pulang_senin_kamis || '16:00'),
    isCrossMidnight: false
  };
}

function toTargetDate(waktuAbsen, targetTimeStr) {
  const [h, m] = targetTimeStr.split(':').map(Number);
  const d = new Date(waktuAbsen);
  d.setHours(h, m, 0, 0);
  return d;
}

export function checkLateArrival(waktuAbsen, targetTimeStr) {
  return new Date(waktuAbsen).getTime() > toTargetDate(waktuAbsen, targetTimeStr).getTime() ? 'terlambat' : 'tepat_waktu';
}

export function checkEarlyDeparture(waktuAbsen, targetTimeStr) {
  return new Date(waktuAbsen).getTime() < toTargetDate(waktuAbsen, targetTimeStr).getTime() ? 'pulang_cepat' : 'tepat_waktu';
}

/**
 - Mendapatkan tanggal shift dalam format YYYY-MM-DD
 - Untuk Shift Malam Pamdal yang absen jam 00:00-08:00 pagi, tanggal shift dianggap tanggal kemarin.
 */
export function getShiftDate(kategoriPegawai, shiftType) {
  const now = new Date();
  if (kategoriPegawai === 'pamdal' && shiftType === 'pamdal_malam') {
    // Jika jam 00:00 s.d 12:00 siang saat absen pulang shift malam, tanggal shift = kemarin
    if (now.getHours() < 12) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
  }
  return now.toISOString().split('T')[0];
}
