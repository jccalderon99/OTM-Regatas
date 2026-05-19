const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export function isCloudinaryConfigured(): boolean {
  return CLOUD_NAME.length > 0 && UPLOAD_PRESET.length > 0;
}

/**
 * Compress an image file client-side before uploading.
 * Returns a new File with reduced quality/size.
 */
function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/webp',
        quality
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload a file to Cloudinary with client-side compression.
 * Returns the secure URL of the uploaded image.
 */
export async function uploadToCloudinary(
  file: File,
  folder = 'otm-regatas'
): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    // Fallback for demo mode: return a local object URL
    return { url: URL.createObjectURL(file), publicId: `local-${Date.now()}` };
  }

  // Compress if it's an image
  let uploadBlob: Blob = file;
  if (file.type.startsWith('image/')) {
    try {
      uploadBlob = await compressImage(file);
    } catch {
      uploadBlob = file; // fallback to original if compression fails
    }
  }

  const formData = new FormData();
  formData.append('file', uploadBlob, file.name);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }

  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}
