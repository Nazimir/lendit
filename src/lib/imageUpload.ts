'use client';

/**
 * Make an image file safe for the web.
 *
 * iPhones save photos as HEIC by default and most browsers can't display them,
 * so we detect HEIC/HEIF files and convert them to JPEG in the browser before
 * uploading. Other formats (JPEG, PNG, WebP, GIF) pass through unchanged.
 */
export async function normalizeImage(file: File): Promise<File> {
  const isHeic =
    /\.hei[cf]$/i.test(file.name) ||
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.type === '' && /\.hei[cf]$/i.test(file.name);

  if (!isHeic) return file;

  // Dynamically import so the library isn't loaded for non-HEIC paths
  const heic2anyModule = await import('heic2any');
  const heic2any = heic2anyModule.default || heic2anyModule;

  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.85
  });
  const blob = Array.isArray(result) ? result[0] : result;
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}
