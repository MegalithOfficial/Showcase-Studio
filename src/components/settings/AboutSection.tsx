import React, { useState } from 'react';
import { Info, Github, ExternalLink, Laptop, Copy, Check, Clapperboard } from 'lucide-react';

export const AboutSection: React.FC = () => {
   const [copiedInfo, setCopiedInfo] = useState<string | null>(null);

   const handleCopy = (value: string, key: string) => {
      navigator.clipboard.writeText(value);
      setCopiedInfo(key);
      setTimeout(() => setCopiedInfo(null), 2000);
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

         <div className="p-6 bg-gray-800/40 rounded-lg border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10">
            <h4 className="text-lg font-medium text-slate-200 mb-4">Application Details</h4>
            <div className="space-y-3">
               <div className="flex justify-between items-center py-2 border-b border-gray-700/40 group hover:bg-gray-800/30 px-2 rounded transition-colors">
                  <span className="text-slate-400">Version</span>
                  <div className="flex items-center gap-2">
                     <span className="font-medium text-slate-100 bg-indigo-900/30 px-2 py-0.5 rounded text-xs border border-indigo-700/40">0.1.0 (Beta)</span>
                     <button
                        onClick={() => handleCopy("0.1.0", "version")}
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
                  href="#"
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