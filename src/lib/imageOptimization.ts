/**
 * convertToWebP — Client-side image optimization using the browser Canvas API.
 * Converts an image File or base64 string to WebP format at a given quality.
 *
 * - Preserves originals (returns a NEW File)
 * - Falls back to the original if conversion fails
 * - Works entirely in the browser — no server round-trip needed
 */

/**
 * Convert a File to WebP using an OffscreenCanvas / Canvas element.
 * @param file - Original image File
 * @param quality - WebP quality 0–100 (mapped to 0.0–1.0)
 * @returns A new File in WebP format, or the original if conversion fails.
 */
export async function convertFileToWebP(
  file: File,
  quality: number = 85
): Promise<{ file: File; converted: boolean }> {
  try {
    const bitmap = await createImageBitmap(await file.arrayBuffer().then(buf => new Blob([buf])));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality / 100)
    );

    if (!blob || blob.size === 0) throw new Error('WebP blob empty');

    // Build new filename with .webp extension
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const webpFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });

    return { file: webpFile, converted: true };
  } catch (err) {
    console.warn('[ImageOptimization] WebP conversion failed, using original:', err);
    return { file, converted: false };
  }
}

/**
 * Convert a base64 string to WebP base64.
 * @param base64 - Raw base64 (no data: prefix)
 * @param mimeType - Original mime type (e.g. 'image/png')
 * @param quality - WebP quality 0–100
 * @returns { base64, converted, originalSize, optimizedSize }
 */
export async function convertBase64ToWebP(
  base64: string,
  mimeType: string = 'image/png',
  quality: number = 85
): Promise<{
  base64: string;
  fileName: string;
  converted: boolean;
  originalSize: number;
  optimizedSize: number;
}> {
  const originalSize = Math.ceil((base64.length * 3) / 4);

  try {
    // Decode base64 → Blob → ImageBitmap → Canvas → WebP blob → base64
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const blob = new Blob([bytes], { type: mimeType });
    const bitmap = await createImageBitmap(blob);

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(bitmap, 0, 0);

    const webpBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality / 100)
    );

    if (!webpBlob || webpBlob.size === 0) throw new Error('WebP blob empty');

    // Convert blob back to base64
    const reader = new FileReader();
    const webpBase64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // strip data: prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(webpBlob);
    });

    return {
      base64: webpBase64,
      fileName: 'product-image.webp',
      converted: true,
      originalSize,
      optimizedSize: Math.ceil((webpBase64.length * 3) / 4),
    };
  } catch (err) {
    console.warn('[ImageOptimization] Base64 WebP conversion failed, using original:', err);
    return {
      base64,
      fileName: 'product-image.jpg',
      converted: false,
      originalSize,
      optimizedSize: originalSize,
    };
  }
}
