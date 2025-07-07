import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import Logger from '../../utils/log';

interface NewShowcaseModalProps {
   isOpen: boolean;
   onClose: () => void;
   onCreate: (title: string, description: string) => Promise<void>;
}

const NewShowcaseModal: React.FC<NewShowcaseModalProps> = ({ isOpen, onClose, onCreate }) => {
   const [title, setTitle] = useState('');
   const [description, setDescription] = useState('');
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const inputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      if (isOpen) {
         setTitle('');
         setDescription('');
         setIsLoading(false);
         setError(null);
         setTimeout(() => inputRef.current?.focus(), 100);
      }
   }, [isOpen]);

   const handleSubmit = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!title.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);
      try {
         await onCreate(title.trim(), description.trim());
      } catch (err: any) {
         Logger.error("Failed to create showcase:", err);
         setError(err.message || "Failed to create showcase.");
         setIsLoading(false);
      }
   };


   useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
         if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            return;
         }

         if (event.key === 'Escape') {
            onClose();
         } else if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (title.trim() && !isLoading) {
               handleSubmit(new Event('submit') as unknown as React.FormEvent);
            }
         }
      };

      if (isOpen) {
         window.addEventListener('keydown', handleKeyDown);
      } else {
         window.removeEventListener('keydown', handleKeyDown);
      }

      return () => {
         window.removeEventListener('keydown', handleKeyDown);
      };
   }, [isOpen, onClose, title, isLoading]);

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
                  className="relative w-full max-w-md bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/30 shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden"
                  onClick={e => e.stopPropagation()}
               >
                  <div className="relative border-b border-gray-700/40 px-7 py-6">
                     <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                     <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-5 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                        aria-label="Close modal"
                     >
                        <X className="w-5 h-5" />
                     </button>

                     <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/30">
                           <Plus className="w-5 h-5 text-white" />
                        </div>
                        
                        <div>
                           <h2 className="text-xl font-semibold text-white">Create New Showcase</h2>
                           <p className="text-gray-400 text-sm mt-1">Start collecting your best moments</p>
                        </div>
                     </div>
                  </div>

                  <form onSubmit={handleSubmit} className="px-7 py-6">
                     <div className="space-y-5">
                        <div>
                           <label htmlFor="showcase-title" className="block text-sm font-medium text-gray-300 mb-2">
                              Title <span className="text-indigo-400">*</span>
                           </label>
                           <input
                              ref={inputRef}
                              type="text"
                              id="showcase-title"
                              value={title}
                              onChange={e => setTitle(e.target.value)}
                              required
                              className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 
                                       focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:outline-none transition"
                              placeholder="Give your showcase a name"
                              disabled={isLoading}
                           />
                        </div>
                        <div>
                           <label htmlFor="showcase-description" className="block text-sm font-medium text-gray-300 mb-2">
                              Description <span className="text-gray-500 font-normal">(optional)</span>
                           </label>
                           <textarea
                              id="showcase-description"
                              value={description}
                              onChange={e => setDescription(e.target.value)}
                              rows={3}
                              className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 
                                       focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:outline-none transition resize-none"
                              placeholder="Add a short description of your showcase"
                              disabled={isLoading}
                           />
                        </div>
                     </div>

                     {error && (
                        <div className="mt-4 p-3 bg-red-900/30 border border-red-700/40 rounded-lg">
                           <p className="text-red-400 text-sm">{error}</p>
                        </div>
                     )}

                     <div className="flex justify-end gap-3 mt-6">
                        <button
                           type="button"
                           onClick={onClose}
                           disabled={isLoading}
                           className="px-4 py-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-gray-700/50 transition disabled:opacity-50"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           disabled={isLoading || !title.trim()}
                           className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 
                                    text-white font-medium shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 
                                    transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                           {isLoading ? (
                              <span className="flex items-center gap-2">
                                 <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                                 </svg>
                                 Creating...
                              </span>
                           ) : (
                              <>
                                 Create Showcase
                              </>
                           )}
                        </button>
                     </div>
                  </form>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
   );
};

export default NewShowcaseModal;