
import { GoogleGenAI } from "@google/genai";

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
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
  }

  const ai = new GoogleGenAI({ apiKey });

  const SYSTEM_PROMPT = `
You are VibefIT Designer, an advanced AI that creates realistic outfit previews.
Your job is to:
1. Analyze the user’s body, pose, and style using their photo.
2. Analyze the clothing image.
3. Generate a visual description and image-generation instructions to create a realistic preview of the user wearing the clothing.
4. Never modify sensitive physical traits.
5. Produce:
   - High-quality instructions for generating the try-on preview
   - A styling explanation
   - A JSON block for developers
6. Be extremely detailed and clear.

Output Format:
Produce EXACTLY these 3 sections:
---
✅ A) TRY-ON PREVIEW IMAGE INSTRUCTIONS
A detailed paragraph telling Gemini how to generate an image of the user wearing the clothing.
---
✅ B) STYLING RECOMMENDATIONS
Give professional fashion stylist notes.
---
✅ C) JSON FOR DEVELOPERS
{
  "fit": "Describe the fit type (e.g., slim, regular, loose, oversized) and how it adheres to the body (e.g., 'cinched at waist', 'drapes loosely over shoulders', 'structured fit'). Be specific about fabric tension and drape.",
  "alignment": "",
  "lighting_fix": "",
  "cloth_behavior": "",
  "warnings": [],
  "ideal_output_description": ""
}
`;

  try {
    const { userImageBase64, clothImageBase64 } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: SYSTEM_PROMPT },
          { inlineData: { mimeType: 'image/jpeg', data: userImageBase64 } },
          { text: "This is the User Photo." },
          { inlineData: { mimeType: 'image/jpeg', data: clothImageBase64 } },
          { text: "This is the Clothing Photo. Perform the analysis." }
        ]
      }
    });
    res.status(200).json({ text: response.text });
  } catch (error) {
    console.error("Backend Analysis Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze try-on request" });
  }
}
