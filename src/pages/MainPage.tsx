import React, { useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import Sidebar from '../components/layout/Sidebar';
import MainHeader from '../components/layout/MainHeader';
import FilterPanel from '../components/layout/FilterPanel';

import ShowcaseList from '../components/showcases/ShowcaseList';
import NewShowcaseModal from '../components/showcases/NewShowcaseModal';
import toast from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import Logger from '../utils/log';

type SortField = 'title' | 'dateCreated' | 'lastModified' | 'itemCount';
type SortDirection = 'asc' | 'desc';

const MainAppPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [activeStatusFilter, setActiveStatusFilter] = useState<string>('All');
    const [sortField, setSortField] = useState<SortField>('lastModified');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isNewShowcaseModalOpen, setIsNewShowcaseModalOpen] = useState(false);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (activeStatusFilter !== 'All') count++;
        return count;
    }, [activeStatusFilter]);

    const handleFilterToggle = () => setIsFilterPanelOpen(prev => !prev);
    const handleSortChange = useCallback((field: SortField, direction: SortDirection) => {
        setSortField(field);
        setSortDirection(direction);
    }, []);



    const handleNewShowcaseClick = () => {
        setIsNewShowcaseModalOpen(true);
    };

    const handleCloseNewShowcaseModal = () => {
        setIsNewShowcaseModalOpen(false);
    };

    const handleCreateShowcase = async (title: string, description: string) => {
        const creationPromise = new Promise<void>(async (resolve, reject) => {
            try {
                Logger.info("Attempting to create showcase with title:", title);

                const newId = await invoke('create_showcase', { title, description });

                Logger.success("Showcase created successfully in backend");
                navigate(`/select_images?id=${newId}`);
                resolve(); 
            } catch (error) {
                Logger.error("Error during showcase creation:", error);
                const message = error instanceof Error ? error.message : "An unknown error occurred.";
                reject(new Error(message)); 
            }
        });

        await toast.promise(
            creationPromise,
            {
                loading: 'Creating showcase...',
                success: <b>Showcase created successfully!</b>,
                error: (err) => <b>Failed to create: {err.message}</b>,
            },
            {
                style: {
                    background: '#333', 
                    color: '#fff',
                },
                success: {
                    duration: 3000, 
                },
                error: {
                    duration: 5000, 
                }
            }
        );


        creationPromise.then(() => {
            handleCloseNewShowcaseModal();
        }).catch(() => { });
    };


    return (
        <div className="flex h-screen text-white overflow-hidden">
            <Sidebar />

            {/* Main content area */}
            <main className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-6 md:p-8 lg:p-10 flex-grow flex flex-col">
                    <div className="flex-grow mt-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >

                                <MainHeader
                                    title="Showcases"
                                    searchTerm={searchTerm}
                                    onSearchChange={setSearchTerm}
                                    showSearch={true}
                                    onFilterToggle={handleFilterToggle}
                                    showFilterButton={true}
                                    activeFilterCount={activeFilterCount}
                                    onNewShowcase={handleNewShowcaseClick}
                                    showNewShowcaseButton={true}
                                />
                                <ShowcaseList
                                    searchTerm={searchTerm}
                                    activeFilter={activeStatusFilter}
                                />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            {/* Filter Panel */}
            <AnimatePresence>
                {isFilterPanelOpen && (
                    <FilterPanel
                        isOpen={isFilterPanelOpen}
                        onClose={() => setIsFilterPanelOpen(false)}
                        activeStatusFilter={activeStatusFilter}
                        onStatusFilterChange={setActiveStatusFilter}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSortChange={handleSortChange}
                    />
                )}
            </AnimatePresence>
            <NewShowcaseModal
                isOpen={isNewShowcaseModalOpen}
                onClose={handleCloseNewShowcaseModal}
                onCreate={handleCreateShowcase}
            />
        </div>
    );
};

export default MainAppPage;