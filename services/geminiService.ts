import { GoogleGenAI } from "@google/genai";

// We initialize the SDK inside the function to prevent the app from crashing 
// on startup if the API_KEY is missing or invalid in the environment.

export const generateFoodDescription = async (
  base64Image: string, 
  userComment: string,
  restaurantName: string
): Promise<string> => {
  try {
    // Fix: Use process.env.API_KEY as per Google GenAI SDK guidelines.
    // Initialization is deferred until the function is called.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let cleanBase64 = base64Image;

    // Fix: Handle blob URLs (e.g. from URL.createObjectURL) by fetching and converting to base64
    if (base64Image.startsWith('blob:')) {
      const response = await fetch(base64Image);
      const blob = await response.blob();
      cleanBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Extract base64 part
          resolve(base64data.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Fix: Remove Data URL prefix if present to get raw base64
      cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|heic|webp);base64,/, '');
    }

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
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          { text: prompt }
        ]
      }
    });

    // Fix: Access .text property directly
    return response.text || "Delicious!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not generate description.";
  }
};