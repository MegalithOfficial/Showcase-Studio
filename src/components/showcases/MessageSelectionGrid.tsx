import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { CheckCircle, User, Layers, Loader2, AlertTriangle, ImageOff } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

import { IndexedMessage } from '../../utils/types';
import AttachmentSelectionModal from './AttachmentSelectionModal';

interface MessageSelectionGridProps {
   messages: IndexedMessage[];
   isLoading: boolean;
   error: string | null;
   appDataDirPath: string | null;
   selectedItems: Set<string>;
   chosenFilenames: Map<string, string>;
   onToggleSelection: (messageId: string) => void;
   onAttachmentChosen: (messageId: string, filename: string) => void;
}

const MIN_CARD_WIDTH = 200;
const CARD_HEIGHT_ESTIMATE = 300;
const ROW_GAP = 16;
const OVERSCAN_COUNT = 3;

interface MessageCardProps {
   message: IndexedMessage;
   isSelected: boolean;
   chosenFilename: string | null;
   needsChoice: boolean;
   onCardClick: (message: IndexedMessage) => void;
}

const MessageCard: React.FC<MessageCardProps> = memo(({
   message, isSelected, chosenFilename, needsChoice, onCardClick
}) => {
   const [imageDataUri, setImageDataUri] = useState<string | null>(null);
   const [imageError, setImageError] = useState<string | null>(null);
   const [isLoadingImage, setIsLoadingImage] = useState(true);
   const isMounted = useRef(true);

   const previewFilename = chosenFilename ?? (message.attachments?.[0] || null);

   useEffect(() => {
      isMounted.current = true;
      let currentFilename = previewFilename;
      setImageDataUri(null); setImageError(null); setIsLoadingImage(true);

      if (currentFilename) {
         invoke<string>('get_cached_image_data', { relativePath: currentFilename })
            .then(dataUri => { if (isMounted.current && currentFilename === previewFilename) setImageDataUri(dataUri); })
            .catch(err => { if (isMounted.current && currentFilename === previewFilename) setImageError(err instanceof Error ? err.message : "Failed to load preview"); })
            .finally(() => { if (isMounted.current && currentFilename === previewFilename) setIsLoadingImage(false); });
      } else {
         setIsLoadingImage(false); setImageError("No attachment available.");
      }
      return () => { isMounted.current = false; }
   }, [previewFilename, message.message_id]);

   const handleImageError = useCallback(() => { if (!imageError) setImageError("Browser couldn't render image"); setIsLoadingImage(false); }, [imageError]);
   const handleImageLoad = useCallback(() => { if (isLoadingImage) setIsLoadingImage(false); setImageError(null); }, [isLoadingImage]);

   const hasMultiple = message.attachments.length > 1;

   return (
      <motion.div
         layout onClick={() => onCardClick(message)}
         className={`relative overflow-hidden rounded-xl h-full w-full flex flex-col
            transition-all duration-300 ease-out backdrop-blur-sm shadow-lg
            ${isSelected
               ? (needsChoice
                  ? 'ring-2 ring-yellow-400/80 border border-yellow-500/70 bg-yellow-900/10'
                  : 'ring-2 ring-purple-400/80 border border-purple-500/70 bg-purple-900/10')
               : 'border border-gray-700/40 bg-gray-800/40 hover:border-gray-500/80 hover:bg-gray-800/60'
            }`}
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         exit={{ opacity: 0 }}
         transition={{ duration: 0.3, ease: "easeOut" }}
         whileHover={{ y: -4, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)' }}
         title={hasMultiple ? `Message from ${message.author_name} (${message.attachments.length} images)` : `Message from ${message.author_name}`}
      >
         {isSelected && !needsChoice && (
            <motion.div
               layoutId={`check-${message.message_id}`}
               className="absolute top-2 right-2 z-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full p-1.5 shadow-lg"
               initial={{ scale: 0.5, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.5, opacity: 0 }}
               transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
               <CheckCircle className="w-3.5 h-3.5 text-white" />
            </motion.div>
         )}

         {hasMultiple && (
            <div className={`absolute top-2 left-2 z-20 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 
               ${isSelected
                  ? 'bg-purple-900/90 text-purple-200 border border-purple-500/40'
                  : 'bg-black/70 text-gray-200 border border-gray-600/30'}`}
            >
               <Layers className="w-3 h-3" />
               <span>{message.attachments.length} images</span>
            </div>
         )}

         <div className="aspect-square w-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
            {isLoadingImage && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-10">
                  <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
                     <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  </div>
               </div>
            )}

            {imageDataUri && !isLoadingImage && !imageError && (
               <motion.img
                  key={previewFilename}
                  alt={`Preview: ${previewFilename?.split('/').pop()}`}
                  src={imageDataUri}
                  loading="lazy"
                  decoding="async"
                  className="object-contain w-full h-full"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
               />
            )}

            {imageError && !isLoadingImage && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/30 backdrop-blur-sm text-red-300 text-center p-3 z-10">
                  <ImageOff className="w-8 h-8 mb-2 text-red-400" />
                  <span className="text-xs font-medium">{imageError}</span>
               </div>
            )}
         </div>

         <div className="p-3 border-t border-gray-700/30 flex flex-col justify-start mt-auto flex-shrink-0 bg-gradient-to-b from-gray-800/80 to-gray-900/80">
            <div className="flex items-center gap-2 mb-2 overflow-hidden">
               {message.author_avatar ? (
                  <img
                     src={message.author_avatar}
                     alt={message.author_name}
                     className="w-6 h-6 rounded-full flex-shrink-0 border border-gray-600/50 object-cover shadow-sm"
                  />
               ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0 border border-gray-600/50 shadow-sm">
                     <User className="w-3.5 h-3.5 text-gray-300" />
                  </div>
               )}
               <span className="text-gray-200 font-medium truncate flex-shrink min-w-0" title={message.author_name}>
                  {message.author_name}
               </span>
            </div>
            <p className="text-gray-400 leading-relaxed line-clamp-2 overflow-hidden text-xs" title={message.message_content || ""}>
               {message.message_content || <span className="italic text-gray-500">No message text</span>}
            </p>
         </div>
      </motion.div>
   );
});
MessageCard.displayName = 'MessageCard';

