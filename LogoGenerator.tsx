
import React, { useState, useEffect } from 'react';
import { Loader2, Download, Image as ImageIcon, Sparkles, Palette, Zap, History, LayoutGrid } from 'lucide-react';
import { aiService } from './services/aiService';

const STYLES = [
  { id: 'minimalist', name: 'Minimalist Vector', description: 'Clean lines, flat colors, modern simplicity.', prompt: 'Transform this image into a minimalist vector logo. Use clean lines, flat colors, and simple geometric shapes. Professional and modern.' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', description: 'Glowing edges, dark background, futuristic vibe.', prompt: 'Transform this image into a cyberpunk style logo. Use neon glowing edges, dark background, futuristic elements, and high contrast.' },
  { id: 'vintage', name: 'Vintage Badge', description: 'Retro colors, textured, classic emblem style.', prompt: 'Transform this image into a vintage badge logo. Use retro colors, textured paper effect, classic typography style, and an emblem border.' },
  { id: '3d', name: '3D Glossy', description: 'Depth, reflections, modern tech feel.', prompt: 'Transform this image into a 3D glossy logo. Add depth, realistic reflections, soft shadows, and a premium modern tech aesthetic.' },
  { id: 'sketch', name: 'Hand-drawn Sketch', description: 'Artistic, organic lines, pencil/ink style.', prompt: 'Transform this image into a hand-drawn sketch logo. Use organic lines, pencil or ink textures, and an artistic, hand-crafted feel.' }
];

const LogoGenerator: React.FC = () => {
  const [pictures, setPictures] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/pictures')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPictures(data);
          if (data.length > 0) setSelectedImage(data[0]);
        }
      })
      .catch(err => console.error("Failed to fetch pictures", err));
  }, []);

  const generateLogo = async () => {
    if (!selectedImage) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedLogo(null);

    try {
      // Fetch the image and convert to base64
      const imgRes = await fetch(`/picture/${selectedImage}`);
      const blob = await imgRes.blob();
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // 调用国产模型 (通过 aiService 封装的 OpenRouter 调用)
      const imageUrl = await aiService.generateLogo(base64Data, selectedStyle.prompt);
      setGeneratedLogo(imageUrl);
      
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "生成 Logo 失败，请检查您的 API 配置。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
          LogoStyle AI
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          Transform your uploaded images into professional logos with five distinct artistic styles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Image Selection */}
        <div className="lg:col-span-4 space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Select Source Image</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {pictures.map((pic) => (
                <button
                  key={pic}
                  onClick={() => {
                    setSelectedImage(pic);
                    setGeneratedLogo(null);
                  }}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedImage === pic ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <img 
                    src={`/picture/${pic}`} 
                    alt={pic} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {selectedImage === pic && (
                    <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                      <div className="bg-indigo-600 text-white p-1 rounded-full">
                        <Zap className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Choose Style</h2>
            </div>
            <div className="space-y-3">
              {STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                    selectedStyle.id === style.id 
                      ? 'border-indigo-600 bg-indigo-50/50' 
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900">{style.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{style.description}</div>
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={generateLogo}
            disabled={isGenerating || !selectedImage}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                Generate Logo
              </>
            )}
          </button>
        </div>

        {/* Right Column: Preview & Result */}
        <div className="lg:col-span-8">
          <div className="bg-slate-50 rounded-[2rem] p-8 min-h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 relative overflow-hidden">
            {!generatedLogo && !isGenerating && !error && (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto text-slate-300">
                  <LayoutGrid className="w-10 h-10" />
                </div>
                <p className="text-slate-400 font-medium">Select an image and style to begin</p>
              </div>
            )}

            {isGenerating && (
              <div className="text-center space-y-6 animate-pulse">
                <div className="w-64 h-64 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold text-slate-900">AI is crafting your logo...</p>
                  <p className="text-slate-500">Applying {selectedStyle.name} style</p>
                </div>
              </div>
            )}

            {error && (
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <Zap className="w-8 h-8" />
                </div>
                <p className="text-red-600 font-bold">{error}</p>
                <button 
                  onClick={generateLogo}
                  className="px-6 py-2 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-slate-800"
                >
                  Try Again
                </button>
              </div>
            )}

            {generatedLogo && (
              <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative bg-white p-4 rounded-[2.5rem] shadow-2xl">
                    <img 
                      src={generatedLogo} 
                      alt="Generated Logo" 
                      className="w-full h-auto rounded-[2rem]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900">{selectedStyle.name} Logo</h3>
                    <p className="text-xs text-slate-500">Generated from {selectedImage}</p>
                  </div>
                  <a 
                    href={generatedLogo} 
                    download={`logo-${selectedStyle.id}.png`}
                    className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-colors"
                  >
                    <Download className="w-6 h-6" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* History / Recent (Optional) */}
          <div className="mt-12 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Style Reference</span>
            </div>
            <div className="flex gap-2">
              {STYLES.map(s => (
                <div key={s.id} className="w-2 h-2 rounded-full bg-slate-200"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoGenerator;
