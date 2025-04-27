import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SelectedMessage, EditableImage } from '../../../utils/types';
import { DEFAULT_OVERLAY } from '../constants';

export function useShowcaseLoader(showcaseId: string | null) {
   const [images, setImages] = useState<EditableImage[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (!showcaseId) {
         setError("Showcase ID missing.");
         setIsLoading(false);
         setImages([]);
         return;
      }

      setIsLoading(true);
      setError(null);
      setImages([]);

      const loadData = async () => {
         try {
            const msgs: SelectedMessage[] = await invoke('get_selected_messages', { id: showcaseId });
            if (!msgs || msgs.length === 0) {
               setError("No images selected for this showcase.");
               setImages([]);
               setIsLoading(false);
               return;
            }

            const loadedImages: EditableImage[] = [];
            await Promise.all(msgs.map(async (m) => {
               try {
                  const dataUri: string = await invoke('get_cached_image_data', { messageId: m.message_id, relativePath: m.selected_attachment_filename });
                  loadedImages.push({
                     id: m.message_id,
                     message_id: m.message_id,
                     filename: m.selected_attachment_filename,
                     sender: m.author_name,
                     avatar: m.author_avatar,
                     message: m.message_content,
                     imageDataUrl: dataUri,
                     overlay: { ...DEFAULT_OVERLAY }
                  });
               } catch (imgErr) {
                  console.error(`Failed to load image data for message ${m.message_id}:`, imgErr);
               }
            }));

            const orderedImages = msgs
               .map(m => loadedImages.find(img => img.id === m.message_id))
               .filter((img): img is EditableImage => img !== undefined);

            if (orderedImages.length === 0 && msgs.length > 0) {
               setError("Failed to load image data for all selected items.");
            } else if (orderedImages.length === 0) {
               setError("No images found or loaded.");
            }

            setImages(orderedImages);

         } catch (e) {
            console.error('Failed to load images:', e);
            setError(`Failed to load image list: ${e instanceof Error ? e.message : String(e)}`);
            setImages([]);
         } finally {
            setIsLoading(false);
         }
      };

      loadData();

   }, [showcaseId]);

   return { images, isLoading, error, setImages };
}