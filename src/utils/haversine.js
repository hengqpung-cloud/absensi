/**
 - Mengukur jarak presisi dalam meter antara dua koordinat GPS menggunakan Formula Haversine
 - @param {number} lat1 - Latitude lokasi 1 (User)
 - @param {number} lon1 - Longitude lokasi 1 (User)
 - @param {number} lat2 - Latitude lokasi 2 (Office)
 - @param {number} lon2 - Longitude lokasi 2 (Office)
 - @returns {number} Jarak dalam meter
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return Infinity;
  }

  const R = 6371000; // Jari-jari bumi dalam meter
  const toRad = (angle) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.round(distance * 10) / 10; // Bulatkan ke 1 desimal
}
