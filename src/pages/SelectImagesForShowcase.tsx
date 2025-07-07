import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Loader2, Layers, AlertTriangle, Home, ChevronRight, CheckCircle, Filter, X, ArrowLeft } from 'lucide-react';

import MessageSelectionGrid from '../components/showcases/MessageSelectionGrid';
import { SelectedMessage, Showcase } from '../utils/types';
import { AnimatePresence, motion } from 'framer-motion';
import Logger from '../utils/log';

export interface IndexedMessage {
    message_id: string;
    channel_id: string;
    author_id: string;
    author_name: string;
    author_avatar?: string | null;
    message_content: string;
    attachments: string[];
    timestamp: number; 
}

interface DerivedChannelId {
    id: string;
}

const ALL_CHANNELS_ID = '__ALL__';

const SelectImagesForShowcase: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const showcaseId = searchParams.get('id');

    const [showcaseInfo, setShowcaseInfo] = useState<Showcase | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [chosenFilenames, setChosenFilenames] = useState<Map<string, string>>(new Map());

    const [availableChannelIds, setAvailableChannelIds] = useState<DerivedChannelId[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<string>(ALL_CHANNELS_ID);

    const [allMessages, setAllMessages] = useState<IndexedMessage[]>([]);

    const [isLoadingShowcase, setIsLoadingShowcase] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [messageError, setMessageError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);


    useEffect(() => {
        if (!showcaseId) {
            setError("Showcase ID is missing from the URL.");
            setIsLoadingShowcase(false);
            setIsLoadingMessages(false);
            return;
        }
        setIsLoadingShowcase(true);
        setError(null);
        invoke<Showcase>('get_showcase', { id: showcaseId })
            .then(info => setShowcaseInfo(info))
            .catch(err => {
                setError(`Failed to load showcase: ${err instanceof Error ? err.message : String(err)}`);
            })
            .finally(() => setIsLoadingShowcase(false));
    }, [showcaseId]);

    useEffect(() => {
        if (isLoadingShowcase || !showcaseId || error) {
            if (!isLoadingShowcase) setIsLoadingMessages(false);
            return;
        }
        setIsLoadingMessages(true);
        setMessageError(null);
        setAllMessages([]);
        setAvailableChannelIds([]);
        setSelectedChannelId(ALL_CHANNELS_ID);
        setSelectedItems(new Set());
        setChosenFilenames(new Map());

        invoke<IndexedMessage[]>('get_indexed_messages', { channelId: null })
            .then(messages => {
                const messagesWithImages = messages.filter(msg =>
                    msg.attachments && msg.attachments.length > 0 && msg.attachments.some(att => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(att))
                );
                messagesWithImages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setAllMessages(messagesWithImages);

                if (messagesWithImages.length > 0) {
                    const channelIdSet = new Set<string>();
                    messagesWithImages.forEach(msg => {
                        if (msg.channel_id) {
                            channelIdSet.add(msg.channel_id);
                        }
                    });
                    const derivedIds = Array.from(channelIdSet)
                        .map((id): DerivedChannelId => ({ id }))
                        .sort((a, b) => a.id.localeCompare(b.id));

                    setAvailableChannelIds(derivedIds);
                } else {
                    setAvailableChannelIds([]);
                }
            })
            .catch(err => {
                setMessageError(`Could not load messages: ${err instanceof Error ? err.message : String(err)}`);
                setAllMessages([]);
                setAvailableChannelIds([]);
            })
            .finally(() => setIsLoadingMessages(false));
    }, [showcaseId, isLoadingShowcase, error]);

    const filteredMessages = useMemo(() => {
        if (selectedChannelId === ALL_CHANNELS_ID) {
            return allMessages;
        }
        return allMessages.filter(msg => msg.channel_id === selectedChannelId);
    }, [allMessages, selectedChannelId]);

    const handleToggleSelection = useCallback((messageId: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            const message = allMessages.find(msg => msg.message_id === messageId);
            if (!message) return prev;

            if (newSet.has(messageId)) {
                newSet.delete(messageId);
                setChosenFilenames(prevMap => {
                    const newMap = new Map(prevMap);
                    newMap.delete(messageId);
                    return newMap;
                });
            } else {
                newSet.add(messageId);
                if (message.attachments?.length === 1) {
                    setChosenFilenames(prevMap => {
                        const newMap = new Map(prevMap);
                        newMap.set(messageId, message.attachments[0]);
                        return newMap;
                    });
                }
            }
            return newSet;
        });
        setSaveError(null);
    }, [allMessages]);

    const handleAttachmentChosen = useCallback((messageId: string, filename: string) => {
        setChosenFilenames(prevMap => {
            const newMap = new Map(prevMap);
            newMap.set(messageId, filename);
            return newMap;
        });
        setSelectedItems(prevSet => {
            if (!prevSet.has(messageId)) {
                const newSet = new Set(prevSet);
                newSet.add(messageId);
                return newSet;
            }
            return prevSet;
        });
        setSaveError(null);
    }, []);


    const handleConfirmSelection = async () => {
        if (!showcaseId) {
            setSaveError("Internal Error: Showcase ID is missing.");
            return;
        }
        if (selectedItems.size === 0) {
            setSaveError("Please select at least one image.");
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        const finalPayload: SelectedMessage[] = [];
        let missingChoiceError = false;
        let firstMissingId = '';

        for (const messageId of selectedItems) {
            const message = allMessages.find(msg => msg.message_id === messageId);
            const chosenFilename = chosenFilenames.get(messageId);

            if (!message) {
                Logger.error(`Data inconsistency: Selected message ID ${messageId} not found.`);
                setSaveError("Data inconsistency error. Please refresh.");
                setIsSaving(false); return;
            }
            if (!chosenFilename) {
                missingChoiceError = true;
                if (!firstMissingId) firstMissingId = messageId;
            } else {
                finalPayload.push({
                    message_id: message.message_id,
                    selected_attachment_filename: chosenFilename,
                    channel_id: message.channel_id,
                    author_id: message.author_id,
                    author_name: message.author_name,
                    author_avatar: message.author_avatar ?? null,
                    message_content: message.message_content,
                    timestamp: message.timestamp,
                });
            }
        }
        if (missingChoiceError) {
            setSaveError(`Please select a specific image for all highlighted messages (${(<Layers className="w-3 h-3 inline-block -mt-px" />)}). Start with ID ${firstMissingId.substring(0, 8)}...`);
            setIsSaving(false); return;
        }
        if (finalPayload.length !== selectedItems.size) {
            Logger.error(`Mismatch: selectedItems count (${selectedItems.size}) !== finalPayload count (${finalPayload.length})`);
            setSaveError("Error preparing selection data.");
            setIsSaving(false); return;
        }
        try {
            Logger.info(`Saving ${finalPayload.length} selected messages for showcase ${showcaseId}...`);
            Logger.info("Payload:", finalPayload);
            await invoke('save_selected_messages', { id: showcaseId, selectedMessages: finalPayload });
            Logger.success("Navigate to /editimages?id=" + showcaseId);
            navigate(`/edit_images?id=${showcaseId}`);
        } catch (err) {
            console.error("Failed to save selected messages:", err);
            setSaveError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
            setIsSaving(false);
        }
    };

    if (isLoadingShowcase || isLoadingMessages) {
        let loadingText = isLoadingShowcase ? "Loading Showcase Data..." : "Loading Messages...";

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
                    <h2 className="text-xl font-semibold mb-1 text-gray-100">{loadingText}</h2>
                    <p className="text-gray-400 text-sm">Preparing message list...</p>
                </motion.div>
            </div>
        );
    }

    const pageError = error || messageError;
    if (pageError || !showcaseId) {
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
                    <p className="mb-5 text-center text-gray-300">{pageError || "Showcase ID is missing."}</p>
                    <button
                        onClick={() => navigate('/')}
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
            {/* Minimalist Header */}
            <header className="border-b border-gray-800/50 py-4 px-6 flex-shrink-0">
                <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-medium text-white">Select Images</h1>
                            {showcaseInfo && (
                                <p className="text-sm text-gray-400">{showcaseInfo.title}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="py-1 px-3 text-xs text-gray-400 bg-gray-800/30 rounded-full border border-gray-700/30">
                            {filteredMessages.length} images
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex flex-col overflow-hidden px-6 py-4">
                <div className="max-w-screen-2xl w-full mx-auto flex flex-col flex-grow overflow-hidden">
                    {/* Minimal Filter Bar */}
                    <div className="mb-3 flex-shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-400">Channel Filter</span>
                            </div>
                            <div className="text-xs text-gray-500">
                                {selectedItems.size > 0 && `${selectedItems.size} selected`}
                            </div>
                        </div>

                        {/* Streamlined Scrollable Tabs */}
                        <div className="relative">
                            <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
                            <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>

                            <div className="overflow-x-auto py-1 pl-4 pr-4 flex items-center gap-2 custom-scrollbar-thin">
                                <button
                                    onClick={() => setSelectedChannelId(ALL_CHANNELS_ID)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex-shrink-0
                    ${selectedChannelId === ALL_CHANNELS_ID
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-800/50 hover:bg-gray-800 text-gray-300 border border-gray-800/60'
                                        }`}
                                >
                                    All
                                </button>

                                {availableChannelIds.map(channel => {
                                    const displayId = channel.id.substring(0, 8);

                                    return (
                                        <button
                                            key={channel.id}
                                            onClick={() => setSelectedChannelId(channel.id)}
                                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex-shrink-0
                            ${selectedChannelId === channel.id
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-800/50 hover:bg-gray-800 text-gray-300 border border-gray-800/60'
                                                }`}
                                        >
                                            <code>{displayId}...</code>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-grow overflow-hidden rounded-md relative border border-gray-800/50">
                        <MessageSelectionGrid
                            messages={filteredMessages}
                            isLoading={false}
                            error={null}
                            selectedItems={selectedItems}
                            chosenFilenames={chosenFilenames}
                            onToggleSelection={handleToggleSelection}
                            onAttachmentChosen={handleAttachmentChosen}
                            appDataDirPath={null}
                        />

                        {allMessages.length > 0 && filteredMessages.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                <div className="bg-gray-900 p-4 rounded-md border border-gray-800 text-center max-w-xs">
                                    <p className="text-gray-300 mb-3">No images in this channel</p>
                                    <button
                                        onClick={() => setSelectedChannelId(ALL_CHANNELS_ID)}
                                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-md"
                                    >
                                        Show all channels
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-800/50 py-3 px-6 flex-shrink-0">
                <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                            <CheckCircle className="w-4 h-4 text-indigo-500" />
                            <span>{selectedItems.size} selected</span>
                        </div>
                    </div>

                    <AnimatePresence>
                        {saveError && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-red-400 text-sm flex items-center gap-2 px-3 py-1.5 bg-red-900/20 rounded-md"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                <span>{saveError}</span>
                                <button
                                    onClick={() => setSaveError(null)}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={handleConfirmSelection}
                        disabled={selectedItems.size === 0 || isSaving}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                            ${(selectedItems.size === 0 || isSaving)
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
                                <span>Continue</span>
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </footer>

            {/* Loading State */}
            {(isLoadingShowcase || isLoadingMessages) && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                        <p className="text-gray-300">Loading...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {(error || messageError) && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="max-w-md bg-gray-900 p-6 rounded-md border border-gray-800">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                            <h2 className="text-lg font-medium text-white">Error</h2>
                        </div>
                        <p className="text-gray-300 mb-4">{error || messageError}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-sm"
                        >
                            Return to Home
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
export default SelectImagesForShowcase;