const MessageSelectionGrid: React.FC<MessageSelectionGridProps> = ({
   messages,
   isLoading: isParentLoading,
   error: parentError,
   selectedItems,
   chosenFilenames,
   onToggleSelection,
   onAttachmentChosen,
}) => {
   const [modalOpen, setModalOpen] = useState<boolean>(false);
   const [modalMessage, setModalMessage] = useState<IndexedMessage | null>(null);
   const parentRef = useRef<HTMLDivElement>(null);
   const [gridColumnCount, setGridColumnCount] = useState(4);

   useEffect(() => {
      const parent = parentRef.current; if (!parent) return;
      const resizeObserver = new ResizeObserver(entries => { for (let entry of entries) { setGridColumnCount(Math.max(1, Math.floor(entry.contentRect.width / MIN_CARD_WIDTH))); } });
      resizeObserver.observe(parent);
      const initialWidth = parent.offsetWidth; if (initialWidth > 0) { setGridColumnCount(Math.max(1, Math.floor(initialWidth / MIN_CARD_WIDTH))); }
      return () => resizeObserver.disconnect();
   }, []);

   const rowCount = Math.ceil(messages.length / gridColumnCount);
   const rowVirtualizer = useVirtualizer({ count: rowCount, getScrollElement: () => parentRef.current, estimateSize: () => CARD_HEIGHT_ESTIMATE + ROW_GAP, overscan: OVERSCAN_COUNT });

   const handleCardClick = useCallback((message: IndexedMessage) => {
      if (message.attachments.length === 1 && message.attachments[0]) { onToggleSelection(message.message_id); }
      else if (message.attachments.length > 1) { setModalMessage(message); setModalOpen(true); }
   }, [onToggleSelection]);

   const handleSelectFromModal = useCallback((messageId: string, filename: string) => { onAttachmentChosen(messageId, filename); setModalOpen(false); }, [onAttachmentChosen]);
   const handleCloseModal = useCallback(() => { setModalOpen(false); setModalMessage(null); }, []);

   const getItemsForRow = (rowIndex: number): IndexedMessage[] => { const start = rowIndex * gridColumnCount; const end = Math.min(start + gridColumnCount, messages.length); return messages.slice(start, end); };

   if (isParentLoading) { return (<div className="h-full w-full flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-3" /><span>Loading messages...</span></div>); }
   if (parentError) { return (<div className="h-full w-full flex flex-col items-center justify-center text-red-400 p-4 text-center"><AlertTriangle className="w-8 h-8 mb-3 text-red-500" /><p className="font-semibold">Error loading messages:</p><p className="text-sm">{parentError}</p></div>); }

   return (
      <>
         <div ref={parentRef} className="h-full w-full overflow-y-auto custom-scrollbar rounded-lg bg-black/20 p-1">
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
               {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const rowMessages = getItemsForRow(virtualRow.index);
                  return (
                     <div key={virtualRow.key} data-index={virtualRow.index} ref={rowVirtualizer.measureElement} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)`, padding: `0 ${ROW_GAP / 2}px ${ROW_GAP}px ${ROW_GAP / 2}px` }}>
                        <div className="grid gap-4 h-full" style={{ gridTemplateColumns: `repeat(${gridColumnCount}, minmax(0, 1fr))` }}>
                           {rowMessages.map(message => {
                              const isSelected = selectedItems.has(message.message_id);
                              const currentChosenFilename = chosenFilenames.get(message.message_id) ?? null;
                              const needsChoice = isSelected && message.attachments.length > 1 && !currentChosenFilename;
                              return (<MessageCard key={message.message_id} message={message} isSelected={isSelected} chosenFilename={currentChosenFilename} needsChoice={needsChoice} onCardClick={handleCardClick} />);
                           })}
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>

         <AttachmentSelectionModal
            isOpen={modalOpen}
            message={modalMessage}
            chosenFilename={modalMessage ? chosenFilenames.get(modalMessage.message_id) ?? null : null}
            onSelect={handleSelectFromModal}
            onClose={handleCloseModal}
         />
      </>
   );
};

export default MessageSelectionGrid;