/** Inline raster photos travel with the existing local state and JSON backups. */
export const MAX_PHOTO_LENGTH = 160_000;
export const vehiclePhotoPattern = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

export async function prepareVehiclePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Vyberte fotku vo formáte JPG, PNG alebo WebP.');
  }
  if (file.size > 20 * 1024 * 1024) throw new Error('Fotka je príliš veľká. Vyberte súbor menší ako 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Fotku sa nepodarilo spracovať.');
    for (const maxSide of [1000, 800, 600, 400]) {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.7, 0.55]) {
        const photo = canvas.toDataURL('image/jpeg', quality);
        if (photo.length <= MAX_PHOTO_LENGTH) return photo;
      }
    }
    throw new Error('Fotku sa nepodarilo zmenšiť. Vyberte inú fotku.');
  } finally {
    URL.revokeObjectURL(url);
  }
}