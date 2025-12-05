import { Coordinates } from '../types';
import exifr from 'exifr';

export const getGPSFromImage = async (file: File): Promise<Coordinates | null> => {
  try {
    // exifr handles both JPEG and HEIC/HEIF automatically
    const output = await exifr.parse(file, { gps: true });
    
    if (output && output.latitude && output.longitude) {
      return {
        lat: output.latitude,
        lng: output.longitude
      };
    }
    return null;
  } catch (err) {
    console.error("Error extracting EXIF:", err);
    return null;
  }
};