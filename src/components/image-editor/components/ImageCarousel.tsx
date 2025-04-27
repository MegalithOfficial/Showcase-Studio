import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Check } from 'lucide-react';
import { EditableImage } from '../../../utils/types';

interface ImageCarouselProps {
   images: EditableImage[];
   selectedImageId: string | null | undefined;
   onSelect: (image: EditableImage) => void;
   onNext: () => void;
   onPrevious: () => void;
   completedImages: string[];
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
   images,
   selectedImageId,
   onSelect,
   onNext,
   onPrevious,
   completedImages
}) => {
   const carouselRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      if (carouselRef.current && selectedImageId) {
         const selectedElement = carouselRef.current.querySelector(`[data-image-id="${selectedImageId}"]`);
         if (selectedElement) {
            selectedElement.scrollIntoView({
               behavior: 'smooth',
               block: 'center'
            });
         }
      }
   }, [selectedImageId]);


   return (
      <div className="w-[160px] flex-shrink-0 relative overflow-hidden border-r border-gray-800/50 bg-gray-900/20 px-1">
         <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none"></div>
         <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none"></div>

         <button
            onClick={onPrevious}
            disabled={images.length < 2}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous Image"
         >
            <ChevronUp className="w-5 h-5" />
         </button>
         <button
            onClick={onNext}
            disabled={images.length < 2}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next Image"
         >
            <ChevronDown className="w-5 h-5" />
         </button>

         {/* Carousel Container */}
         <div
            ref={carouselRef}
            className="h-full overflow-y-auto scrollbar-hide py-10" 
         >
            <div className="flex flex-col gap-2 items-center">
               {images.map((img) => {
                  const isSelected = img.id === selectedImageId;
                  return (
                     <motion.button
                        key={img.id}
                        data-image-id={img.id}
                        onClick={() => onSelect(img)}
                        className={`relative w-[140px] aspect-video rounded-lg overflow-hidden transition-all ${isSelected
                           ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-black shadow-lg'
                           : 'border border-gray-700/50'
                           }`}
                        initial={false}
                        animate={{
                           opacity: isSelected ? 1 : 0.4,
                           scale: isSelected ? 1 : 0.9,
                        }}
                        transition={{ duration: 0.2 }}
                        aria-pressed={isSelected}
                        aria-label={`Select image ${img.id}`}
                     >
                        <img
                           src={img.imageDataUrl}
                           alt={`Preview ${img.id}`}
                           className="w-full h-full object-cover"
                           loading="lazy" 
                        />
                        {completedImages.includes(img.id) && (
                           <div className="absolute bottom-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center pointer-events-none">
                              <Check className="w-3 h-3 text-white" />
                           </div>
                        )}
                     </motion.button>
                  );
               })}
            </div>
         </div>
      </div>
   );
};

export default ImageCarousel;