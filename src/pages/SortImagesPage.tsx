import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, Reorder } from 'framer-motion';
import { ArrowUp, ArrowDown, Save, ArrowLeft, AlertTriangle, Loader2, Info, Move, ArrowUpDown, Check, Home } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ShowcaseImage, Showcase } from '../utils/types';
import toast from 'react-hot-toast';
import Logger from '../utils/log';

const SortImagesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const showcaseId = searchParams.get('id');
  const navigate = useNavigate();

  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [images, setImages] = useState<(ShowcaseImage & { dataUrl?: string })[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showcaseId) {
      setError('No showcase ID provided');
      setIsLoading(false);
      return;
    }

    const fetchShowcase = async () => {
      try {
        setIsLoading(true);
        const showcaseData = await invoke<Showcase>('get_showcase', { id: showcaseId });
        setShowcase(showcaseData);

        if (!showcaseData.images || showcaseData.images.length === 0) {
          setError('No images available to sort');
          setIsLoading(false);
          return;
        }

        const imagesWithData = await Promise.all(
          showcaseData.images.map(async (image, index) => {
            try {
              // TODO: Handle image exp dynamically
              const imagePath = `${showcaseId}/${showcaseId}_${image.message_id}.png`;
              const dataUrl = await invoke<string>('get_cached_image_data', {
                relativePath: imagePath
              });
              return { ...image, dataUrl };
            } catch (error) {
              Logger.error(`Failed to load image ${index}:`, error);
              return { ...image, dataUrl: undefined };
            }
          })
        );

        setImages(imagesWithData);
        if (imagesWithData.length > 0) {
          setSelectedIndex(0);
        }
      } catch (error) {
        Logger.error('Error loading showcase data:', error);
        setError(`Failed to load showcase data: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShowcase();
  }, [showcaseId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null || images.length <= 1) return;

      switch (e.key) {
        case 'ArrowUp':
          handleMoveImage('up');
          e.preventDefault();
          break;
        case 'ArrowDown':
          handleMoveImage('down');
          e.preventDefault();
          break;
        case 'Enter':
          if (e.ctrlKey || e.metaKey) {
            handleSave();
            e.preventDefault();
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            handleSave();
            e.preventDefault();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIndex, images]);

  const handleMoveImage = (direction: 'up' | 'down') => {
    if (selectedIndex === null || images.length <= 1) return;
    
    const newImages = [...images];
    const currentIndex = selectedIndex;
    let newIndex: number;

    if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1;
      [newImages[currentIndex], newImages[newIndex]] = [newImages[newIndex], newImages[currentIndex]];
      setImages(newImages);
      setSelectedIndex(newIndex);
    } else if (direction === 'down' && currentIndex < images.length - 1) {
      newIndex = currentIndex + 1;
      [newImages[currentIndex], newImages[newIndex]] = [newImages[newIndex], newImages[currentIndex]];
      setImages(newImages);
      setSelectedIndex(newIndex);
    }
  };

  const handleSave = async () => {
    if (!showcaseId || images.length === 0 || isSaving) return;

    const saveSortPromise = async () => {
      try {
        setIsSaving(true);
        const sortedImages: ShowcaseImage[] = images.map(({ dataUrl, ...rest }) => rest);
        
        await invoke('sort_showcase_images', {
          id: showcaseId,
          sortedImages
        });
        
        setTimeout(() => {
          navigate(`/generate?id=${showcaseId}`);
        }, 500);
        return "Images sorted successfully";
      } catch (error) {
        Logger.error('Error saving sorted images:', error);
        setIsSaving(false);
        throw new Error(`Failed to save image order: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    toast.promise(
      saveSortPromise(),
      {
        loading: 'Saving image order...',
        success: (msg) => msg,
        error: (err) => err.message
      },
      {
        style: {
          background: '#333',
          color: '#fff'
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black to-black">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-900/70 backdrop-blur-md p-8 rounded-2xl border border-gray-800/70 shadow-2xl flex flex-col items-center"
        >
          <div className="w-20 h-20 mb-6 relative">
            <div className="absolute inset-0 bg-purple-600/20 rounded-full animate-ping"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-14 h-14 animate-spin text-purple-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-1 text-gray-100">Loading Showcase</h2>
          <p className="text-gray-400 text-sm">Preparing your images for sorting...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !showcase) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-black to-black">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full bg-gray-900/60 backdrop-blur-md p-8 rounded-2xl border border-red-800/30 shadow-2xl flex flex-col items-center"
        >
          <div className="w-20 h-20 mb-6 flex items-center justify-center bg-red-900/20 rounded-full border border-red-700/30">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-100">Error Loading Page</h2>
          <p className="mb-5 text-center text-gray-300">{error || "Showcase data is missing."}</p>
          <button
            onClick={() => navigate('/') }
            className="mt-2 px-5 py-3 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 rounded-lg text-white font-medium flex items-center transition-all duration-200 shadow-lg hover:shadow-xl border border-gray-700/50"
          >
            <Home className="w-5 h-5 mr-2" /> Return to Home
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
              onClick={() => navigate('/') }
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-medium text-white">Sort Images</h1>
              {showcase && (
                <p className="text-sm text-gray-400">{showcase.title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="py-1 px-3 text-xs text-gray-400 bg-gray-800/30 rounded-full border border-gray-700/30">
              {images.length} image{images.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleSave}
              disabled={isSaving || images.length === 0}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                ${isSaving || images.length === 0
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-72 bg-gray-900/30 border-r border-gray-800/50 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-800/50 bg-gray-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <ArrowUpDown className="w-4 h-4 text-indigo-400" />
                <span>Drag to reorder</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <Reorder.Group 
              axis="y" 
              values={images} 
              onReorder={(newImages) => {
                setImages(newImages);
                
                if (selectedIndex !== null) {
                  const selectedItemId = images[selectedIndex].message_id;
                  const newSelectedIndex = newImages.findIndex(img => img.message_id === selectedItemId);
                  if (newSelectedIndex !== -1) {
                    setSelectedIndex(newSelectedIndex);
                  }
                }
              }}
              className="p-3 space-y-2"
            >
              {images.map((image, index) => (
                <Reorder.Item
                  key={image.message_id}
                  value={image}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={1}
                  className={`p-3 cursor-grab active:cursor-grabbing rounded-lg border ${
                    selectedIndex === index 
                      ? 'bg-indigo-900/30 border-indigo-500/50' 
                      : 'hover:bg-gray-800/30 border-gray-700/30 bg-gray-800/20'
                  }`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-14 h-14 bg-black rounded-md overflow-hidden flex items-center justify-center border border-gray-700/30">
                      {image.dataUrl ? (
                        <img 
                          src={image.dataUrl} 
                          alt={`Image ${index + 1}`}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="text-gray-500 text-xs">No preview</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center">
                        <span className="w-5 h-5 flex items-center justify-center bg-gray-800 rounded-full text-xs text-gray-400 mr-1.5">
                          {index + 1}
                        </span>
                        <p className="text-sm font-medium text-gray-200 truncate">
                          {image.sender || 'Unknown'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{image.message || 'No message'}</p>
                    </div>
                    <div className="flex-shrink-0 text-gray-500">
                      <Move className="w-4 h-4" />
                    </div>
                  </div>
                </Reorder.Item>
              ))} 
            </Reorder.Group>
          </div>
        </div>

        {/* Main content area with image preview and controls */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 bg-black">
          <div className="flex-1 flex items-center justify-center overflow-hidden mb-4">
            <div className="relative max-w-full max-h-full flex items-center justify-center bg-gray-800/20 rounded-lg border border-gray-700/30 p-2 w-full h-full">
              {selectedIndex !== null && images[selectedIndex]?.dataUrl ? (
                <img
                  src={images[selectedIndex].dataUrl}
                  alt={`Selected image ${selectedIndex + 1}`}
                  className="max-h-full max-w-full object-contain rounded shadow-lg"
                />
              ) : (
                <div className="text-gray-500 flex flex-col items-center justify-center p-8">
                  <ArrowUpDown className="w-10 h-10 mb-3 text-gray-600" />
                  <p className="text-center">Select an image to preview</p>
                  <p className="text-xs text-gray-600 mt-2 max-w-md text-center">
                    You can rearrange images by dragging them in the left sidebar or using the arrow buttons below
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Control panel */}
          <div className="border-t border-gray-800/50 py-3 bg-black rounded-t-lg">
            <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleMoveImage('up')}
                  disabled={selectedIndex === null || selectedIndex === 0}
                  className="p-2.5 rounded-md bg-gray-800/80 hover:bg-gray-700/80 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-700/30"
                  aria-label="Move up"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleMoveImage('down')}
                  disabled={selectedIndex === null || selectedIndex === images.length - 1}
                  className="p-2.5 rounded-md bg-gray-800/80 hover:bg-gray-700/80 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-700/30"
                  aria-label="Move down"
                >
                  <ArrowDown className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-gray-800/40 rounded-md px-4 py-2 flex items-center gap-2 border border-gray-700/30">
                  <Info className="w-4 h-4 text-indigo-400" />
                  <span className="text-gray-300 text-sm">Drag images or use arrow keys to reorder</span>
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-md ${
                    isSaving
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  } transition-colors flex items-center gap-2 border border-indigo-700/30`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Complete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SortImagesPage;
