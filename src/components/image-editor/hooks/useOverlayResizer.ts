import { useState, useEffect, useCallback } from 'react';
import { EditableImage } from '../../../utils/types';
import { OVERLAY_MIN_WIDTH, OVERLAY_MAX_WIDTH } from '../constants';

interface UseOverlayResizerProps {
   selectedImage: EditableImage | null;
   setSelectedImage: React.Dispatch<React.SetStateAction<EditableImage | null>>;
};

export function useOverlayResizer({ selectedImage, setSelectedImage }: UseOverlayResizerProps) {
   const [isResizing, setIsResizing] = useState(false);
   const [initialWidth, setInitialWidth] = useState(0);
   const [initialClientX, setInitialClientX] = useState(0);

   const handleResizeStart = useCallback((e: React.MouseEvent) => {
      if (!selectedImage) return;
      e.preventDefault();
      setIsResizing(true);
      setInitialWidth(selectedImage.overlay.width);
      setInitialClientX(e.clientX);
   }, [selectedImage]);

   useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
         if (!isResizing || !selectedImage) return;

         const deltaX = e.clientX - initialClientX;
         const isRightSide = selectedImage.overlay.position.includes('right');
         const newWidth = Math.max(
            OVERLAY_MIN_WIDTH,
            Math.min(OVERLAY_MAX_WIDTH, initialWidth + (isRightSide ? -deltaX : deltaX))
         );

         setSelectedImage(prev => {
            if (!prev) return null;
            return {
               ...prev,
               overlay: {
                  ...prev.overlay,
                  width: newWidth
               }
            };
         });
      };

      const handleMouseUp = () => {
         setIsResizing(false);
      };

      if (isResizing) {
         window.addEventListener('mousemove', handleMouseMove);
         window.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
         window.removeEventListener('mousemove', handleMouseMove);
         window.removeEventListener('mouseup', handleMouseUp);
      };
   }, [isResizing, initialClientX, initialWidth, selectedImage, setSelectedImage]);

   return { isResizing, handleResizeStart };
}