import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Presentation, AlertTriangle, ArrowLeft, ArrowRight, FileCheck } from 'lucide-react';
import { Showcase } from '../utils/types';
import Logger from '../utils/log';

const ShowcasePreviewPage: React.FC = () => {
   const [searchParams] = useSearchParams();
   const showcaseId = searchParams.get('id');
   const navigate = useNavigate();

   const [showcase, setShowcase] = useState<Showcase | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
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

            await loadPreviewImages(showcaseData);
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
   }, [previewImages]);

   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
         }

         if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home') {
            setCurrentPreviewIndex(prev => prev === 0 ? previewImages.length - 1 : prev - 1);
            e.preventDefault();
         } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown' || e.key === 'End') {
            setCurrentPreviewIndex(prev => (prev + 1) % previewImages.length);
            e.preventDefault();
         } else if (e.key === 'Escape') {
            handleGoHome();
            e.preventDefault();
         } else if (e.key === 'Enter' || e.key === 'p' || e.key === 'P') {
            handleGeneratePresentation();
            e.preventDefault();
         } else if (e.key >= '1' && e.key <= '9') {
            const slideIndex = parseInt(e.key) - 1;
            if (slideIndex < previewImages.length) {
               setCurrentPreviewIndex(slideIndex);
               e.preventDefault();
            }
         }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
         window.removeEventListener('keydown', handleKeyDown);
      };
   }, [previewImages.length, navigate, showcaseId]);

   const loadPreviewImages = async (showcaseData: Showcase) => {
      if (!showcaseData.images || showcaseData.images.length === 0) return;

      try {
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
         setIsLoading(false);
      } catch (error) {
         Logger.error('Error loading preview images:', error);
         setError(`Failed to load preview images: ${error instanceof Error ? error.message : String(error)}`);
         setIsLoading(false);
      }
   };

   const handleGoHome = () => {
      navigate('/');
   };

   const handleGeneratePresentation = () => {
      navigate(`/generate?id=${showcaseId}`);
   };

   if (isLoading) {
      return (
         <div className="flex justify-center items-center h-screen bg-black text-white">
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="bg-gray-900/70 backdrop-blur-md p-8 rounded-2xl border border-gray-800/70 shadow-2xl flex flex-col items-center max-w-md w-full"
            >
               <div className="w-16 h-16 mb-6 flex items-center justify-center">
                  <motion.div
                     animate={{
                        rotate: 360,
                        opacity: [0.5, 1, 0.5]
                     }}
                     transition={{
                        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                        opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                     }}
                     className="w-16 h-16 border-t-4 border-blue-500 rounded-full"
                  />
               </div>
               <h2 className="text-xl font-semibold mb-3 text-gray-100">
                  Loading Preview...
               </h2>
               <p className="text-gray-400 text-sm text-center">
                  Preparing showcase images for preview
               </p>
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
         <header className="border-b border-gray-800/50 py-3 px-5 bg-black shadow-md">
            <div className="flex items-center justify-between gap-2">
               <div className="flex items-center gap-3">
                  <button
                     onClick={handleGoHome}
                     className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/70 transition-colors"
                     aria-label="Go back to home"
                  >
                     <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                     <h1 className="text-lg font-medium text-white">Showcase Preview</h1>
                     {showcase && (
                        <p className="text-sm text-gray-400 truncate max-w-[250px] md:max-w-md">{showcase.title}</p>
                     )}
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <button
                     onClick={handleGeneratePresentation}
                     className="py-2 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-lg transition-colors flex items-center text-sm gap-2 font-medium shadow-md hover:shadow-lg"
                  >
                     <FileCheck className="w-4 h-4" />
                     <span>Generate Presentation</span>
                  </button>

                  <div className="py-1.5 px-3 text-xs text-gray-300 bg-gray-800/70 rounded-md border border-gray-700/50 flex items-center gap-2 shadow-sm">
                     <Presentation className="w-3.5 h-3.5 text-blue-400" />
                     <span>{showcase?.images?.length || 0} slides</span>
                  </div>
               </div>
            </div>
         </header>      
         {/* Main content */}
         <div className="flex-1 flex flex-col bg-gray-950/95">
            <div className="relative flex-1 flex flex-col">
               <div className="flex-grow flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.05),_transparent_70%)]"></div>

                  <div className="w-full h-full relative">
                     <div className="absolute left-1/2 -translate-x-1/2 bottom-5 w-[90%] h-[10px] bg-black/50 rounded-full blur-xl"></div>

                     <div className="w-full h-full relative perspective-[1200px] flex items-center justify-center">
                        <div className="relative w-[95%] h-[90%] transform-gpu rotate-x-1 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3),0_10px_10px_-5px_rgba(0,0,0,0.2)] rounded-md overflow-hidden">
                           <AnimatePresence mode="wait">
                              {previewImages.length > 0 ? (
                                 <motion.div
                                    key={currentPreviewIndex}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.25 }}
                                    className="absolute inset-0 bg-black flex items-center justify-center"
                                 >
                                    <img
                                       src={previewImages[currentPreviewIndex]}
                                       alt={`Slide ${currentPreviewIndex + 1}`}
                                       className="max-w-full max-h-full object-contain"
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
                     <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-3 z-10">
                        {previewImages.map((_, index) => (
                           <button
                              key={index}
                              onClick={() => setCurrentPreviewIndex(index)}
                              className={`w-3 h-3 rounded-full transition-all duration-300 shadow-md border ${index === currentPreviewIndex
                                 ? 'bg-blue-500 scale-125 border-blue-300/30'
                                 : 'bg-gray-700 hover:bg-gray-600 border-gray-600/30'
                                 }`}
                              aria-label={`Go to slide ${index + 1}`}
                           />
                        ))}
                     </div>
                  )}
               </div>
               
               {/* Slide controls bar */}
               <div className="bg-black py-3 px-4 border-t border-gray-800/50">
                  <div className="flex items-center justify-between mb-2">
                     <div className="text-xs text-gray-400 flex items-center gap-2">
                        <Presentation className="w-3.5 h-3.5 text-blue-400" />
                        <span>Slide {currentPreviewIndex + 1} of {previewImages.length}</span>
                     </div>

                     <div className="flex gap-2">
                        <button
                           onClick={() => setCurrentPreviewIndex(prev => prev === 0 ? previewImages.length - 1 : prev - 1)}
                           disabled={previewImages.length <= 1}
                           className="w-8 h-8 rounded flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50 transition-colors"
                        >
                           <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button
                           onClick={() => setCurrentPreviewIndex(prev => (prev + 1) % previewImages.length)}
                           disabled={previewImages.length <= 1}
                           className="w-8 h-8 rounded flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50 transition-colors"
                        >
                           <ArrowRight className="w-4 h-4" />
                        </button>
                     </div>
                  </div>

                  {/* Keyboard shortcuts row */}
                  <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-gray-500/80 text-[10px]">
                     <span className="flex items-center"><kbd className="px-1.5 py-0.5 bg-gray-800/80 rounded mr-1.5 border border-gray-700/50">←/→</kbd> Navigate</span>
                     <span className="flex items-center"><kbd className="px-1.5 py-0.5 bg-gray-800/80 rounded mr-1.5 border border-gray-700/50">1-9</kbd> Jump to slide</span>
                     <span className="flex items-center"><kbd className="px-1.5 py-0.5 bg-gray-800/80 rounded mr-1.5 border border-gray-700/50">P</kbd> Generate</span>
                     <span className="flex items-center"><kbd className="px-1.5 py-0.5 bg-gray-800/80 rounded mr-1.5 border border-gray-700/50">Esc</kbd> Exit</span>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default ShowcasePreviewPage;
