
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
    const { imageBase64, prompt, aspectRatio } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          { text: prompt }
        ]
      },
      config: {
          imageConfig: { aspectRatio: aspectRatio }
      }
    });

    const editedImage = extractImage(response);
    if (editedImage) {
      res.status(200).json({ imageUrl: editedImage });
    } else {
      res.status(500).json({ error: "No edited image generated." });
    }
  } catch (error) {
    console.error("Backend Edit Image Error:", error);
    res.status(500).json({ error: error.message || "Failed to edit image" });
  }
}
