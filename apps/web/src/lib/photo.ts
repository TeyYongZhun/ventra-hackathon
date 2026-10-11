// Camera photo → small JPEG for "Scan my meal": at most 1024 px on the long side, about
// 100–200 KB. Drawing it on a canvas also drops the photo's metadata (EXIF), including any
// GPS location. Browsers apply the EXIF rotation when they draw, so the photo stays upright.
export const PHOTO_MAX_PX = 1024;

export async function photoToJpeg(file: Blob, maxPx = PHOTO_MAX_PX, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot read photos.');
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
