
import { ImageSize, AspectRatio } from "../types";

// Automatically detect environment
// If hostname is localhost, use port 3001 (your local node server)
// If hostname is anything else (like vercel.app), use relative path /api (Vercel serverless functions)
const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api' 
  : '/api';

export const analyzeTryOnRequest = async (userImageBase64: string, clothImageBase64: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userImageBase64, clothImageBase64 }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to analyze try-on request (${response.status})`);
    }

    const data = await response.json();
    return data.text;
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
  try {
    const response = await fetch(`${BACKEND_URL}/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, userImageBase64, aspectRatio, imageSize }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to generate image (${response.status})`);
    }

    const data = await response.json();
    return data.imageUrl;
  } catch (error: any) {
    console.error("Frontend Generate Image Error:", error);
    throw error;
  }
};

export const editImage = async (
  imageBase64: string, 
  prompt: string, 
  aspectRatio: AspectRatio = AspectRatio.SQUARE
) => {
  try {
    const response = await fetch(`${BACKEND_URL}/edit-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64, prompt, aspectRatio }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to edit image (${response.status})`);
    }

    const data = await response.json();
    return data.imageUrl;
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
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ history, message, useSearch, useThinking }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to chat with bot (${response.status})`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string) => {
    try {
        const response = await fetch(`${BACKEND_URL}/transcribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audioBase64, mimeType }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to transcribe audio (${response.status})`);
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error("Transcription Error", error);
        throw error;
    }
}
