
import { GoogleGenAI } from "@google/genai";

const MAX_IMAGE_DIMENSION = 800; // Resize to max 800px to ensure fast upload
const JPEG_QUALITY = 0.6; // Compress to 60% quality

// Helper to resize image and convert to clean base64
const processImageForGemini = async (imageSrc: string): Promise<{ data: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Allow loading from blob: or data: URLs
    img.crossOrigin = "Anonymous"; 
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > MAX_IMAGE_DIMENSION) {
          height *= MAX_IMAGE_DIMENSION / width;
          width = MAX_IMAGE_DIMENSION;
        }
      } else {
        if (height > MAX_IMAGE_DIMENSION) {
          width *= MAX_IMAGE_DIMENSION / height;
          height = MAX_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      // Draw and resize
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 jpeg
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      
      // Data URL format is "data:image/jpeg;base64,......"
      // We need just the base64 part
      const base64Data = dataUrl.split(',')[1];
      
      resolve({
        data: base64Data,
        mimeType: 'image/jpeg'
      });
    };

    img.onerror = (e) => {
      console.error("Image load error for Gemini:", e);
      reject(new Error("Failed to load image for processing"));
    };

    img.src = imageSrc;
  });
};

export const generateFoodDescription = async (
  imageSrc: string, // Can be Blob URL or Base64 Data URL
  userComment: string,
  restaurantName: string
): Promise<string | null> => {
  try {
    // Hardcoded API Key as requested
    const apiKey = "AIzaSyCEkyuS7zuWqXm543Pcus6gEhrIpLwbCwU";

    if (!apiKey) {
      console.error("API Key is missing");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });

    // 1. Resize and optimize the image before sending
    // This solves payload size limits and timeout issues
    const { data, mimeType } = await processImageForGemini(imageSrc);

    const prompt = `I am at a restaurant called "${restaurantName}".
    Here is a photo of what I'm eating.
    My initial thought is: "${userComment}".
    
    Please write a short, fun, 1-sentence social media style caption for this food. 
    Mention the visual appeal if possible.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: data
            }
          },
          { text: prompt }
        ]
      }
    });

    return response.text || null;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    // Return null so the UI can handle the error state instead of saving the error message
    return null;
  }
};
