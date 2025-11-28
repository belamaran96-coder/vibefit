import { GoogleGenAI, Type } from "@google/genai";
import { ImageSize, AspectRatio } from "../types";

// Helper to get a fresh client instance with the latest API key
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// System prompt for the analysis phase
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

export const analyzeTryOnRequest = async (userImageBase64: string, clothImageBase64: string) => {
  try {
    const ai = getAi();
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
    return response.text;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

export const generateTryOnImage = async (
  prompt: string,
  userImageBase64: string,
  aspectRatio: AspectRatio,
  imageSize: ImageSize
) => {
  const ai = getAi();
  
  // Helper to extract image from response
  const extractImage = (response: any) => {
      for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
              return `data:image/png;base64,${part.inlineData.data}`;
          }
      }
      return null;
  };

  try {
    console.log("Attempting generation with Gemini 3 Pro Image Preview...");
    // We use the User Image as reference context + the detailed prompt from the analysis
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
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
    
    const image = extractImage(response);
    if (image) return image;
    throw new Error("No image generated from Gemini 3 Pro");

  } catch (error: any) {
    console.warn("Gemini 3 Pro Generation Error:", error);

    // Fallback logic for 403 (Permission Denied) or 404 (Model Not Found)
    if (error.status === 403 || error.code === 403 || error.message?.includes("PERMISSION_DENIED") || 
        error.status === 404 || error.code === 404 || error.message?.includes("not found")) {
        
        console.log("Falling back to Gemini 2.5 Flash Image...");
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
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
                        // imageSize is NOT supported in Flash Image
                    }
                }
            });

            const image = extractImage(response);
            if (image) return image;
        } catch (fallbackError) {
             console.error("Fallback Generation Error:", fallbackError);
             throw fallbackError;
        }
    }
    
    throw error;
  }
};

export const editImage = async (
  imageBase64: string, 
  prompt: string, 
  aspectRatio: AspectRatio = AspectRatio.SQUARE
) => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Nano Banana for fast edits
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
          // Note: responseMimeType is not supported for nano banana series
          imageConfig: {
              aspectRatio: aspectRatio
          }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image generated");
  } catch (error) {
    console.error("Edit Image Error:", error);
    throw error;
  }
};

export const chatWithBot = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  useSearch: boolean,
  useThinking: boolean
) => {
  try {
    const ai = getAi();
    
    let model = 'gemini-3-pro-preview';

    // Configure tools
    const tools = [];
    if (useSearch) {
      tools.push({ googleSearch: {} });
    }

    const config: any = {
      tools: tools.length > 0 ? tools : undefined,
    };

    if (useThinking) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: [
                ...history,
                { role: 'user', parts: [{ text: message }] }
            ],
            config: config
        });
        return response.text;
    } catch (error: any) {
         if (error.status === 403 || error.code === 403 || error.message?.includes("PERMISSION_DENIED")) {
            console.warn("Gemini 3 Pro Chat failed (403), falling back to Flash 2.5");
             const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    ...history,
                    { role: 'user', parts: [{ text: message }] }
                ],
                config: {
                    tools: useSearch ? [{ googleSearch: {} }] : undefined,
                    // No thinking config for Flash
                }
            });
            return response.text;
         }
         throw error;
    }
    
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string) => {
    try {
        const ai = getAi();
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
        return response.text;
    } catch (error) {
        console.error("Transcription Error", error);
        throw error;
    }
}