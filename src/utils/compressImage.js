/**
 - Mengompres data gambar dari Canvas/File menjadi Blob JPEG ringan (max 800x800px, 70% quality)
 - @param {HTMLVideoElement | HTMLCanvasElement} sourceElement
 - @returns {Promise<Blob>}
 */
export function compressImageFromElement(sourceElement) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let width = sourceElement.videoWidth || sourceElement.width || 640;
      let height = sourceElement.videoHeight || sourceElement.height || 480;

      // Fit inside 800x800 max dimensions
      const maxDim = 800;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and flip horizontally for natural selfie view if needed
      ctx.drawImage(sourceElement, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Gagal mengompresi gambar'));
          }
        },
        'image/jpeg',
        0.7 // 70% quality -> ~50KB-100KB file size
      );
    } catch (err) {
      reject(err);
    }
  });
}
