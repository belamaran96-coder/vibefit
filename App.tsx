import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ChatWidget from './components/ChatWidget';
import { analyzeTryOnRequest, generateTryOnImage, editImage } from './services/geminiService';
import { fileToBase64, parseAnalysisResult, getImageDimensions, getClosestAspectRatio } from './utils';
import { ParsedAnalysis, AspectRatio, ImageSize } from './types';

const App: React.FC = () => {
  // --- State ---
  const [step, setStep] = useState<number>(1); // 1: User, 2: Cloth, 3: Config, 4: Result
  
  const [userFile, setUserFile] = useState<File | null>(null);
  const [clothFile, setClothFile] = useState<File | null>(null);
  const [userPreview, setUserPreview] = useState<string | null>(null);
  const [clothPreview, setClothPreview] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [analysisResult, setAnalysisResult] = useState<ParsedAnalysis | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [selectedSize, setSelectedSize] = useState<ImageSize>(ImageSize.K1);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // --- Handlers ---
  const handleUserFile = async (file: File) => {
    setUserFile(file);
    setUserPreview(URL.createObjectURL(file));

    // Auto-detect aspect ratio
    try {
      const { width, height } = await getImageDimensions(file);
      const recommendedRatio = getClosestAspectRatio(width, height);
      setSelectedAspectRatio(recommendedRatio);
    } catch (e) {
      console.error("Failed to detect aspect ratio", e);
    }
  };

  const handleClothFile = async (file: File) => {
    setClothFile(file);
    setClothPreview(URL.createObjectURL(file));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleStartOver = () => {
    setStep(1);
    setUserFile(null);
    setClothFile(null);
    setUserPreview(null);
    setClothPreview(null);
    setAnalysisResult(null);
    setGeneratedImage(null);
    setIsAnalyzing(false);
    setIsGenerating(false);
  };

  const handleGenerateProcess = async () => {
    if (!userFile || !clothFile) return;
    
    // Move to step 4 (Result/Loading View)
    setStep(4);
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setGeneratedImage(null);

    try {
      // 1. Prepare Inputs
      const userBase64 = await fileToBase64(userFile);
      const clothBase64 = await fileToBase64(clothFile);

      // 2. Analyze (Gemini 2.5 Flash)
      const rawAnalysis = await analyzeTryOnRequest(userBase64, clothBase64);
      const parsed = parseAnalysisResult(rawAnalysis);
      setAnalysisResult(parsed);
      setIsAnalyzing(false);

      // 3. Generate Image (Gemini 3 Pro Image Preview)
      setIsGenerating(true);
      const imageResult = await generateTryOnImage(
        parsed.instructions, 
        userBase64, 
        selectedAspectRatio,
        selectedSize
      );
      setGeneratedImage(imageResult);
    } catch (error: any) {
      console.error("Full Error Object:", error);
      
      const errorMsg = error?.message || error?.toString() || "";
      alert(`Something went wrong during the AI process: ${errorMsg}`);
      setStep(3);
    } finally {
      setIsAnalyzing(false);
      setIsGenerating(false);
    }
  };

  const handleQuickEdit = async () => {
      if (!generatedImage || !editPrompt) return;
      setIsEditing(true);
      try {
          const base64 = generatedImage.split(',')[1];
          const result = await editImage(base64, editPrompt, selectedAspectRatio);
          setGeneratedImage(result);
          setEditPrompt("");
      } catch (e) {
          console.error(e);
          alert("Edit failed");
      } finally {
          setIsEditing(false);
      }
  }

  // --- Components for Steps ---

  const ProgressBar = () => (
    <div className="w-full max-w-2xl mx-auto mb-8 px-4">
      <div className="flex justify-between items-center relative">
        {/* Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-800 -z-10 rounded"></div>
        <div 
          className="absolute top-1/2 left-0 h-1 bg-indigo-600 transition-all duration-500 -z-10 rounded" 
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        ></div>

        {[1, 2, 3, 4].map((s) => (
           <div 
             key={s} 
             className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300
               ${step >= s ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-500'}
             `}
           >
             {s === 4 ? '✨' : s}
           </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
        <span>You</span>
        <span>Clothing</span>
        <span>Style</span>
        <span>Reveal</span>
      </div>
    </div>
  );

  // --- Main App ---
  return (
    <div className="h-screen w-full bg-gray-950 text-gray-100 font-sans flex flex-col overflow-hidden">
      
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-gray-900 bg-gray-950/50 backdrop-blur z-10">
        <div className="flex items-center gap-4">
            <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                VibefIT
            </h1>
            <p className="text-gray-500 text-xs tracking-wider uppercase">Professional AI Stylist</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            {step > 1 && step < 4 && (
                <button onClick={handleStartOver} className="text-xs text-gray-500 hover:text-white transition-colors border border-gray-800 px-3 py-1 rounded-full">
                    Start Over
                </button>
            )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start pt-10 pb-6 px-6 overflow-y-auto">
        
        {step < 4 && <ProgressBar />}

        <div className="w-full max-w-4xl flex-1 flex flex-col">
            
            {/* STEP 1: USER PHOTO */}
            {step === 1 && (
                <div className="flex flex-col items-center justify-center flex-1 animate-fadeIn">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">Let's start with you</h2>
                        <p className="text-gray-400">Upload a clear photo of yourself where you want to try the outfit.</p>
                    </div>
                    <div className="w-full max-w-md h-96">
                        <FileUpload 
                            label="User Photo" 
                            imageSrc={userPreview} 
                            onFileSelect={(f) => { handleUserFile(f); }} 
                        />
                    </div>
                    <div className="mt-8">
                        <button 
                            onClick={nextStep}
                            disabled={!userFile}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-12 py-3 rounded-full font-bold text-lg shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105"
                        >
                            Next Step &rarr;
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: CLOTHING PHOTO */}
            {step === 2 && (
                <div className="flex flex-col items-center justify-center flex-1 animate-fadeIn">
                     <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">Choose the look</h2>
                        <p className="text-gray-400">Upload the clothing item (flat lay or model photo) you want to wear.</p>
                    </div>
                    <div className="w-full max-w-md h-96">
                        <FileUpload 
                            label="Clothing Item" 
                            imageSrc={clothPreview} 
                            onFileSelect={(f) => { handleClothFile(f); }} 
                        />
                    </div>
                    <div className="mt-8 flex gap-4">
                        <button 
                            onClick={prevStep}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-full font-medium transition-colors"
                        >
                            &larr; Back
                        </button>
                        <button 
                            onClick={nextStep}
                            disabled={!clothFile}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-12 py-3 rounded-full font-bold text-lg shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105"
                        >
                            Next Step &rarr;
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: CONFIGURE & REVIEW */}
            {step === 3 && (
                <div className="flex flex-col items-center flex-1 animate-fadeIn">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-white mb-2">Fine-tune the Magic</h2>
                        <p className="text-gray-400">Review your selection and choose your generation settings.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-8">
                        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 relative group">
                             <img src={userPreview!} className="w-full h-48 object-cover rounded-lg" alt="User" />
                             <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                 <button onClick={() => setStep(1)} className="text-xs bg-white text-black px-3 py-1 rounded-full font-bold">Change</button>
                             </div>
                             <p className="text-center text-xs text-gray-500 mt-2 font-semibold">USER</p>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 relative group">
                             <img src={clothPreview!} className="w-full h-48 object-cover rounded-lg" alt="Cloth" />
                             <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                 <button onClick={() => setStep(2)} className="text-xs bg-white text-black px-3 py-1 rounded-full font-bold">Change</button>
                             </div>
                             <p className="text-center text-xs text-gray-500 mt-2 font-semibold">CLOTHING</p>
                        </div>
                    </div>

                    <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 w-full max-w-lg space-y-6">
                        <div>
                             <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-semibold text-gray-300">Aspect Ratio</label>
                                <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                                    {selectedAspectRatio === AspectRatio.SQUARE ? 'Square' : 'Rectangular'}
                                </span>
                             </div>
                             <div className="grid grid-cols-5 gap-2">
                                {Object.values(AspectRatio).map((ratio) => (
                                    <button
                                        key={ratio}
                                        onClick={() => setSelectedAspectRatio(ratio)}
                                        className={`text-xs py-2 rounded-lg border transition-all ${selectedAspectRatio === ratio ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                             </div>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-300 block mb-3">Resolution Quality</label>
                            <div className="flex gap-2">
                                {Object.values(ImageSize).map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`flex-1 text-sm py-2 rounded-lg border transition-all ${selectedSize === size ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-4">
                        <button 
                            onClick={prevStep}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-full font-medium transition-colors"
                        >
                            &larr; Back
                        </button>
                        <button 
                            onClick={handleGenerateProcess}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-16 py-3 rounded-full font-bold text-lg shadow-xl shadow-indigo-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
                        >
                            <span>✨</span> Generate Try-On
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: RESULTS */}
            {step === 4 && (
                <div className="flex flex-col items-center w-full h-full animate-fadeIn">
                    
                    {/* LOADING STATE */}
                    {(isAnalyzing || isGenerating) && (
                        <div className="flex-1 flex flex-col items-center justify-center">
                             <div className="relative w-32 h-32 mb-8">
                                <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full animate-ping"></div>
                                <div className="absolute inset-2 border-4 border-purple-500/30 rounded-full animate-ping animation-delay-500"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center border border-gray-700 shadow-xl">
                                        <span className="text-4xl animate-pulse">✨</span>
                                    </div>
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {isAnalyzing ? "Analyzing Fabric & Fit..." : "Creating Your Look..."}
                            </h2>
                            <p className="text-gray-400 max-w-sm text-center">
                                {isAnalyzing 
                                    ? "Gemini is examining the clothing texture and your pose." 
                                    : `Synthesizing a ${selectedSize} photorealistic preview with ${selectedAspectRatio} ratio.`}
                            </p>
                        </div>
                    )}

                    {/* RESULT STATE */}
                    {!isAnalyzing && !isGenerating && analysisResult && (
                        <div className="w-full h-full flex flex-col items-center">
                            
                            <div className="w-full flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Your Result</h2>
                                <button 
                                    onClick={handleStartOver}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition-colors"
                                >
                                    Start New Try-On
                                </button>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-8 w-full h-full pb-8">
                                
                                {/* Left: Image & Edit */}
                                <div className="flex-1 flex flex-col gap-4">
                                    <div className="relative group bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl flex-1 min-h-[400px] flex items-center justify-center">
                                         {generatedImage ? (
                                            <img src={generatedImage} alt="Generated" className="max-w-full max-h-[60vh] object-contain" />
                                         ) : (
                                             <span className="text-red-500">Generation failed. Try again.</span>
                                         )}
                                          {/* Download Button */}
                                          {generatedImage && (
                                            <a 
                                              href={generatedImage} 
                                              download="vibefit-tryon.png"
                                              className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-md transition-all shadow-lg"
                                              title="Download Image"
                                            >
                                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                              </svg>
                                            </a>
                                          )}
                                    </div>

                                    {/* Edit Bar */}
                                    <div className="bg-gray-900 border border-gray-800 p-2 rounded-xl flex gap-2 shadow-lg">
                                        <input 
                                            type="text" 
                                            placeholder="Magic Edit: 'Add a belt', 'Make it brighter'..." 
                                            className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none text-white placeholder-gray-500"
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleQuickEdit()}
                                        />
                                        <button 
                                            onClick={handleQuickEdit}
                                            disabled={isEditing || !editPrompt}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                        >
                                            {isEditing ? '...' : 'Edit'}
                                        </button>
                                    </div>
                                </div>

                                {/* Right: Analysis Details */}
                                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                                    
                                    {/* Styling Card */}
                                    <div className="bg-gray-900/80 rounded-2xl p-6 border border-gray-800 shadow-xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="font-bold text-white">Stylist Notes</h3>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                            {analysisResult.styling}
                                        </p>
                                    </div>

                                    {/* Tech Card */}
                                    <div className="bg-gray-900/80 rounded-2xl p-6 border border-gray-800 shadow-xl flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                </svg>
                                            </div>
                                            <h3 className="font-bold text-white">Gemini Analysis</h3>
                                        </div>
                                        <div className="bg-black/50 rounded-lg p-3 overflow-x-auto border border-gray-800 max-h-64 overflow-y-auto custom-scrollbar">
                                            <pre className="text-xs text-emerald-500 font-mono">
                                                {analysisResult.technicalJson || "Parsing JSON..."}
                                            </pre>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
      </main>

      <ChatWidget />
    </div>
  );
};

export default App;