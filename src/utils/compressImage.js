/**
 - Mengompresi data gambar dari Video / Canvas / Image Element / File menjadi Blob JPEG ringan (max 800x800px, 70% quality ~50-100KB)
 - @param {HTMLVideoElement | HTMLCanvasElement | HTMLImageElement | File | Blob} sourceInput
 - @returns {Promise<Blob>}
 */
export function compressImageFromElement(sourceInput) {
  return new Promise((resolve, reject) => {
    try {
      if (sourceInput instanceof File || sourceInput instanceof Blob) {
        const img = new Image();
        img.onload = () => {
          processImageToCanvas(img, resolve, reject);
          URL.revokeObjectURL(img.src);
        };
        img.onerror = (err) => reject(new Error('Gagal membaca file gambar'));
        img.src = URL.createObjectURL(sourceInput);
      } else {
        processImageToCanvas(sourceInput, resolve, reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

function processImageToCanvas(sourceElement, resolve, reject) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let width = sourceElement.videoWidth || sourceElement.naturalWidth || sourceElement.width || 640;
    let height = sourceElement.videoHeight || sourceElement.naturalHeight || sourceElement.height || 480;

    // Batasi dimensi maksimum 800x800px
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
      0.7 // 70% quality -> file size ~50KB-100KB
    );
  } catch (err) {
    reject(err);
  }
}
