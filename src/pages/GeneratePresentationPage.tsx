import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { motion, AnimatePresence } from 'framer-motion';
import pptxgen from 'pptxgenjs';
import { AlertTriangle, ChevronLeft, Presentation, Check, FileCheck } from 'lucide-react';
import { Showcase } from '../utils/types';
import Logger from '../utils/log';
import { ErrorToast, SuccessToast } from './ToastTestPage';

const GeneratePresentationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const showcaseId = searchParams.get('id');
  const navigate = useNavigate();

  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  //@ts-ignore
  const [pptxPath, setPptxPath] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  useEffect(() => {
    if (!showcaseId) {
      setError('No showcase ID provided');
      setIsLoading(false);
      return;
    }

    const loadShowcase = async () => {
      try {
        setIsLoading(true);
        const showcaseData = await invoke<Showcase>('get_showcase', { id: showcaseId });
        setShowcase(showcaseData);

        if (!showcaseData.images || showcaseData.images.length === 0) {
          setError('No images available for this showcase');
          setIsLoading(false);
          return;
        }

        generatePPTX(showcaseData);
      } catch (error) {
        Logger.error('Error loading showcase:', error);
        setError(`Failed to load showcase: ${error instanceof Error ? error.message : String(error)}`);
        setIsLoading(false);
      }
    };

    loadShowcase();
  }, [showcaseId]);

  useEffect(() => {
    if (previewImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentPreviewIndex(prev => (prev + 1) % previewImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [previewImages]);

  const generatePPTX = async (showcaseData: Showcase) => {
    if (!showcaseData.images || showcaseData.images.length === 0) return;

    setIsGenerating(true);
    try {
      const pres = new pptxgen();
      pres.layout = 'LAYOUT_16x9';

      pres.title = showcaseData.title;
      pres.subject = "Showcase Presentation";
      pres.company = "Showcase Studio";

      pres.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { color: '000000' },
      });

      const imagePromises = showcaseData.images.map(async (image) => {
        const imagePath = `${showcaseId}/${showcaseId}_${image.message_id}.png`;
        try {
          const dataUrl = await invoke<string>('get_cached_image_data', {
            relativePath: imagePath
          });
          return { image, dataUrl };
        } catch (error) {
          Logger.error(`Failed to load image ${image.message_id}:`, error);
          return { image, dataUrl: null };
        }
      });

      const imageResults = await Promise.all(imagePromises);

      const validDataUrls = imageResults
        .filter(result => result.dataUrl !== null)
        .map(result => result.dataUrl as string);
      setPreviewImages(validDataUrls);

      //@ts-ignore
      for (const { image, dataUrl } of imageResults) {
        if (!dataUrl) continue;

        const slide = pres.addSlide();
        slide.background = { data: dataUrl };
      }

      const pptxData = await pres.write({ outputType: "base64" });

      const savePath = await invoke<string>('save_showcase_pptx', {
        id: showcaseId,
        title: showcaseData.title,
        pptxBase64: pptxData
      });

      setPptxPath(savePath);
      SuccessToast('Presentation generated successfully!');
    } catch (error) {
      Logger.error('Error generating presentation:', error);
      setError(`Failed to generate presentation: ${error instanceof Error ? error.message : String(error)}`);
      ErrorToast('Failed to generate presentation');
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!showcaseId) return;

    try {
      const path = await invoke<string>('open_showcase_pptx', { id: showcaseId });
      await revealItemInDir(path);
      SuccessToast('Opening presentation file...');
    } catch (error) {
      Logger.error('Error opening presentation:', error);
      setError(`Failed to open presentation: ${error instanceof Error ? error.message : String(error)}`);
      ErrorToast('Failed to open presentation file');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (isLoading || isGenerating) {
    return (
      <div className="flex justify-center items-center h-screen bg-black text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-900/70 backdrop-blur-md p-8 rounded-2xl border border-gray-800/70 shadow-2xl flex flex-col items-center max-w-md w-full"
        >
          <div className="w-full aspect-video mb-8 relative">
            <div className="w-full h-full perspective-[1200px] flex items-center justify-center">
              <motion.div
                className="relative w-full h-[85%] bg-black/50 rounded-lg overflow-hidden border border-gray-700/30"
                animate={{
                  rotateX: [2, 2, 2],
                  rotateY: [-2, 2, -2],
                  translateY: [0, -5, 0]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 flex items-center justify-center">
                  <Presentation className="text-indigo-500/50 w-16 h-16" />

                  <motion.div
                    className="absolute inset-0 border-t-2 border-blue-500/30 backdrop-blur-[1px] pointer-events-none"
                    animate={{ top: ["-100%", "100%"] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                </div>
              </motion.div>

              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[80%] h-[2%] bg-blue-900/10 rounded-full blur-md" />
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-3 text-gray-100">
            {isGenerating ? 'Generating Presentation...' : 'Loading Showcase...'}
          </h2>

          <div className="w-full bg-gray-800/50 rounded-full h-1.5 mb-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
              animate={{ width: ["0%", "100%"] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          <p className="text-gray-400 text-sm text-center">
            {isGenerating
              ? 'Creating slides and optimizing images for your presentation.'
              : 'Preparing showcase data for presentation generation.'}
          </p>

          {isGenerating && (
            <div className="flex mt-5 gap-1 items-center">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-black text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full bg-gray-900/60 backdrop-blur-md p-8 rounded-2xl border border-red-800/30 shadow-2xl flex flex-col items-center"
        >
          <div className="w-20 h-20 mb-6 flex items-center justify-center bg-red-900/20 rounded-full border border-red-700/30">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-100">Error</h2>
          <p className="mb-5 text-center text-gray-300">{error}</p>
          <button
            onClick={handleGoHome}
            className="mt-2 px-5 py-3 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 rounded-lg text-white font-medium flex items-center transition-all duration-200 shadow-lg hover:shadow-xl border border-gray-700/50"
          >
            <ChevronLeft className="w-5 h-5 mr-2" /> Return to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-800/50 py-4 px-6 bg-black">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoHome}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
              aria-label="Go back to home"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-medium text-white">Presentation Generated</h1>
              {showcase && (
                <p className="text-sm text-gray-400">{showcase.title}</p>
              )}
            </div>
          </div>

          <div className="py-1 px-3 text-xs text-gray-400 bg-gray-800/30 rounded-full border border-gray-700/30 flex items-center gap-2">
            <Presentation className="w-3.5 h-3.5" />
            <span>{showcase?.images?.length || 0} slides</span>
          </div>
        </div>
      </header>

      {/* Main content - Success state */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 p-6 max-w-screen-2xl mx-auto">
        {/* Download panel - Left side */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="md:col-span-4 lg:col-span-3 bg-gray-900/40 p-6 lg:p-8 rounded-2xl border border-gray-800/70 shadow-2xl flex flex-col items-center h-fit"
        >
          <div className="w-20 h-20 flex items-center justify-center bg-green-900/20 rounded-full border border-green-700/30 mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white text-center">Ready to Download!</h2>
          <p className="text-gray-300 text-center mb-6">
            Your presentation has been successfully created and is ready to download.
          </p>
          <button
            onClick={handleDownload}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <FileCheck className="w-5 h-5" />
            <span>Download Presentation</span>
          </button>
          <button
            onClick={handleGoHome}
            className="mt-4 w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
          >
            Return to Home
          </button>

          {/* Additional visual elements */}
          <div className="mt-8 w-full pt-6 border-t border-gray-800/50">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-gray-400">Creation Complete</span>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between text-xs text-gray-400">
              <span>File Format:</span>
              <span className="font-mono">PowerPoint (.pptx)</span>
            </div>
            <div className="mt-3 bg-gray-800/50 rounded-lg p-4 flex items-center justify-between text-xs text-gray-400">
              <span>Slides:</span>
              <span className="font-mono">{showcase?.images?.length || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* Presentation preview - Right side*/}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="md:col-span-8 lg:col-span-9 flex flex-col"
        >
          <div className="relative bg-gradient-to-b from-gray-900/60 to-gray-800/60 rounded-2xl border border-gray-800/60 shadow-2xl overflow-hidden flex-1 flex flex-col">
            <div className="bg-gradient-to-r from-indigo-900/40 to-blue-900/40 p-3 border-b border-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Presentation className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-gray-300">{showcase?.title || "Showcase Presentation"}</span>
              </div>
              <div className="text-xs text-gray-500">{new Date().toLocaleDateString()}</div>
            </div>

            <div className="flex-grow flex items-center justify-center p-6 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.08),_transparent_70%)]"></div>

              <div className="w-full h-full relative">
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[90%] h-[2%] bg-black rounded-full blur-md"></div>

                <div className="w-full h-full relative perspective-[1200px] flex items-center justify-center">
                  <div className="relative w-[96%] h-[90%] transform-gpu rotate-x-2 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.2),0_10px_10px_-5px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden">
                    <AnimatePresence mode="wait">
                      {previewImages.length > 0 ? (
                        <motion.div
                          key={currentPreviewIndex}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 bg-black"
                        >
                          <img
                            src={previewImages[currentPreviewIndex]}
                            alt={`Slide ${currentPreviewIndex + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </motion.div>
                      ) : (
                        <div className="absolute inset-0 bg-black/80 text-gray-500 flex flex-col items-center justify-center">
                          <Presentation className="w-12 h-12 mb-3" />
                          <p>No preview available</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Slide indicator dots */}
              {previewImages.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
                  {previewImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPreviewIndex(index)}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentPreviewIndex
                        ? 'bg-blue-500 scale-125'
                        : 'bg-gray-600 hover:bg-gray-500'
                        }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Slide counter */}
            <div className="bg-gray-900/80 py-2 px-4 border-t border-gray-800/50 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                Slide {currentPreviewIndex + 1} of {previewImages.length}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPreviewIndex(prev => prev === 0 ? previewImages.length - 1 : prev - 1)}
                  disabled={previewImages.length <= 1}
                  className="w-6 h-6 rounded flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-50"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentPreviewIndex(prev => (prev + 1) % previewImages.length)}
                  disabled={previewImages.length <= 1}
                  className="w-6 h-6 rounded flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* PowerPoint branding */}
          <div className="flex items-center justify-center mt-3 text-xs text-gray-500">
            <Presentation className="w-4 h-4 mr-1.5" />
            <span>Microsoft PowerPoint • {showcase?.images?.length || 0} slides • Ready to present</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GeneratePresentationPage;