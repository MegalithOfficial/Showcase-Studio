import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Inbox, Clock, Layers, Check } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Showcase } from '../../utils/types';
import ShowcaseDetailsModal from './ShowcaseDetailsModal';


const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
};

interface ShowcaseListProps {
    searchTerm: string;
    activeFilter: string; // 'All' | 'Published' | 'Draft' | 'Archived'
}

const formatDate = (timestamp: number): string => {
    const ts = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
    const date = new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ShowcaseList: React.FC<ShowcaseListProps> = ({ searchTerm, activeFilter }) => {
    const [showcases, setShowcases] = useState<Showcase[]>([]);
    const [selectedShowcase, setSelectedShowcase] = useState<Showcase | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    useEffect(() => {
        invoke<Showcase[]>("list_showcases").then((data) => {
            setShowcases(data);
        });
    }, []);

    const filteredShowcases = useMemo(() => {
        return showcases
            .filter(showcase => {
                const matchesFilter = activeFilter === 'All' || showcase.status === activeFilter;
                const matchesSearch = showcase.title.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesFilter && matchesSearch;
            })
            .sort((a, b) => {
                let comparison: number;
                comparison = a.last_modified - b.last_modified;
                return -comparison;
            });
    }, [showcases, searchTerm, activeFilter]);

    const handleCardClick = useCallback((id: string) => {
        const showcase = showcases.find(s => s.id === id);
        if (showcase) {
            setSelectedShowcase(showcase);
            setIsDetailsModalOpen(true);
        }
    }, [showcases]);

    const handleCloseDetailsModal = useCallback(() => {
        setIsDetailsModalOpen(false);
    }, []);

    const handleCardKeyDown = useCallback((e: React.KeyboardEvent, id: string) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(id); } }, [handleCardClick]);

    return (
        <div className="space-y-5">
            {/* Showcase Grid */}
            <AnimatePresence mode="popLayout">
                {filteredShowcases.length > 0 ? (
                    <motion.div
                        key={`showcase-grid-grid-lastModified-desc`}
                        className={`grid gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        role="list"
                    >
                        {filteredShowcases.map((showcase) => {

                            return (
                                <motion.div
                                    key={showcase.id}
                                    variants={itemVariants}
                                    layout="position"
                                    initial="hidden" animate="visible" exit="hidden"
                                    className="group relative"
                                    role="listitem"
                                    onKeyDown={(e) => handleCardKeyDown(e, showcase.id)}
                                >
                                    {/* Card Button */}
                                    <button
                                        onClick={() => handleCardClick(showcase.id)}
                                        tabIndex={0}
                                        className="relative text-left w-full flex flex-col h-full bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 rounded-xl transition-all duration-300 ease-out shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black group-hover:border-indigo-500/40 hover:translate-y-[-2px]"
                                        aria-label={`Open showcase: ${showcase.title}`}
                                    >
                                        {/* Phase-based gradient header */}
                                        <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-xl ${showcase.phase === 1
                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                            : showcase.phase === 2
                                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                                                : showcase.phase === 3
                                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                                                    : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                                            }`}></div>

                                        {/* Card Content */}
                                        <div className="p-5 flex flex-col h-full">
                                            <div className="mb-3 self-start">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${showcase.phase === 1
                                                    ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                                    : showcase.phase === 2
                                                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                                        : showcase.phase === 3
                                                            ? 'bg-pink-500/15 text-pink-300 border border-pink-500/30'
                                                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                    }`}>
                                                    {showcase.phase === 1 ? (
                                                        <>
                                                            <Edit3 className="h-3 w-3" />
                                                            <span>Select Messages</span>
                                                        </>
                                                    ) : showcase.phase === 2 ? (
                                                        <>
                                                            <Edit3 className="h-3 w-3" />
                                                            <span>Edit Images</span>
                                                        </>
                                                    ) : showcase.phase === 3 ? (
                                                        <>
                                                            <Layers className="h-3 w-3" />
                                                            <span>Sort Images</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check className="h-3 w-3" />
                                                            <span>Completed</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <h2 className="text-base font-semibold text-white mb-2 line-clamp-2">
                                                {showcase.title}
                                            </h2>

                                            {/* Description */}
                                            {showcase.description && (
                                                <p className="text-sm text-gray-300 mb-4 line-clamp-2">{showcase.description}</p>
                                            )}

                                            {/* divider */}
                                            <div className="border-t border-gray-700/40 my-2"></div>

                                            {/* Metadata */}
                                            <div className="grid grid-cols-2 gap-x-3 text-xs mt-auto">
                                                <div className="flex items-center gap-1.5 truncate bg-gray-800/50 p-2 rounded-lg">
                                                    <Layers className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                                                    <span className="truncate text-gray-300 font-medium">
                                                        {(showcase.images?.length || 0) + (showcase.selected_messages?.length || 0)} items
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 justify-end truncate bg-gray-800/50 p-2 rounded-lg">
                                                    <Clock className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                                                    <span className="truncate text-gray-300 font-medium">{formatDate(showcase.last_modified)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty-state"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="col-span-full text-center py-12 px-6 bg-gradient-to-b from-gray-900 to-gray-950 rounded-xl border border-dashed border-gray-800 flex flex-col items-center"
                    >
                        <div className="w-24 h-24 mb-6 bg-gray-800/50 rounded-full flex items-center justify-center">
                            <Inbox className="h-12 w-12 text-indigo-400/50" strokeWidth={1} />
                        </div>
                        <h3 className="text-xl font-medium text-slate-300 mb-2">Create your first showcase</h3>
                        <p className="text-sm text-slate-500 max-w-md mb-6">
                            Showcase Studio helps you organize and present your best work in beautiful galleries.
                            Get started by creating your first showcase.
                        </p>

                    </motion.div>
                )}
            </AnimatePresence>

            {/* Showcase Details Modal */}
            <ShowcaseDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={handleCloseDetailsModal}
                showcase={selectedShowcase}
                onRefresh={() => invoke<Showcase[]>("list_showcases").then((data) => setShowcases(data))}
            />
        </div>
    );
};

export default ShowcaseList;