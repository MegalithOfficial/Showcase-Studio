import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Clock, Image, MessageSquare, ArrowUpDown, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { Showcase } from '../../utils/types';
import Logger from "../../utils/log";

interface ShowcaseDetailsModalProps {
   isOpen: boolean;
   onClose: () => void;
   showcase: Showcase | null;
   onRefresh?: () => void; 
}

const formatDate = (timestamp: number): string => {
   const date = new Date(timestamp * 1000);
   return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
   });
};

const ShowcaseDetailsModal: React.FC<ShowcaseDetailsModalProps> = ({ isOpen, onClose, showcase, onRefresh }) => {
   const navigate = useNavigate();
   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

   useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
         }

         if (isDeleteModalOpen) {
            if (e.key === 'Escape') {
               setIsDeleteModalOpen(false);
               e.preventDefault();
            }
            if (e.key === 'Enter') {
               handleDeleteShowcase();
               e.preventDefault();
            }
            return;
         }

         switch (e.key) {
            case 'Escape': 
               onClose(); e.preventDefault();
               break;
            case 'd':
            case 'D':
               if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                  setIsDeleteModalOpen(true);
                  e.preventDefault();
               }
               break;
            case 'p':
            case 'P':
               if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                  handlePreviewShowcase();
                  e.preventDefault();
               }
               break;
            case 'Enter':
               if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                  handleContinueEditing();
                  e.preventDefault();
               }
               break;
         }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
         window.removeEventListener('keydown', handleKeyDown);
      };
   }, [isOpen, isDeleteModalOpen, onClose]); if (!showcase) return null;

   const handleContinueEditing = async () => {
      onClose();
      if (showcase.phase === 1) {
         navigate(`/select_images?id=${showcase.id}`);
      } else if (showcase.phase === 2) {
         navigate(`/edit_images?id=${showcase.id}`);
      } else if (showcase.phase === 3) {
         navigate(`/sort_images?id=${showcase.id}`);
      } else {
         const exists = await invoke("check_showcase_pptx_exists", { id: showcase.id });
         if (exists) {
            const path = await invoke<string>('open_showcase_pptx', { id: showcase.id });
            await revealItemInDir(path);
         } else navigate(`/generate?id=${showcase.id}`);
      }
   }; const handlePreviewShowcase = () => {
      onClose();
      navigate(`/preview?id=${showcase.id}`);
   };

   const handleDeleteShowcase = async () => {
      try {
         await invoke("delete_showcase", { id: showcase.id });

         setIsDeleteModalOpen(false);
         onClose();

         if (onRefresh) {
            onRefresh();
         }
      } catch (error) {
         Logger.error("Failed to delete showcase:", error);
      }
   };
   return (
      <AnimatePresence>
         {isOpen && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.2 }}
               className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
               onClick={onClose}
            >
               <motion.div
                  initial={{ y: 20, opacity: 0, scale: 0.98 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 20, opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, type: "spring", stiffness: 200, damping: 25 }}
                  className="relative w-full max-w-xl bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/30 shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden"
                  onClick={e => e.stopPropagation()}
               >
                  {/* Header with gradient border */}
                  <div className="relative border-b border-gray-700/40 px-8 py-6">
                     {/* Decorative gradient element */}
                     <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500"></div>                     {/* Close button */}
                     <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-5 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                        aria-label="Close modal"
                     >
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l6 6M6 12l6-6" />
                        </svg>
                     </button>

                     {/* Title */}
                     <h2 className="text-xl font-semibold text-white">Showcase Details</h2>
                     <p className="text-gray-400 text-sm mt-1">View and manage your showcase</p>
                  </div>

                  <div className="px-8 py-6">              {/* Progress Status Bar */}
                     <div className="mb-8">
                        <div className="flex items-center justify-between">
                           {/* Step 1: Select Messages */}
                           <div className="text-center">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/30 mx-auto mb-2">
                                 {showcase.phase > 1 ? (
                                    <Check className="w-5 h-5 text-white" />
                                 ) : (
                                    <MessageSquare className="w-5 h-5 text-white" />
                                 )}
                              </div>
                              <p className="text-xs font-medium text-gray-300">Select Messages</p>
                           </div>

                           <div className="flex-1 h-[3px] mx-2 bg-gray-800">
                              <div className={`h-full bg-gradient-to-r from-blue-500 to-indigo-600 ${showcase.phase >= 2 ? 'w-full' : 'w-0'} transition-all duration-700 shadow-sm shadow-blue-900/50`}></div>
                           </div>

                           {/* Step 2: Edit Images */}
                           <div className="text-center">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-2 shadow-lg ${showcase.phase >= 2
                                 ? 'bg-gradient-to-br from-indigo-600 to-purple-600 shadow-indigo-900/30'
                                 : 'bg-gray-800 shadow-black/20'
                                 }`}>
                                 {showcase.phase > 2 ? (
                                    <Check className="w-5 h-5 text-white" />
                                 ) : (
                                    <Image className="w-5 h-5 text-white" />
                                 )}
                              </div>
                              <p className="text-xs font-medium text-gray-300">Edit Images</p>
                           </div>

                           <div className="flex-1 h-[3px] mx-2 bg-gray-800">
                              <div className={`h-full bg-gradient-to-r from-indigo-600 to-purple-600 ${showcase.phase >= 3 ? 'w-full' : 'w-0'} transition-all duration-700 shadow-sm shadow-purple-900/50`}></div>
                           </div>

                           {/* Step 3: Sort Images */}
                           <div className="text-center">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-2 shadow-lg ${showcase.phase >= 3
                                 ? 'bg-gradient-to-br from-purple-600 to-pink-600 shadow-purple-900/30'
                                 : 'bg-gray-800 shadow-black/20'
                                 }`}>
                                 {showcase.phase > 3 ? (
                                    <Check className="w-5 h-5 text-white" />
                                 ) : (
                                    <ArrowUpDown className="w-5 h-5 text-white" />
                                 )}
                              </div>
                              <p className="text-xs font-medium text-gray-300">Sort Images</p>
                           </div>

                           <div className="flex-1 h-[3px] mx-2 bg-gray-800">
                              <div className={`h-full bg-gradient-to-r from-purple-600 to-emerald-500 ${showcase.phase >= 4 ? 'w-full' : 'w-0'} transition-all duration-700 shadow-sm shadow-emerald-900/50`}></div>
                           </div>

                           {/* Step 4: Completed */}
                           <div className="text-center">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-2 shadow-lg ${showcase.phase >= 4
                                 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-900/30'
                                 : 'bg-gray-800 shadow-black/20'
                                 }`}>
                                 <Check className="w-5 h-5 text-white" />
                              </div>
                              <p className="text-xs font-medium text-gray-300">Completed</p>
                           </div>
                        </div>
                     </div>

                     {/* Showcase Content */}
                     <div className="bg-gray-800/30 rounded-2xl p-6 mb-8 border border-gray-700/40">
                        <h3 className="text-2xl font-bold mb-2 text-white">{showcase.title}</h3>
                        <p className="text-gray-300 mb-6 text-sm leading-relaxed">{showcase.description || "No description provided."}</p>

                        <div className="grid grid-cols-2 gap-5">
                           <div className="flex flex-col items-center p-4 bg-gray-800/60 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-colors">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700/70 mb-3">
                                 <Clock className="w-5 h-5 text-blue-300" />
                              </div>
                              <p className="text-xs text-gray-400 mb-1">Created</p>
                              <p className="text-sm font-medium text-gray-200">{formatDate(showcase.created_at)}</p>
                           </div>
                           <div className="flex flex-col items-center p-4 bg-gray-800/60 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-colors">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700/70 mb-3">
                                 <Image className="w-5 h-5 text-purple-300" />
                              </div>
                              <p className="text-xs text-gray-400 mb-1">Images</p>
                              <p className="text-sm font-medium text-gray-200">{showcase.selected_messages?.length || 0}</p>
                           </div>
                        </div>
                     </div>
                     {/* Actions */}
                     <div className="flex flex-col">
                        {/* Primary Button - Continue Workflow */}
                        <button
                           onClick={handleContinueEditing}
                           className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl mb-4 ${showcase.phase === 1
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30 hover:shadow-blue-900/50'
                              : showcase.phase === 2
                                 ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-900/30 hover:shadow-indigo-900/50'
                                 : showcase.phase === 3
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-900/30 hover:shadow-purple-900/50'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/30 hover:shadow-emerald-900/50'
                              }`}
                        >
                           {showcase.phase === 1
                              ? 'Continue to Select Messages'
                              : showcase.phase === 2
                                 ? 'Continue to Edit Images'
                                 : showcase.phase === 3
                                    ? 'Continue to Sort Images'
                                    : 'Download Showcase'}
                           <ChevronRight className="w-4 h-4" />
                        </button>                        {/* Secondary Actions */}
                        <div className="grid grid-cols-1 gap-3 mt-3">
                           {showcase.phase === 4 && (
                              <button
                                 onClick={handlePreviewShowcase}
                                 className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-300 hover:text-indigo-200 rounded-xl font-medium transition-all duration-200"
                              >
                                 <Eye className="w-4 h-4" />
                                 Preview Showcase
                                 <kbd className="ml-auto text-xs bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">P</kbd>
                              </button>
                           )}

                           <button
                              onClick={() => setIsDeleteModalOpen(true)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-900/40 hover:bg-red-800/60 text-red-300 hover:text-red-200 rounded-xl font-medium transition-all duration-200"
                           >
                              <Trash2 className="w-4 h-4" />
                              Delete
                              <kbd className="ml-auto text-xs bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">D</kbd>
                           </button>
                        </div>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}      {/* Delete Confirmation Modal */}
         {isDeleteModalOpen && showcase && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.2 }}
               className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
               onClick={() => setIsDeleteModalOpen(false)}
            >
               <motion.div
                  initial={{ y: 20, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 20, opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full max-w-md bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden shadow-2xl"
                  onClick={e => e.stopPropagation()}
               >
                  {/* Header with gradient border */}
                  <div className="relative border-b border-gray-700/40 px-6 py-5">
                     {/* Decorative gradient element */}
                     <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-red-600 to-red-500"></div>

                     <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-red-400" />
                        Delete Showcase
                     </h3>
                  </div>

                  <div className="p-6">
                     <p className="text-gray-300 mb-6">
                        Are you sure you want to delete "{showcase.title}"? This action cannot be undone.
                     </p>

                     <div className="flex gap-3 justify-end">
                        <button
                           onClick={() => setIsDeleteModalOpen(false)}
                           className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={handleDeleteShowcase}
                           className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                           Delete
                        </button>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
   );
};

export default ShowcaseDetailsModal;