import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Clapperboard, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBranchBadgeStyles, getCurrentVersion, VersionInfo } from '../../utils/versionCheck';

const Sidebar: React.FC = () => {
   const [isCollapsed, setIsCollapsed] = useState(false);
   const [currentVersion, setCurrentVersion] = useState<string>("");
   const [versionBranch, setVersionBranch] = useState<VersionInfo["branch"]>("Unknown");

   const toggleCollapse = () => {
      setIsCollapsed(!isCollapsed);
   };

   const navLinkClasses = ({ isActive }: { isActive: boolean }): string =>
      `flex items-center ${isCollapsed ? 'justify-center' : ''} py-3 rounded-lg text-sm font-medium transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${isActive
         ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
         : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
      }`;

   useEffect(() => {
      const fetchVersionInfo = async () => {
         try {
            const info = await getCurrentVersion();
            setCurrentVersion(info.version);
            setVersionBranch(info.branch as VersionInfo["branch"]);
         } catch (error) {
            console.error("Failed to get version info:", error);
         }
      };

      fetchVersionInfo();
   }, []);

   const badgeStyles = getBranchBadgeStyles(versionBranch);

   return (
      <motion.aside
         initial={false}
         animate={{ width: isCollapsed ? '5rem' : '16rem' }}
         transition={{ type: 'spring', stiffness: 300, damping: 30 }}
         className="flex-shrink-0 bg-black/90 backdrop-blur-sm border-r border-slate-800 flex flex-col gap-6 shadow-xl h-full overflow-hidden relative"
      >
         {/* App Logo/Title */}
         <motion.div
            className="flex items-center p-5 border-b border-slate-700/50"
            animate={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
         >
            <div className='p-1.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg'>
               <Clapperboard className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <AnimatePresence>
               {!isCollapsed && (
                  <motion.h1
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     transition={{ duration: 0.2 }}
                     className="ml-3 text-xl font-bold text-slate-100 tracking-tight whitespace-nowrap"
                  >
                     Showcase Studio
                  </motion.h1>
               )}
            </AnimatePresence>
         </motion.div>

         {/* Navigation */}
         <nav className="flex-grow px-5 space-y-2.5">
            <NavLink
               title="Showcases"
               to="/"
               className={({ isActive }) => {
                  const baseClasses = navLinkClasses({ isActive });
                  return isCollapsed ? `${baseClasses} px-0 flex justify-center` : `${baseClasses} gap-3.5 px-4`;
               }}
               end
            >
               <Clapperboard className="h-5 w-5 flex-shrink-0" />
               <AnimatePresence>
                  {!isCollapsed && (
                     <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="whitespace-nowrap"
                     >
                        Showcases
                     </motion.span>
                  )}
               </AnimatePresence>
            </NavLink>

            <NavLink
               title="Settings"
               to="/settings"
               className={({ isActive }) => {
                  const baseClasses = navLinkClasses({ isActive });
                  return isCollapsed ? `${baseClasses} px-0 flex justify-center` : `${baseClasses} gap-3.5 px-4`;
               }}
            >
               <Settings className="h-5 w-5 flex-shrink-0" />
               <AnimatePresence>
                  {!isCollapsed && (
                     <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="whitespace-nowrap"
                     >
                        Settings
                     </motion.span>
                  )}
               </AnimatePresence>
            </NavLink>
         </nav>

         {/* Footer Area */}
         <div className="px-5 pt-4 border-t border-slate-700/50 pb-5">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <AnimatePresence>
                     {!isCollapsed && (
                        <motion.div
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           exit={{ opacity: 0 }}
                           transition={{ duration: 0.2 }}
                           className="flex items-center gap-2"
                        >
                           <span className={`text-xs px-2 py-0.5 rounded-full transition-colors ${badgeStyles}`}>
                              {versionBranch}
                           </span>
                           <span className="text-xs text-slate-500">v{currentVersion}</span>
                        </motion.div>
                     )}
                  </AnimatePresence>

               </div>

               <button
                  onClick={toggleCollapse}
                  className={`p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
                  title={isCollapsed ? "Expand" : "Collapse"}
               >
                  {isCollapsed ? (
                     <ChevronRight className="h-4 w-4" />
                  ) : (
                     <ChevronLeft className="h-4 w-4" />
                  )}
               </button>
            </div>
         </div>
      </motion.aside>
   );
};

export default Sidebar;