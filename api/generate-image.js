
import { GoogleGenAI } from "@google/genai";

const extractImage = (response) => {
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not set" });

  const ai = new GoogleGenAI({ apiKey });

  try {
    const { prompt, userImageBase64, aspectRatio, imageSize } = req.body;
    let finalImage = null;
    let attemptedModel = 'gemini-3-pro-image-preview';

    try {
      console.log("Backend: Attempting generation with Gemini 3 Pro Image Preview...");
      const response = await ai.models.generateContent({
        model: attemptedModel,
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: userImageBase64 } }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: imageSize
          }
        }
      });
      finalImage = extractImage(response);
      if (!finalImage) throw new Error("No image generated from Gemini 3 Pro");

    } catch (error) {
      console.warn("Backend: Gemini 3 Pro Generation Error:", error.message);
      if (error.status === 403 || error.code === 403 || error.message?.includes("PERMISSION_DENIED") ||
          error.status === 404 || error.code === 404 || error.message?.includes("not found")) {

          console.log("Backend: Falling back to Gemini 2.5 Flash Image...");
          attemptedModel = 'gemini-2.5-flash-image';
          const response = await ai.models.generateContent({
              model: attemptedModel,
              contents: {
                  parts: [
                      { text: prompt },
                      { inlineData: { mimeType: 'image/jpeg', data: userImageBase64 } }
                  ]
              },
              config: {
                  imageConfig: { aspectRatio: aspectRatio }
              }
          });
          finalImage = extractImage(response);
      } else {
        throw error;
      }
    }

    if (finalImage) {
      res.status(200).json({ imageUrl: finalImage, model: attemptedModel });
    } else {
      res.status(500).json({ error: "No image generated." });
    }

  } catch (error) {
    console.error("Backend Generate Image Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
}
