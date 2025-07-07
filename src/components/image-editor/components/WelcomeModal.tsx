import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImageIcon, Layers, ArrowLeftRight, Camera } from 'lucide-react';

interface WelcomeModalProps {
   isOpen: boolean;
   onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
   return (
      <AnimatePresence>
         {isOpen && (
            <motion.div
               className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={onClose} 
            >
               <motion.div
                  className="bg-gray-900 border border-gray-800/60 rounded-lg max-w-lg w-full mx-4 shadow-xl overflow-hidden"
                  initial={{ scale: 0.95, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 10 }}
                  onClick={(e) => e.stopPropagation()} 
               >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-6">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                              <ImageIcon className="w-5 h-5 text-white" />
                           </div>
                           <h2 className="text-xl font-medium text-white">Welcome to the Image Editor</h2>
                        </div>
                        <button
                           onClick={onClose}
                           className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10"
                           aria-label="Close welcome modal"
                        >
                           <X className="w-5 h-5" />
                        </button>
                     </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 max-h-[70vh] overflow-y-auto"> 
                     <p className="text-gray-300 text-sm mb-6">
                        This tool helps you customize overlays for your showcase images. Here's how to use it:
                     </p>

                     {/* Features */}
                     <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                           <div className="w-8 h-8 flex-shrink-0 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                              <Layers className="w-4 h-4 text-indigo-400" />
                           </div>
                           <div>
                              <h3 className="text-sm font-medium text-gray-200 mb-1">Position & Style</h3>
                              <p className="text-xs text-gray-400">
                                 Choose where to place overlays and adjust their appearance using the controls on the right.
                              </p>
                           </div>
                        </div>
                        <div className="flex items-start gap-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                           <div className="w-8 h-8 flex-shrink-0 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                              <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                           </div>
                           <div>
                              <h3 className="text-sm font-medium text-gray-200 mb-1">Resize & Customize</h3>
                              <p className="text-xs text-gray-400">
                                 Drag the <span className="inline-block w-3 h-3 bg-indigo-600 rounded-full align-text-bottom mx-1"></span> handle to resize overlays. Adjust transparency and toggle avatar visibility.
                              </p>
                           </div>
                        </div>
                        <div className="flex items-start gap-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                           <div className="w-8 h-8 flex-shrink-0 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                              <Camera className="w-4 h-4 text-indigo-400" />
                           </div>
                           <div>
                              <h3 className="text-sm font-medium text-gray-200 mb-1">Save & Download</h3>
                              <p className="text-xs text-gray-400">
                                 Click "Save Changes" to save and proceed to the next image. Use the download button to export images.
                              </p>
                           </div>
                        </div>
                     </div>

                     {/* Keyboard shortcuts */}
                     <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-200 mb-2">Keyboard Shortcuts</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                           <div className="flex items-center justify-between p-2 bg-gray-800/20 rounded border border-gray-700/30">
                              <span className="text-gray-400">Next Image</span>
                              <span className="text-gray-300 font-mono">↓ or →</span>
                           </div>
                           <div className="flex items-center justify-between p-2 bg-gray-800/20 rounded border border-gray-700/30">
                              <span className="text-gray-400">Previous Image</span>
                              <span className="text-gray-300 font-mono">↑ or ←</span>
                           </div>
                           <div className="flex items-center justify-between p-2 bg-gray-800/20 rounded border border-gray-700/30">
                              <span className="text-gray-400">Save Changes</span>
                              <span className="text-gray-300 font-mono">Enter</span>
                           </div>
                           <div className="flex items-center justify-between p-2 bg-gray-800/20 rounded border border-gray-700/30">
                              <span className="text-gray-400">Quick Save</span>
                              <span className="text-gray-300 font-mono">Ctrl+S</span>
                           </div>
                        </div>
                     </div>

                     {/* Footer */}
                     <div className="flex items-center justify-end pt-4 border-t border-gray-700/50">
                        <button
                           onClick={onClose}
                           className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors text-sm"
                        >
                           Start Editing
                        </button>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
   );
};

export default WelcomeModal;