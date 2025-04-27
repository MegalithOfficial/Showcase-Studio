import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, ImageOff, Loader2, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { IndexedMessage } from '../../utils/types';
import { invoke } from '@tauri-apps/api/core';

interface ModalImageProps {
    relativePath: string;
    isSelected: boolean;
    onClick: () => void;
}

const ModalImage: React.FC<ModalImageProps> = memo(({ relativePath, isSelected, onClick }) => {
    const [imageDataUri, setImageDataUri] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoadingUrl, setIsLoadingUrl] = useState(true);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        setIsLoadingUrl(true);
        setLoadError(null);
        setImageDataUri(null);

        invoke<string>('get_cached_image_data', { relativePath })
            .then(dataUri => { if (isMounted.current) setImageDataUri(dataUri); })
            .catch(err => { if (isMounted.current) setLoadError(err instanceof Error ? err.message : "Load failed"); })
            .finally(() => { if (isMounted.current) setIsLoadingUrl(false); });

        return () => { isMounted.current = false; };
    }, [relativePath]);

    const handleImageError = useCallback(() => {
        if (!loadError) setLoadError("Browser render failed");
        setIsLoadingUrl(false);
    }, [loadError]);

    const handleImageLoad = useCallback(() => {
        if (isLoadingUrl) setIsLoadingUrl(false);
        setLoadError(null);
    }, [isLoadingUrl]);

    const filename = relativePath.split(/[/\\]/).pop() ?? 'image';

    return (
        <div
            onClick={onClick}
            className={`group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border-2 aspect-square flex items-center justify-center
                ${isSelected
                    ? 'border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.3),0_0_15px_rgba(59,130,246,0.15)]'
                    : 'border-gray-700/30 hover:border-gray-500/70'}`}
            title={`Select image: ${filename}`}
        >
            {/* Selected Indicator */}
            {isSelected && (
                <div className="absolute top-2 right-2 z-20 bg-blue-500 rounded-full p-1 shadow-lg">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                </div>
            )}

            {/* Dark Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isSelected ? 'opacity-100' : ''}`}></div>

            {/* Loading State */}
            {isLoadingUrl && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/50">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                </div>
            )}

            {/* Image Content */}
            {imageDataUri && !isLoadingUrl && !loadError && (
                <img
                    src={imageDataUri}
                    alt={filename}
                    decoding="async"
                    className="object-cover w-full h-full"
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                />
            )}

            {/* Error State */}
            {loadError && !isLoadingUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 text-red-200 text-xs p-2 text-center">
                    <ImageOff className="w-5 h-5 mb-1 text-red-400" />
                    <span>{loadError}</span>
                </div>
            )}
            
            {/* Image Filename */}
            <div className={`absolute bottom-0 left-0 right-0 p-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isSelected ? 'opacity-100' : ''}`}>
                {filename.length > 20 ? filename.substring(0, 20) + '...' : filename}
            </div>
        </div>
    );
});
ModalImage.displayName = 'ModalImage';

interface AttachmentSelectionModalProps {
    isOpen: boolean;
    message: IndexedMessage | null;
    chosenFilename: string | null;
    onSelect: (messageId: string, filename: string) => void;
    onClose: () => void;
}

const AttachmentSelectionModal: React.FC<AttachmentSelectionModalProps> = ({
    isOpen, message, chosenFilename, onSelect, onClose,
}) => {
    if (!message) return null;

    const handleConfirmSelection = () => {
        if (chosenFilename) {
            onSelect(message.message_id, chosenFilename);
        }
    };
    
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        className="relative bg-gray-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col z-10"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-700/70 flex justify-between items-center bg-gray-900">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                    <ImageIcon className="w-5 h-5 text-blue-400" />
                                </div>
                                <h2 className="text-lg font-medium text-white">Select an Image</h2>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="p-1.5 rounded-full hover:bg-gray-700/70 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Author Info Section */}
                        <div className="p-5 border-b border-gray-700/50 bg-gray-950">
                            <div className="flex items-center gap-3">
                                {message.author_avatar ? (
                                    <img
                                        src={message.author_avatar}
                                        alt={message.author_name || "User"}
                                        className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-gray-700/50"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg font-semibold text-white">
                                        {(message.author_name || "U").substring(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate">{message.author_name || "Unknown User"}</p>
                                    <p className="text-blue-300/80 text-sm">
                                        {new Date(message.timestamp * 1000).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Message Content */}
                            {message.message_content && (
                                <div className="bg-gray-700/30 rounded-lg mt-4 p-3.5 border border-gray-700/50 shadow-inner">
                                    <p className="text-gray-200 whitespace-pre-wrap break-words max-h-24 overflow-y-auto custom-scrollbar-thin">
                                        {message.message_content}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Image Grid Section */}
                        <div className="p-5 flex-1 overflow-y-auto bg-gray-900 min-h-[220px]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-sm text-blue-300">
                                    <ImageIcon className="w-4 h-4" />
                                    <span>Available Images ({message.attachments.length})</span>
                                </div>
                                
                                <div className="text-sm px-3 py-1 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                    Select one to continue
                                </div>
                            </div>

                            {/* Image Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
                                {message.attachments.map((relativeFilename) => (
                                    <ModalImage
                                        key={relativeFilename}
                                        relativePath={relativeFilename}
                                        isSelected={chosenFilename === relativeFilename}
                                        onClick={() => onSelect(message.message_id, relativeFilename)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-700/50 flex justify-between items-center bg-gray-900 ">
                            <button
                                onClick={onClose}
                                className="px-4 py-1.5 text-gray-300 hover:text-white hover:underline transition-colors">
                                Cancel
                            </button>
                            
                            <button
                                onClick={handleConfirmSelection}
                                disabled={!chosenFilename}
                                className={`px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-all flex items-center gap-2
                                    ${!chosenFilename
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                                    }`}
                            >
                                <span>Confirm Selection</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AttachmentSelectionModal;