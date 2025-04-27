import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Info, DatabaseZap, HardDrive, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { AboutSection } from '../components/settings/AboutSection';
import { IndexingSection } from '../components/settings/IndexingSection';
import { DataStorageSection } from '../components/settings/DataStorageSection';
import { ApiTokensSection } from '../components/settings/ApiTokensSection';
import SettingsSidebar from '../components/settings/SettingsSidebar';

const settingsSections = [
   { id: 'about', label: 'About', icon: Info, path: '/settings/about', component: AboutSection },
   { id: 'indexing', label: 'Indexing', icon: DatabaseZap, path: '/settings/indexing', component: IndexingSection },
   { id: 'data', label: 'Data & Storage', icon: HardDrive, path: '/settings/data', component: DataStorageSection },
   { id: 'tokens', label: 'API Tokens', icon: KeyRound, path: '/settings/tokens', component: ApiTokensSection },
];

const SettingsPage: React.FC = () => {
   const location = useLocation();

   const currentSection = settingsSections.find(section => location.pathname.endsWith(section.path));
   const pageTitle = currentSection?.label || "Settings";

   return (
      <div className="flex h-full bg-gray-900">
         <SettingsSidebar settingsSections={settingsSections} />

         <div className="flex-grow pl-10 pr-8 py-8 overflow-y-auto">
            <h1 className="text-2xl font-semibold text-slate-100 mb-6 pb-4 border-b border-gray-700/60">
               {pageTitle}
            </h1>

            <AnimatePresence mode="wait">
               <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
               >
                  <Outlet />
               </motion.div>
            </AnimatePresence>
         </div>
      </div>
   );
};

export default SettingsPage; 