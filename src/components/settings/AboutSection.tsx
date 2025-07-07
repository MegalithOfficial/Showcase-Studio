import React, { useEffect, useState } from 'react';
import { Info, Github, ExternalLink, Laptop, Copy, Check, Clapperboard, AlertCircle, Download, RefreshCw, Clock, ArrowRight } from 'lucide-react';
import { checkForUpdates, getCurrentVersion, getUpdateGithubLink, type VersionInfo } from '../../utils/versionCheck';

export const AboutSection: React.FC = () => {
   const [copiedInfo, setCopiedInfo] = useState<string | null>(null);
   const [currentVersion, setCurrentVersion] = useState<string>("");
   const [versionBranch, setVersionBranch] = useState<string>("");
   const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
   const [checkingForUpdates, setCheckingForUpdates] = useState<boolean>(false);
   const [updateError, setUpdateError] = useState<string | null>(null);

   const handleCopy = (value: string, key: string) => {
      navigator.clipboard.writeText(value);
      setCopiedInfo(key);
      setTimeout(() => setCopiedInfo(null), 2000);
   };

   useEffect(() => {
      const fetchVersionInfo = async () => {
         try {
            const info = await getCurrentVersion();
            setCurrentVersion(info.version);
            setVersionBranch(info.branch);
         } catch (error) {
            console.error("Failed to get version info:", error);
         }
      };

      fetchVersionInfo();
   }, []);

   const handleCheckForUpdates = async () => {
      setCheckingForUpdates(true);
      setUpdateError(null);

      try {
         const info = await checkForUpdates(currentVersion);
         console.log(info)
         setUpdateInfo(info);
      } catch (error) {
         console.error("Error checking for updates:", error);
         setUpdateError("Failed to check for updates. Please try again later.");
      } finally {
         setCheckingForUpdates(false);
      }
   };

   const handleDownloadUpdate = async () => {
      try {
         const link = await getUpdateGithubLink();
         window.open(link, "_blank");
      } catch (error) {
         console.error("Failed to get update link:", error);
         setUpdateError("Failed to get download link. Please try again later.");
      }
   };

   return (
      <div className="space-y-6">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
               <Info className="h-6 w-6 text-indigo-400" />
               About
            </h2>
            <div className="flex items-center justify-center h-8 w-8 bg-indigo-600/20 rounded-full">
               <Laptop className="h-4 w-4 text-indigo-400" />
            </div>
         </div>



         <div className="p-6 bg-gray-800/40 rounded-lg border border-gray-700/60 backdrop-blur-sm transition-all duration-200 hover:border-gray-600/80 shadow-lg shadow-black/10">
            <div className="flex items-center gap-4 mb-6">
               <div className="h-16 w-16 bg-indigo-600/30 rounded-lg flex items-center justify-center border border-indigo-500/30 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-600/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <Clapperboard className="h-20 w-20 lg:h-24 lg:w-24 text-purple-500" strokeWidth={1.5} />
               </div>
               <div>
                  <h3 className="text-xl font-medium text-slate-100">Showcase Studio</h3>
                  <p className="text-slate-400 text-sm">Discord showcase image indexer and organizer</p>
               </div>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
               <p className="leading-relaxed">Showcase Studio helps you index and organize images from your Discord server showcases. Easily search, filter, and manage your visual content with an intuitive interface.</p>
            </div>
         </div>

         {/* Update section - new addition */}
         <div className="overflow-hidden p-6 bg-gray-800/40 rounded-lg border border-gray-700/60 backdrop-blur-sm transition-all duration-200 hover:border-gray-600/80 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between mb-3">
               <h4 className="text-lg font-medium text-slate-200 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-indigo-400" />
                  Updates
               </h4>
               <button
                  onClick={handleCheckForUpdates}
                  disabled={checkingForUpdates}
                  className="px-3.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-sm rounded-md 
            transition-all duration-200 border border-indigo-500/30 flex items-center gap-2 
            disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:shadow-indigo-900/20"
               >
                  {checkingForUpdates ? (
                     <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Checking...</span>
                     </>
                  ) : (
                     <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Check for Updates</span>
                     </>
                  )}
               </button>
            </div>

            <div className="mt-2 transition-all duration-300">
               {checkingForUpdates && !updateInfo && !updateError && (
                  <div className="p-4 bg-gray-900/50 border border-gray-700/50 rounded-md flex items-center gap-3">
                     <div className="h-8 w-8 rounded-full bg-indigo-900/30 flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
                     </div>
                     <div>
                        <p className="text-slate-200 font-medium">Checking for updates...</p>
                        <p className="text-slate-400 text-sm mt-0.5">Connecting to GitHub repository</p>
                     </div>
                  </div>
               )}

               {updateError && (
                  <div className="p-4 bg-red-950/20 border border-red-800/40 rounded-md flex items-start gap-3 animate-fade-in">
                     <div className="h-8 w-8 rounded-full bg-red-900/30 flex-shrink-0 flex items-center justify-center mt-0.5">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                     </div>
                     <div>
                        <p className="text-red-200 font-medium">Update check failed</p>
                        <p className="text-slate-400 text-sm mt-1.5">{updateError}</p>
                        <button
                           onClick={handleCheckForUpdates}
                           className="mt-3 text-xs flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors"
                        >
                           <RefreshCw className="h-3 w-3" />
                           Try again
                        </button>
                     </div>
                  </div>
               )}

               {!updateError && updateInfo && !checkingForUpdates && (
                  <div className={`p-4 ${updateInfo.shouldUpdate ? 'bg-indigo-950/20 border border-indigo-800/40' : 'bg-emerald-950/20 border border-emerald-800/40'} rounded-md flex gap-3 animate-fade-in`}>
                     {updateInfo.shouldUpdate ? (
                        <>
                           <div className="h-10 w-10 rounded-full bg-indigo-900/30 flex-shrink-0 flex items-center justify-center">
                              <Download className="h-5 w-5 text-indigo-400" />
                           </div>
                           <div>
                              <div className="flex items-center gap-2">
                                 <p className="text-indigo-200 font-medium">Update available</p>
                                 <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-300 text-xs rounded-full border border-indigo-700/40">
                                    v{updateInfo.version}
                                 </span>
                              </div>

                              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                                 <span className="px-2 py-0.5 bg-gray-800/80 rounded text-slate-300 border border-gray-700/60">
                                    Current: v{currentVersion}
                                 </span>
                                 <ArrowRight className="h-3 w-3" />
                                 <span className="px-2 py-0.5 bg-indigo-900/30 rounded text-indigo-300 border border-indigo-700/40">
                                    Latest: v{updateInfo.version}
                                 </span>
                                 <span className="px-1.5 py-0.5 bg-purple-900/30 rounded text-purple-300 border border-purple-700/40">
                                    {updateInfo.branch}
                                 </span>
                              </div>

                              <p className="text-slate-400 text-sm mt-2"> A new version is available. Please update to benefit from the latest enhancements.</p>

                              <button
                                 onClick={handleDownloadUpdate}
                                 className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 rounded-md 
                           transition-all duration-200 text-sm border border-indigo-500/30 hover:shadow-md hover:shadow-indigo-900/20"
                              >
                                 <Download className="h-4 w-4" />
                                 Download Update
                              </button>
                           </div>
                        </>
                     ) : (
                        <>
                           <div className="h-10 w-10 rounded-full bg-emerald-900/30 flex-shrink-0 flex items-center justify-center">
                              <Check className="h-5 w-5 text-emerald-400" />
                           </div>
                           <div>
                              <p className="text-emerald-200 font-medium">You're up to date!</p>

                              <div className="mt-2 flex items-center gap-2 text-xs">
                                 <span className="px-2 py-0.5 bg-emerald-900/30 rounded text-emerald-300 border border-emerald-700/40">
                                    v{currentVersion}
                                 </span>
                                 <span className="px-1.5 py-0.5 bg-purple-900/30 rounded text-purple-300 border border-purple-700/40">
                                    {versionBranch}
                                 </span>
                              </div>

                              <p className="text-slate-400 text-sm mt-2">You're running the latest version of Showcase Studio.</p>

                              <p className="mt-3 text-xs flex items-center gap-1.5 text-slate-400">
                                 <Clock className="h-3 w-3 text-emerald-400" />
                                 Last checked: {new Date().toLocaleTimeString()}
                              </p>
                           </div>
                        </>
                     )}
                  </div>
               )}
            </div>
         </div>

         <div className="p-6 bg-gray-800/40 rounded-lg border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10">
            <h4 className="text-lg font-medium text-slate-200 mb-4">Application Details</h4>
            <div className="space-y-3">
               <div className="flex justify-between items-center py-2 border-b border-gray-700/40 group hover:bg-gray-800/30 px-2 rounded transition-colors">
                  <span className="text-slate-400">Version</span>
                  <div className="flex items-center gap-2">
                     <span className="font-medium text-slate-100 bg-indigo-900/30 px-2 py-0.5 rounded text-xs border border-indigo-700/40">v{currentVersion} ({versionBranch})</span>
                     <button
                        onClick={() => handleCopy(currentVersion, "version")}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 hover:text-indigo-300 rounded-full hover:bg-indigo-900/30"
                     >
                        {copiedInfo === "version" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                     </button>
                  </div>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-gray-700/40 group hover:bg-gray-800/30 px-2 rounded transition-colors">
                  <span className="text-slate-400">Build Date</span>
                  <div className="flex items-center gap-2">
                     <span className="font-medium text-slate-100">April 18, 2025</span>
                     <button
                        onClick={() => handleCopy("April 18, 2025", "buildDate")}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 hover:text-indigo-300 rounded-full hover:bg-indigo-900/30"
                     >
                        {copiedInfo === "buildDate" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                     </button>
                  </div>
               </div>
               <div className="flex justify-between items-center py-2 group hover:bg-gray-800/30 px-2 rounded transition-colors">
                  <span className="text-slate-400">Developed by</span>
                  <div className="flex items-center gap-2">
                     <span className="font-medium text-slate-100">Megalith</span>
                     <button
                        onClick={() => handleCopy("Megalith", "developer")}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 hover:text-indigo-300 rounded-full hover:bg-indigo-900/30"
                     >
                        {copiedInfo === "developer" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                     </button>
                  </div>
               </div>
            </div>
         </div>

         <div className="p-6 bg-gray-800/40 rounded-lg border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10">
            <h4 className="text-lg font-medium text-slate-200 mb-4">Links</h4>
            <div className="space-y-1">
               <a
                  href="https://github.com/MegalithOfficial/Showcase-Studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2.5 text-indigo-400 hover:text-indigo-300 rounded-md hover:bg-indigo-900/20 transition-all border border-transparent hover:border-indigo-800/30"
               >
                  <div className="flex items-center gap-2">
                     <Github className="h-4 w-4" />
                     <span>GitHub Repository</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-indigo-500/50" />
               </a>
            </div>
         </div>

         <div className="p-6 bg-gray-800/40 rounded-lg border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10">
            <h4 className="text-lg font-medium text-slate-200 mb-4">License</h4>
            <div className="flex justify-between items-center">
               <p className="text-sm text-slate-400">
                  © 2025 Showcase Studio. All rights reserved.
               </p>
               <button
                  onClick={() => handleCopy("© 2025 Megalith. All rights reserved.", "license")}
                  className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded transition-colors"
               >
                  {copiedInfo === "license" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
               </button>
            </div>
         </div>
      </div>
   );
};