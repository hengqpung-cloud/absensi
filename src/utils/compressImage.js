/**
 * Mengompresi data gambar dari Video / Canvas / Image Element / File menjadi Blob JPEG ringan (max 800x800px, 70% quality ~50-100KB)
 */
export async function compressImageFromElement(sourceInput) {
  let source = sourceInput;
  if (sourceInput instanceof File || sourceInput instanceof Blob) {
    source = await createImageBitmap(sourceInput);
  }

  let w = source.videoWidth || source.naturalWidth || source.width || 640;
  let h = source.videoHeight || source.naturalHeight || source.height || 480;
  const maxDim = 800;

  if (w > maxDim || h > maxDim) {
    if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
    else { w = Math.round((w * maxDim) / h); h = maxDim; }
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(source, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Gagal mengompresi gambar')), 'image/jpeg', 0.7);
  });
}
