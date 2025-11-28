export interface ParsedAnalysis {
  instructions: string;
  styling: string;
  technicalJson: string | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT_3_4 = '3:4',
  PORTRAIT_9_16 = '9:16',
  LANDSCAPE_4_3 = '4:3',
  LANDSCAPE_16_9 = '16:9',
}

export enum ImageSize {
  K1 = '1K',
  K2 = '2K',
  K4 = '4K',
}

export enum GenerationModel {
  FLASH_IMAGE = 'gemini-2.5-flash-image', // Fast editing
  PRO_IMAGE = 'gemini-3-pro-image-preview', // High quality generation
}
