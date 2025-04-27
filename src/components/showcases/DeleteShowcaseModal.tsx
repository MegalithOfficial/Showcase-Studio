import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeleteShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  showcaseTitle?: string;
  isLoading?: boolean;
}

const DeleteShowcaseModal: React.FC<DeleteShowcaseModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  showcaseTitle,
  isLoading = false,
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 32, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 32, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22, type: "spring", stiffness: 180, damping: 20 }}
          className="relative w-full max-w-sm bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl rounded-2xl px-7 py-8"
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors text-xl focus:outline-none"
            aria-label="Close modal"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6"/>
            </svg>
          </button>
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-red-300 text-center">Delete Showcase?</h2>
            <p className="text-gray-300 text-sm text-center mt-2">
              Are you sure you want to delete
              {showcaseTitle ? (
                <span className="font-semibold text-white"> &quot;{showcaseTitle}&quot; </span>
              ) : ' this showcase'}
              ?<br />This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-7">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                  </svg>
                  Deleting...
                </span>
              ) : 'Delete'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default DeleteShowcaseModal;
