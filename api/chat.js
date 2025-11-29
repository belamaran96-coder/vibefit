
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
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not set" });

  const ai = new GoogleGenAI({ apiKey });

  try {
    const { history, message, useSearch, useThinking } = req.body;
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
    res.status(200).json({ text: responseText });
  } catch (error) {
    console.error("Backend Chat Error:", error);
    res.status(500).json({ error: error.message || "Failed to chat with bot" });
  }
}
