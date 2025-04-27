import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import {
   ChevronLeft, Layers, AlertTriangle, Loader2, Home, Camera, ImageIcon,
   ArrowRight,
} from 'lucide-react';
import { useShowcaseLoader } from '../components/image-editor/hooks/useShowcaseLoader';
import { useOverlayResizer } from '../components/image-editor/hooks/useOverlayResizer';
import { useKeyboardShortcuts } from '../components/image-editor/hooks/useKeyboardShortcuts';

import ImageCarousel from '../components/image-editor/components/ImageCarousel';
import ImagePreview from '../components/image-editor/components/ImagePreview';
import ControlsPanel from '../components/image-editor/components/ControlsPanel';
import WelcomeModal from '../components/image-editor/components/WelcomeModal';

import { captureScreenshot } from '../utils/screenshot';
import { EditableImage, ShowcaseImage } from '../utils/types';
import Logger from '../utils/log';
import toast from 'react-hot-toast';

const EditImages = () => {
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const showcaseId = searchParams.get('id');

   const {
      images: editableImages,
      isLoading: isPageLoading,
      error: pageError,
   } = useShowcaseLoader(showcaseId);

   const [selectedImage, setSelectedImage] = useState<EditableImage | null>(null);
   const [completedImages, setCompletedImages] = useState<string[]>([]);
   const [isSaving, setIsSaving] = useState(false);
   const [isModalOpen, setIsModalOpen] = useState(true);

   const previewContainerRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      if (!selectedImage && editableImages.length > 0) {
         setSelectedImage(editableImages[0]);
      }
      if (editableImages.length === 0) {
         setSelectedImage(null);
      }
   }, [editableImages, selectedImage]);

   useEffect(() => {
      if (editableImages.length > 0) {
         invoke<ShowcaseImage[]>('get_showcase_images', { id: showcaseId })
            .then(existingImages => {
               if (existingImages && existingImages.length > 0) {
                  const completedIds = existingImages
                     .filter(img => img.is_edited)
                     .map(img => img.message_id);

                  setCompletedImages(prev => [...new Set([...prev, ...completedIds])]);
               }
            })
            .catch(err => {
               Logger.error("Failed to load existing showcase images:", err);
            });
      }
   }, [editableImages, showcaseId]);

   const { handleResizeStart } = useOverlayResizer({ selectedImage, setSelectedImage });

   const handleCompleteEditing = useCallback(async () => {
      if (!showcaseId) return;

      try {
         await invoke('update_showcase_phase', {
            id: showcaseId,
            phase: 3
         });

         navigate(`/sort_images?id=${showcaseId}`);
      } catch (err) {
         Logger.error("Failed to update showcase phase:", err);
      }
   }, [showcaseId, navigate]);

   const handleImageSelect = useCallback((img: EditableImage) => {
      if (img.id === selectedImage?.id) return;
      setSelectedImage(img);
   }, [selectedImage?.id, completedImages]);

   const handleNextImage = useCallback(() => {
      if (editableImages.length < 2) return;
      const currentIndex = editableImages.findIndex(img => img.id === selectedImage?.id);
      const nextIndex = (currentIndex + 1) % editableImages.length;
      handleImageSelect(editableImages[nextIndex]);
   }, [editableImages, selectedImage?.id, handleImageSelect]);

   const handlePreviousImage = useCallback(() => {
      if (editableImages.length < 2) return;
      const currentIndex = editableImages.findIndex(img => img.id === selectedImage?.id);
      const prevIndex = currentIndex === 0 ? editableImages.length - 1 : currentIndex - 1;
      handleImageSelect(editableImages[prevIndex]);
   }, [editableImages, selectedImage?.id, handleImageSelect]);

   const saveChanges = useCallback(async () => {
      if (!showcaseId || !selectedImage || !previewContainerRef.current) return;
      setIsSaving(true);
      try {
         const dataUri = await captureScreenshot(previewContainerRef.current);
         if (!dataUri) throw new Error('Failed to capture screenshot');

         console.log(selectedImage)

         const imageMetadata: ShowcaseImage = {
            message_id: selectedImage.message_id,
            sender: selectedImage.sender,
            avatar: selectedImage.avatar ?? "" as string,
            message: selectedImage.message,
            is_edited: true,
            overlay: {
               position: selectedImage.overlay.position,
               style: selectedImage.overlay.style,
               showAvatar: selectedImage.overlay.showAvatar,
               width: selectedImage.overlay.width,
               transparency: selectedImage.overlay.transparency
            }
         };

         await invoke('upload_showcase_image', {
            id: showcaseId,
            imageMetadata: imageMetadata,
            imageDataUri: dataUri
         });

         setCompletedImages(prev => {
            const newCompletedImages = [...new Set([...prev, selectedImage.id])];

            const allCompleted = newCompletedImages.length === editableImages.length;

            if (allCompleted) {
               setTimeout(() => {
                  handleCompleteEditing();
               }, 800);
            } else {
               handleNextImage();
            }

            return newCompletedImages;
         });

      } catch (err) {
         toast.error(`Error: ${err}`);
         Logger.error("Failed to save changes:", err);
      } finally {
         setIsSaving(false);
      }
   }, [showcaseId, selectedImage, handleNextImage, editableImages.length, handleCompleteEditing]);

   const handleDownload = useCallback(async () => {
      if (!selectedImage || !previewContainerRef.current) return;
      const dataUri = await captureScreenshot(previewContainerRef.current);
      if (dataUri) {
         const link = document.createElement('a');
         link.download = `showcase-${showcaseId}-${selectedImage.message_id}.png`;
         link.href = dataUri;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
      } else {
         Logger.error("Download failed: Could not capture screenshot.");
      }
   }, [selectedImage, showcaseId]);

   const handleUpdateOverlay = useCallback((updates: Partial<EditableImage['overlay']>) => {
      setSelectedImage(prev => {
         if (!prev) return null;
         return {
            ...prev,
            overlay: { ...prev.overlay, ...updates }
         };
      });

      if (selectedImage && completedImages.includes(selectedImage.id)) {
         const hasChanges = Object.entries(updates).some(([key, value]) => {
            return selectedImage.overlay[key as keyof typeof selectedImage.overlay] !== value;
         });

         if (hasChanges) {
            setCompletedImages(prev => prev.filter(id => id !== selectedImage.id));
         }
      }
   }, [selectedImage, completedImages]);

   const handleUpdateField = useCallback((field: keyof EditableImage, value: any) => {
      setSelectedImage(prev => {
         if (!prev) return null;
         return { ...prev, [field]: value };
      });

      if (selectedImage && completedImages.includes(selectedImage.id)) {
         const hasChanges = selectedImage[field] !== value;

         if (hasChanges) {
            setCompletedImages(prev => prev.filter(id => id !== selectedImage.id));
         }
      }
   }, [selectedImage, completedImages]);

   const shortcutHandlers = useMemo(() => ({
      next: handleNextImage,
      previous: handlePreviousImage,
      save: saveChanges,
   }), [handleNextImage, handlePreviousImage, saveChanges]);
   useKeyboardShortcuts(shortcutHandlers);


   if (isPageLoading) {
      return (
         <div className="flex items-center justify-center h-screen bg-black">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
         </div>
      );
   }

   if (pageError) {
      return (
         <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Editor</h2>
            <p className="text-gray-400 mb-6 text-center">{pageError}</p>
            <button
               onClick={() => navigate('/')}
               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-medium flex items-center gap-2"
            >
               <Home className="w-4 h-4" /> Go Home
            </button>
         </div>
      );
   }

   if (editableImages.length === 0 && !isPageLoading) {
      return (
         <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-4">
            <ImageIcon className="w-12 h-12 text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Images to Edit</h2>
            <p className="text-gray-400 mb-6 text-center">No images were found for this showcase ID.</p>
            <button
               onClick={() => navigate(`/select?id=${showcaseId}`)}
               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-medium flex items-center gap-2"
            >
               <ChevronLeft className="w-4 h-4" /> Select Images Again
            </button>
         </div>
      );
   }

   const completionPercentage = editableImages.length > 0
      ? Math.round((completedImages.length / editableImages.length) * 100)
      : 0;
   const currentImageIndex = selectedImage ? editableImages.findIndex(img => img.id === selectedImage.id) : -1;

   return (
      <div className="flex flex-col h-screen overflow-hidden bg-black text-white">
         {/* Header */}
         <header className="flex-shrink-0 border-b border-gray-800/50 px-6 py-4">
            <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
               <div className="flex items-center gap-4">
                  <button
                     onClick={() => navigate(-1)}
                     className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
                     aria-label="Back"
                  >
                     <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-xl font-medium text-gray-100">Edit Images</h1>
               </div>

               <div className="flex items-center gap-3">
                  {/* Progress Indicator */}
                  <div className="flex items-center text-sm mr-2 bg-gray-800/30 rounded-lg border border-gray-700/30 px-3 py-1.5">
                     <span className="text-gray-400">
                        Image {currentImageIndex >= 0 ? currentImageIndex + 1 : '-'} of {editableImages.length}
                     </span>
                     <div className="ml-3 h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden">
                        <div
                           className="h-full bg-indigo-500 transition-all duration-300"
                           style={{ width: `${completionPercentage}%` }}
                        />
                     </div>
                     <span className="ml-2 text-xs text-gray-500">
                        {completionPercentage}%
                     </span>
                  </div>

                  {/* Download Button */}
                  <button
                     onClick={handleDownload}
                     disabled={!selectedImage || isSaving}
                     className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 flex items-center gap-2 border border-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <Camera className="w-4 h-4" />
                     <span>Download</span>
                  </button>

                  {/* Complete Editing Button */}
                  {completedImages.length === editableImages.length && editableImages.length > 0 && (
                     <button
                        onClick={handleCompleteEditing}
                        className="ml-2 px-3 py-1.5 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 border border-indigo-700/50 transition-colors"
                     >
                        <ArrowRight className="w-4 h-4" />
                        <span>Continue to Sort</span>
                     </button>
                  )}
               </div>
            </div>
         </header>

         {/* Main Content */}
         <div className="flex-grow overflow-hidden flex">
            {/* Left Side - Carousel */}
            <ImageCarousel
               images={editableImages}
               selectedImageId={selectedImage?.id}
               onSelect={(img) => handleImageSelect(img)}
               onNext={handleNextImage}
               onPrevious={handlePreviousImage}
               completedImages={completedImages}
            />

            {/* Right Side - Content */}
            <div className="flex-grow overflow-hidden">
               {selectedImage ? (
                  <div className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800/50">
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <ImagePreview
                           image={selectedImage}
                           containerRef={previewContainerRef}
                           onResizeStart={handleResizeStart}
                        />
                        <ControlsPanel
                           selectedImage={selectedImage}
                           onUpdateOverlay={handleUpdateOverlay}
                           onUpdateField={handleUpdateField}
                           onSaveChanges={saveChanges}
                           isSaving={isSaving}
                        />
                     </div>
                  </div>
               ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                     Select an image to start editing.
                  </div>
               )}
            </div>
         </div>

         {/* Welcome Modal */}
         <WelcomeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

         {isSaving && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
               <div className="flex flex-col items-center">
                  <motion.div
                     animate={{ rotate: 360 }}
                     transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                     className="mb-3"
                  >
                     <Layers className="w-8 h-8 text-indigo-400" />
                  </motion.div>
                  <p className="text-gray-300 text-sm">Saving changes...</p>
               </div>
            </div>
         )}
      </div>
   );
};

export default EditImages;