import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { LucideIcon, ArrowLeft, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingsSection {
   id: string;
   path: string;
   label: string;
   icon: LucideIcon;
}

const SettingsSidebar: React.FC<{ settingsSections: SettingsSection[] }> = ({ settingsSections }) => {
   const navigate = useNavigate();
   const location = useLocation();

   const handleGoHome = () => {
      navigate('/');
   }

   return (
      <div className="w-64 flex-shrink-0 flex flex-col h-full border-r border-slate-800 bg-black shadow-md">
         {/* Header */}
         <div className="flex items-center p-5 border-b border-slate-800">
            <div className="p-1.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
               <Settings className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <motion.h1
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.2 }}
               className="ml-3 text-lg font-bold text-slate-100 tracking-tight"
            >
               Settings
            </motion.h1>
            
         </div>

         {/* Navigation Items */}
         <div className="flex-grow overflow-y-auto py-4 px-4 space-y-4">
            <div className="space-y-1.5">
               <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Preferences
               </p>

               {settingsSections.map((section) => {
                  const isActive = location.pathname.includes(`/settings/${section.path}`);
                  const Icon = section.icon;

                  return (
                     <NavLink
                        key={section.id}
                        to={section.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                           ? 'bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white shadow-md border border-indigo-500/40'
                           : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                           }`}
                     >
                        <div className={`${isActive ? 'text-white' : 'text-indigo-400'}`}>
                           <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                        </div>
                        <span>{section.label}</span>

                        {isActive && (
                           <motion.div
                              className="absolute inset-0 bg-slate-800/50 rounded-md -z-10"
                              layoutId="settingsNavHighlight"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                           />
                        )}
                     </NavLink>
                  );
               })}
            </div>
         </div>

         {/* Footer */}
         <div className="p-4 border-t border-slate-800">
            <button
               onClick={handleGoHome}
               className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-all duration-200 group"
            >
               <div className="h-5 w-5 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
               </div>
               <span>Go back</span>
            </button>

            <div className="mt-3 px-3 flex items-center justify-between">
               <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full">Beta</span>
               <span className="text-xs text-slate-500">v0.1.0</span>
            </div>
         </div>
      </div>
   );
};

export default SettingsSidebar;