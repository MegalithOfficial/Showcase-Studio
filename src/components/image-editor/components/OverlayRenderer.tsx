import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { EditableImage } from '../../../utils/types';

interface OverlayRendererProps {
   overlay: EditableImage['overlay'];
   sender: string;
   avatar: string | null;
   message: string;
   onResizeStart: (e: React.MouseEvent) => void;
}

const OverlayRenderer: React.FC<OverlayRendererProps> = ({
   overlay,
   sender,
   avatar,
   message,
   onResizeStart
}) => {
   if (overlay.position === 'hidden') {
      return null;
   }

   const positionClasses = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4',
   };

   const resizeHandlePosition = {
      right: overlay.position.includes('right') ? 'auto' : '-12px',
      left: overlay.position.includes('right') ? '-12px' : 'auto'
   };

   const textStyle = overlay.style === 'black' ? 'text-white' : 'text-black';
   const subTextStyle = overlay.style === 'black' ? 'text-white/90' : 'text-black/90';
   const bgColor = overlay.style === 'black' ? '#000000' : '#ffffff';
   const bgOpacity = 1 - (overlay.transparency / 100);

   return (
      <div
         data-content 
         className={`absolute ${positionClasses[overlay.position]}`}
      >
         <div
            className="backdrop-blur-sm rounded-lg overflow-visible relative"
            style={{ width: `${overlay.width}px` }}
         >
            {/* Background overlay with opacity */}
            <div
               className="absolute inset-0 rounded-lg"
               style={{ backgroundColor: bgColor, opacity: bgOpacity }}
               aria-hidden="true"
            />
            {/* Content */}
            <div className="p-4 flex gap-4 relative z-10">
               {overlay.showAvatar && avatar && (
                  <img
                     src={avatar}
                     alt={`${sender} avatar`}
                     className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                     crossOrigin="anonymous"
                     onError={(e) => e.currentTarget.style.display = 'none'}
                     loading="lazy"
                  />
               )}
               <div className={`space-y-1 min-w-0 flex-1 ${!message ? 'flex items-center' : ''}`}>
                  <p className={`font-medium ${textStyle}`}>
                     {sender}
                  </p>
                  {message && (
                     <p className={`text-sm ${subTextStyle} break-words`}> 
                        {message}
                     </p>
                  )}
               </div>
            </div>
         </div>
         {/* Resize handle */}
         <div
            data-resize-handle
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center cursor-ew-resize shadow-md z-20" // Ensure handle is above content
            style={resizeHandlePosition}
            onMouseDown={onResizeStart}
            role="slider"
            aria-label="Resize overlay width"
            aria-valuenow={overlay.width}
            aria-valuemin={200} 
            aria-valuemax={1000} 
         >
            <ArrowLeftRight className="w-3 h-3 text-white pointer-events-none" />
         </div>
      </div>
   );
};

export default OverlayRenderer;