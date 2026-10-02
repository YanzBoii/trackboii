async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fallback ci-dessous */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toDataUrl(src, max, quality) {
  const w = src.width, h = src.height;
  const s = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * s);
  canvas.height = Math.round(h * s);
  canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Retourne { ai: base64 (768 px, ~70 Ko : léger sur une connexion faible) pour l'IA, thumb: dataURL (320 px) à stocker }. */
export async function preparePhoto(file) {
  const bmp = await loadBitmap(file);
  const ai = toDataUrl(bmp, 768, 0.8);
  const thumb = toDataUrl(bmp, 320, 0.7);
  bmp.close?.();
  return { ai: ai.split(',')[1], thumb };
}
