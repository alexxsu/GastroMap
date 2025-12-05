// Image validation constants
export const IMAGE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MIN_FILE_SIZE: 100, // 100 bytes - anything smaller is likely corrupt
  VALIDATION_TIMEOUT: 10000, // 10 seconds
  PROCESSING_TIMEOUT: 30000, // 30 seconds for HEIC conversion
};

export interface ImageValidationResult {
  valid: boolean;
  width: number;
  height: number;
  error?: string;
}

/**
 * Validates that an image file can be decoded and is not corrupt.
 * Checks file size, attempts to load image, and verifies dimensions.
 */
export const validateImage = (file: File | Blob): Promise<ImageValidationResult> => {
  return new Promise((resolve) => {
    // Check file size limits
    if (file.size > IMAGE_LIMITS.MAX_FILE_SIZE) {
      resolve({ valid: false, width: 0, height: 0, error: 'File too large (max 50MB)' });
      return;
    }

    if (file.size < IMAGE_LIMITS.MIN_FILE_SIZE) {
      resolve({ valid: false, width: 0, height: 0, error: 'File is empty or too small' });
      return;
    }

    const reader = new FileReader();
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      resolve({ valid: false, width: 0, height: 0, error: 'File read timeout - possibly corrupt' });
    }, IMAGE_LIMITS.VALIDATION_TIMEOUT);

    reader.onload = (event) => {
      const img = new Image();

      const imageTimeoutId = setTimeout(() => {
        cleanup();
        resolve({ valid: false, width: 0, height: 0, error: 'Image decode timeout - possibly corrupt' });
      }, IMAGE_LIMITS.VALIDATION_TIMEOUT);

      img.onload = () => {
        cleanup();
        clearTimeout(imageTimeoutId);

        if (img.width === 0 || img.height === 0) {
          resolve({ valid: false, width: 0, height: 0, error: 'Invalid image dimensions (0x0)' });
        } else {
          resolve({ valid: true, width: img.width, height: img.height });
        }
      };

      img.onerror = () => {
        cleanup();
        clearTimeout(imageTimeoutId);
        resolve({ valid: false, width: 0, height: 0, error: 'Failed to decode image - file is corrupt or unsupported format' });
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      cleanup();
      resolve({ valid: false, width: 0, height: 0, error: 'Failed to read file from disk' });
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Wraps a promise with a timeout
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
};

/**
 * Resizes and compresses an image file with proper EXIF orientation handling.
 * Target: JPEG, Max 1920px dimension, 0.9 Quality for clearer images.
 * Fixes: Android/iOS black screen issues by respecting image orientation.
 */
export const compressImage = (file: File | Blob, maxWidth = 1920, quality = 0.9): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async (event) => {
      const img = new Image();
      const dataUrl = event.target?.result as string;
      img.crossOrigin = 'anonymous';

      // Get EXIF orientation if available
      let orientation = 1; // Default: no rotation needed
      try {
        // Try to extract orientation from EXIF data
        const exifr = await import('exifr');
        const exifData = await exifr.parse(file instanceof File ? file : new Blob([file]));
        if (exifData && exifData.Orientation) {
          orientation = exifData.Orientation;
        }
      } catch (err) {
        console.warn('Could not read EXIF orientation, using default:', err);
      }

      img.src = dataUrl;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Swap dimensions if orientation requires it (5,6,7,8)
        const shouldSwapDimensions = orientation >= 5 && orientation <= 8;
        if (shouldSwapDimensions) {
          [width, height] = [height, width];
        }

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round(width * (maxWidth / height));
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          // Fall back to original file instead of failing the whole upload
          resolve(file instanceof Blob ? file : new Blob([file]));
          return;
        }

        // Fill with white background to prevent transparency issues
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Apply orientation transformations
        switch (orientation) {
          case 2:
            // Horizontal flip
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            break;
          case 3:
            // 180° rotation
            ctx.translate(width, height);
            ctx.rotate(Math.PI);
            break;
          case 4:
            // Vertical flip
            ctx.translate(0, height);
            ctx.scale(1, -1);
            break;
          case 5:
            // Vertical flip + 90° rotation
            ctx.rotate(0.5 * Math.PI);
            ctx.scale(1, -1);
            break;
          case 6:
            // 90° rotation
            ctx.rotate(0.5 * Math.PI);
            ctx.translate(0, -height);
            break;
          case 7:
            // Horizontal flip + 90° rotation
            ctx.rotate(0.5 * Math.PI);
            ctx.translate(width, -height);
            ctx.scale(-1, 1);
            break;
          case 8:
            // 270° rotation
            ctx.rotate(-0.5 * Math.PI);
            ctx.translate(-width, 0);
            break;
          default:
            // Orientation 1 or undefined - no transformation needed
            break;
        }

        // Draw the image with proper orientation
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = (err) => {
        console.error('Image load error:', err);
        // Fall back to original file so uploads still succeed
        resolve(file instanceof Blob ? file : new Blob([file]));
      };
    };

    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      // Fall back to original file so uploads still succeed
      resolve(file instanceof Blob ? file : new Blob([file]));
    };
  });
};
