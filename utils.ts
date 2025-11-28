import { AspectRatio } from './types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const parseAnalysisResult = (text: string): { instructions: string; styling: string; technicalJson: string | null } => {
  const instructionsMatch = text.match(/✅ A\) TRY-ON PREVIEW IMAGE INSTRUCTIONS([\s\S]*?)---/);
  const stylingMatch = text.match(/✅ B\) STYLING RECOMMENDATIONS([\s\S]*?)---/);
  const jsonMatch = text.match(/✅ C\) JSON FOR DEVELOPERS([\s\S]*?)$/);

  return {
    instructions: instructionsMatch ? instructionsMatch[1].trim() : "Analysis failed to produce instructions.",
    styling: stylingMatch ? stylingMatch[1].trim() : "No styling advice available.",
    technicalJson: jsonMatch ? jsonMatch[1].trim() : null,
  };
};

export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src); // Clean up
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

export const getClosestAspectRatio = (width: number, height: number): AspectRatio => {
  const ratio = width / height;
  
  // Define supported target ratios
  const targets = [
    { id: AspectRatio.SQUARE, value: 1 },
    { id: AspectRatio.PORTRAIT_3_4, value: 3/4 }, // 0.75
    { id: AspectRatio.PORTRAIT_9_16, value: 9/16 }, // 0.5625
    { id: AspectRatio.LANDSCAPE_4_3, value: 4/3 }, // 1.333
    { id: AspectRatio.LANDSCAPE_16_9, value: 16/9 }, // 1.777
  ];

  // Find closest match
  const closest = targets.reduce((prev, curr) => {
    return (Math.abs(curr.value - ratio) < Math.abs(prev.value - ratio) ? curr : prev);
  });

  return closest.id;
};