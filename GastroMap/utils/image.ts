
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
          reject(new Error('Could not get canvas context'));
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
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      reject(new Error('Failed to read file'));
    };
  });
};
