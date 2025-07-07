// src/components/layout/MainHeader.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, SlidersHorizontal } from 'lucide-react';

interface MainHeaderProps {
    title: string;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    showSearch: boolean;
    onFilterToggle: () => void; // Renamed for clarity
    showFilterButton: boolean;
    activeFilterCount: number; // To show indicator on filter button
    onNewShowcase: () => void;
    showNewShowcaseButton: boolean;
}

const MainHeader: React.FC<MainHeaderProps> = ({
    title,
    searchTerm,
    onSearchChange,
    showSearch,
    onFilterToggle,
    showFilterButton,
    activeFilterCount,
    onNewShowcase,
    showNewShowcaseButton,
}) => {
    const toolbarItemVariants = { // Simple fade/slide
        hidden: { opacity: 0, y: -8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }
    };

    return (
        // Integrated header with bottom border, using main bg color
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 md:mb-8 pb-5 border-b border-gray-700/60">
            {/* Page Title */}
            <motion.h1
                key={title}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: 0.1 }}
                className="text-2xl lg:text-3xl font-semibold text-slate-100 tracking-tight" // Bolder title
            >
                {title}
            </motion.h1>

            {/* Right Aligned Controls */}
            <motion.div
                initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.07 }}}}
                className="flex items-center gap-3 w-full sm:w-auto"
            >
                {/* Search Input */}
                {showSearch && (
                    <motion.div className="relative flex-grow sm:flex-grow-0 sm:w-64" variants={toolbarItemVariants}>
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none z-10" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            // Darker input, sharper focus
                            className="w-full pl-10 pr-3 py-2 bg-gray-800 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent border border-gray-700 transition duration-200"
                        />
                    </motion.div>
                )}

                {/* Filter Toggle Button */}
                {showFilterButton && (
                    <motion.button
                        variants={toolbarItemVariants}
                        onClick={onFilterToggle}
                        className="relative flex-shrink-0 p-2 bg-gray-800 border border-gray-700 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-gray-700 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label="Toggle Filters"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        {/* Active filter indicator dot */}
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-indigo-500 ring-2 ring-gray-900" />
                        )}
                    </motion.button>
                )}

                {/* New Showcase Button */}
                 {showNewShowcaseButton && (
                    <motion.button
                        variants={toolbarItemVariants}
                        whileHover={{ scale: 1.03, filter: 'brightness(1.15)' }} // Slightly brighter hover
                        whileTap={{ scale: 0.97 }}
                        onClick={onNewShowcase}
                        // Consistent gradient button style
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500" // Use main bg offset
                    >
                        <Plus className="h-4 w-4" strokeWidth={3} />
                        <span className="text-xs font-semibold tracking-wide hidden sm:inline">New Showcase</span>
                    </motion.button>
                 )}
            </motion.div>
        </div>
    );
};

export default MainHeader;