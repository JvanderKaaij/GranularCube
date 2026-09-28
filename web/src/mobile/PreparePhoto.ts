/** Resize phone camera images before sending them; preserve the browser's EXIF orientation. */
export async function preparePhoto(file: File, signal: AbortSignal): Promise<File> {
  if (!file.size || file.size > 45 * 1024 * 1024) throw new Error('Choose a photo smaller than 45 MB.');
  const url = URL.createObjectURL(file);
  try {
    const photo = new Image();
    await new Promise<void>((resolve, reject) => {
      const cancel = () => { photo.src = ''; reject(new DOMException('Photo canceled', 'AbortError')); };
      const cleanup = () => signal.removeEventListener('abort', cancel);
      photo.onload = () => { cleanup(); resolve(); };
      photo.onerror = () => { cleanup(); reject(new Error('This photo could not be opened. Choose a JPEG, PNG or WebP photo, or take a new picture.')); };
      signal.throwIfAborted(); signal.addEventListener('abort', cancel, { once: true }); photo.src = url;
    });
    signal.throwIfAborted();
    const scale = Math.min(1, 1600 / Math.max(photo.naturalWidth, photo.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the photo.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not prepare the photo.')), 'image/jpeg', 0.86));
    signal.throwIfAborted();
    if (blob.size > 8 * 1024 * 1024) throw new Error('This photo is too large. Try a smaller image.');
    return new File([blob], 'painting.jpg', { type: 'image/jpeg' });
  } finally { URL.revokeObjectURL(url); }
}
