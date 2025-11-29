
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' }));
app.use(cors({ origin: 'http://localhost:3000' })); // Assuming your React app runs on port 3000

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in the .env file.");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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

const extractImage = (response) => {
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;
};

app.post('/api/analyze', async (req, res) => {
  const { userImageBase64, clothImageBase64 } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: userImageBase64
            }
          },
          { text: "This is the User Photo." },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: clothImageBase64
            }
          },
          { text: "This is the Clothing Photo. Perform the analysis." }
        ]
      }
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Backend Analysis Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze try-on request" });
  }
});

app.post('/api/generate-image', async (req, res) => {
  const { prompt, userImageBase64, aspectRatio, imageSize } = req.body;
  try {
    let finalImage = null;
    let attemptedModel = 'gemini-3-pro-image-preview';

    try {
      console.log("Backend: Attempting generation with Gemini 3 Pro Image Preview...");
      const response = await ai.models.generateContent({
        model: attemptedModel,
        contents: {
          parts: [
            { text: prompt },
            {
               inlineData: {
                 mimeType: 'image/jpeg',
                 data: userImageBase64
               }
            }
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
                      {
                          inlineData: {
                              mimeType: 'image/jpeg',
                              data: userImageBase64
                          }
                      }
                  ]
              },
              config: {
                  imageConfig: {
                      aspectRatio: aspectRatio
                  }
              }
          });
          finalImage = extractImage(response);
      } else {
        throw error;
      }
    }

    if (finalImage) {
      res.json({ imageUrl: finalImage, model: attemptedModel });
    } else {
      res.status(500).json({ error: "No image generated." });
    }

  } catch (error) {
    console.error("Backend Generate Image Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image" });
  }
});

app.post('/api/edit-image', async (req, res) => {
  const { imageBase64, prompt, aspectRatio } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
          imageConfig: {
              aspectRatio: aspectRatio
          }
      }
    });

    const editedImage = extractImage(response);
    if (editedImage) {
      res.json({ imageUrl: editedImage });
    } else {
      res.status(500).json({ error: "No edited image generated." });
    }
  } catch (error) {
    console.error("Backend Edit Image Error:", error);
    res.status(500).json({ error: error.message || "Failed to edit image" });
  }
});

app.post('/api/chat', async (req, res) => {
  const { history, message, useSearch, useThinking } = req.body;
  try {
    let model = 'gemini-3-pro-preview';
    const tools = [];
    if (useSearch) {
      tools.push({ googleSearch: {} });
    }
    const config = {
      tools: tools.length > 0 ? tools : undefined,
      ...(useThinking && { thinkingConfig: { thinkingBudget: 32768 } })
    };

    let responseText;
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: [
                ...history,
                { role: 'user', parts: [{ text: message }] }
            ],
            config: config
        });
        responseText = response.text;
    } catch (error) {
         if (error.status === 403 || error.code === 403 || error.message?.includes("PERMISSION_DENIED") ||
             error.status === 404 || error.code === 404 || error.message?.includes("not found")) {
            console.warn("Backend: Gemini 3 Pro Chat failed (403/404), falling back to Flash 2.5");
             const flashResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    ...history,
                    { role: 'user', parts: [{ text: message }] }
                ],
                config: {
                    tools: useSearch ? [{ googleSearch: {} }] : undefined,
                }
            });
            responseText = flashResponse.text;
         } else {
            throw error;
         }
    }
    res.json({ text: responseText });
  } catch (error) {
    console.error("Backend Chat Error:", error);
    res.status(500).json({ error: error.message || "Failed to chat with bot" });
  }
});

app.post('/api/transcribe', async (req, res) => {
  const { audioBase64, mimeType } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          { text: "Transcribe this audio exactly." }
        ]
      }
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Backend Transcription Error:", error);
    res.status(500).json({ error: error.message || "Failed to transcribe audio" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
    