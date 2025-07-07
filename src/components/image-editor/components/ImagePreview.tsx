import React from 'react';
import OverlayRenderer from './OverlayRenderer';
import { EditableImage } from '../../../utils/types';

interface ImagePreviewProps {
   image: EditableImage;
   containerRef: React.RefObject<HTMLDivElement>;
   onResizeStart: (e: React.MouseEvent) => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ image, containerRef, onResizeStart }) => {
   return (
      <div className="lg:col-span-2">
         <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="relative w-full aspect-video" ref={containerRef}>
               <img
                  src={image.imageDataUrl}
                  alt={`Selected ${image.id}`}
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous" 
                  onError={(e) => (e.currentTarget.src = 'placeholder.png')}
               />
               <OverlayRenderer
                  overlay={image.overlay}
                  sender={image.sender}
                  avatar={image.avatar}
                  message={image.message}
                  onResizeStart={onResizeStart}
               />
            </div>
         </div>
      </div>
   );
};

export default ImagePreview;