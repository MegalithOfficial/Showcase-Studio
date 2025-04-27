import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, X, Filter, RotateCcw, Check } from 'lucide-react';

type SortField = 'title' | 'dateCreated' | 'lastModified' | 'itemCount';
type SortDirection = 'asc' | 'desc';

interface FilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    // Filter props
    activeStatusFilter: string;
    onStatusFilterChange: (status: string) => void;
    sortField: SortField;
    sortDirection: SortDirection;
    onSortChange: (field: SortField, direction: SortDirection) => void;
}

// Mock filter options
const statusFilters = ['All', 'Published', 'Draft', 'Archived'];
const sortOptions: { id: SortField, label: string }[] = [
    { id: 'lastModified', label: 'Last Modified' },
    { id: 'dateCreated', label: 'Date Created' },
    { id: 'title', label: 'Title' },
    { id: 'itemCount', label: 'Item Count' }
];

const FilterPanel: React.FC<FilterPanelProps> = ({
    isOpen,
    onClose,
    activeStatusFilter,
    onStatusFilterChange,
    sortField,
    sortDirection,
    onSortChange
}) => {
    if (!isOpen) return null;

    const handleFieldChange = (field: SortField) => {
        onSortChange(field, sortDirection);
    };

    const handleDirectionToggle = () => {
        const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        onSortChange(sortField, newDirection);
    };

    const resetFilters = () => {
        onSortChange('lastModified', 'desc');
        onStatusFilterChange('All');
    };

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);


    // Direction indicator for current sort
    const SortDirectionIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex justify-end"
        >
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: '0%' }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm h-full bg-gray-900 shadow-xl flex flex-col z-50"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-100">
                        <Filter className="h-5 w-5 text-indigo-400" />
                        <h2 className="text-lg font-medium">Filters & Sort</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-800 text-slate-400 hover:text-slate-100 transition-colors"
                        aria-label="Close Filters"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Filter Content */}
                <div className="flex-grow overflow-y-auto">
                    <div className="p-6 space-y-8">
                        {/* Sort Section */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Sort</h3>
                                <button
                                    onClick={handleDirectionToggle}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-300 hover:bg-gray-800 transition-colors"
                                >
                                    <span>{sortDirection === 'asc' ? 'Ascending' : 'Descending'}</span>
                                    <SortDirectionIcon className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                                {sortOptions.map((option, index) => (
                                    <div
                                        key={option.id}
                                        className={`
                      ${index !== 0 ? 'border-t border-gray-700/50' : ''}
                      ${sortField === option.id ? 'bg-indigo-900/30' : 'hover:bg-gray-800'}
                    `}
                                    >
                                        <button
                                            onClick={() => handleFieldChange(option.id)}
                                            className="w-full flex items-center justify-between px-4 py-3 text-left"
                                        >
                                            <span className="text-sm text-slate-200">{option.label}</span>
                                            {sortField === option.id && (
                                                <Check className="h-4 w-4 text-indigo-400" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">Status</h3>
                            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                                {statusFilters.map((status, index) => (
                                    <div
                                        key={status}
                                        className={`
                      ${index !== 0 ? 'border-t border-gray-700/50' : ''}
                      ${activeStatusFilter === status ? 'bg-indigo-900/30' : 'hover:bg-gray-800'}
                    `}
                                    >
                                        <button
                                            onClick={() => onStatusFilterChange(status)}
                                            className="w-full flex items-center justify-between px-4 py-3 text-left"
                                        >
                                            <span className="text-sm text-slate-200">{status}</span>
                                            {activeStatusFilter === status && (
                                                <Check className="h-4 w-4 text-indigo-400" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Additional filters could be added here */}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 flex items-center gap-3">
                    <button
                        onClick={resetFilters}
                        className="flex items-center justify-center gap-2 flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <RotateCcw className="h-4 w-4" />
                        <span>Reset</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
                    >
                        Apply
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default FilterPanel;