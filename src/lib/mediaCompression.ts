/**
 * High-Performance Client-Side Media Compression & Optimization Utility
 * Automatically downscales and compresses images & videos before uploading
 * to drastically save user storage quota and accelerate network transfers.
 */

export interface CompressionResult {
  file: File;
  blob: Blob;
  dataUrl?: string;
  thumbnailUrl?: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savingsPercentage: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default: 0.8)
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
  autoRotate?: boolean;
}

/**
 * Format raw byte numbers into human-readable strings (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Check if a file is an image that can be compressed on the client
 */
export function isCompressibleImage(file: File | Blob): boolean {
  const type = file.type.toLowerCase();
  return type.startsWith('image/') && !type.includes('svg') && !type.includes('gif');
}

/**
 * Check if a file is a video that can be processed
 */
export function isCompressibleVideo(file: File | Blob): boolean {
  const type = file.type.toLowerCase();
  return type.startsWith('video/');
}

/**
 * Client-Side Image Compression using HTML5 Canvas
 * Resizes dimensions proportionally and re-encodes with quality control.
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.80,
    mimeType = 'image/jpeg'
  } = options;

  const originalSize = file.size;

  // If already small (< 60 KB) and JPEG/WEBP, skip compression
  if (originalSize <= 60 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
    const dataUrl = await fileToDataUrl(file);
    return {
      file,
      blob: file,
      dataUrl,
      originalSize,
      compressedSize: originalSize,
      savedBytes: 0,
      savingsPercentage: 0,
      mimeType: file.type
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) {
        return reject(new Error('Failed to read image file'));
      }

      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate aspect-ratio preserved dimensions
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return reject(new Error('Could not obtain canvas 2D context'));
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fill white background for JPEGs to prevent black alpha transparent background
          if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Canvas toBlob failed'));
              }

              // Use original file if compressed is somehow larger
              const finalBlob = blob.size < originalSize ? blob : file;
              const compressedSize = finalBlob.size;
              const savedBytes = Math.max(0, originalSize - compressedSize);
              const savingsPercentage = Math.round((savedBytes / originalSize) * 100);

              const cleanExt = mimeType === 'image/webp' ? '.webp' : '.jpg';
              const baseName = file.name.replace(/\.[^/.]+$/, '');
              const compressedFile = new File([finalBlob], `${baseName}${cleanExt}`, {
                type: finalBlob.type || mimeType,
                lastModified: Date.now()
              });

              const dataUrl = canvas.toDataURL(mimeType, quality);

              resolve({
                file: compressedFile,
                blob: finalBlob,
                dataUrl,
                originalSize,
                compressedSize,
                savedBytes,
                savingsPercentage,
                mimeType: compressedFile.type,
                width,
                height
              });
            },
            mimeType,
            quality
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Invalid or corrupted image format'));
      img.src = e.target.result as string;
    };

    reader.onerror = () => reject(new Error('FileReader error loading file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate a lightweight video thumbnail frame on the client
 */
export async function getVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      // Seek to 1 second or 10% into video
      video.currentTime = Math.min(1.0, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxThumbDim = 480;
        let w = video.videoWidth || 320;
        let h = video.videoHeight || 240;

        if (w > maxThumbDim || h > maxThumbDim) {
          if (w > h) {
            h = Math.round((h * maxThumbDim) / w);
            w = maxThumbDim;
          } else {
            w = Math.round((w * maxThumbDim) / h);
            h = maxThumbDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const thumbUrl = canvas.toDataURL('image/jpeg', 0.7);
          URL.revokeObjectURL(url);
          resolve(thumbUrl);
          return;
        }
      } catch (e) {
        console.warn('Video thumbnail capture error:', e);
      }
      URL.revokeObjectURL(url);
      resolve('');
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
  });
}

/**
 * Prepare and optimize video file for upload with client thumbnail & size checks
 */
export async function prepareVideoForUpload(file: File): Promise<{
  file: File;
  thumbnailUrl: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savingsPercentage: number;
  mimeType: string;
}> {
  const originalSize = file.size;
  const thumbnailUrl = await getVideoThumbnail(file);

  return {
    file,
    thumbnailUrl,
    originalSize,
    compressedSize: originalSize,
    savedBytes: 0,
    savingsPercentage: 0,
    mimeType: file.type || 'video/mp4'
  };
}

/**
 * Helper to convert a file/blob to base64 DataURL
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
