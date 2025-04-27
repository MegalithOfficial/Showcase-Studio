import React, { useEffect, useState, useCallback } from 'react';
import {
   HardDrive, Trash2, Database, FileStack, BarChart, Copy, Check,
   AlertTriangle, Settings, Loader2, Clock, X, ArrowRight
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { StorageUsage } from '../../utils/types';
import Logger from '../../utils/log';

const formatBytesToMB = (bytes: number, decimals: number = 2): string => {
   if (!bytes || bytes === 0) return '0.00 MB';
   const megabytes = bytes / (1024 * 1024);
   const fixedDecimals = decimals < 0 ? 0 : decimals;
   return megabytes.toFixed(fixedDecimals);
};

const getBaseGB = (totalBytes: number): number => {
   const gb = 1024 * 1024 * 1024;
   if (totalBytes <= gb) return gb;
   if (totalBytes <= 5 * gb) return 5 * gb;
   if (totalBytes <= 10 * gb) return 10 * gb;
   if (totalBytes <= 15 * gb) return 15 * gb;
   return Math.ceil(totalBytes / (5 * gb)) * (5 * gb);
};

const calcPercent = (valueBytes: number, totalBytes: number): string => {
   if (!totalBytes || totalBytes === 0) return '0%';
   const base = getBaseGB(totalBytes);
   const percent = Math.min(100, (valueBytes / base) * 100);
   return percent.toFixed(2) + '%';
};

export const DataStorageSection: React.FC = () => {
   const [isLoading, setIsLoading] = useState(true); 
   const [isClearingCache, setIsClearingCache] = useState(false);
   const [isCleaningData, setIsCleaningData] = useState(false);
   const [isResetting, setIsResetting] = useState(false);

   const [storageInfo, setStorageInfo] = useState<StorageUsage | null>(null);

   const [copiedPath, setCopiedPath] = useState(false);
   const [showResetConfirm, setShowResetConfirm] = useState(false);
   const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
   const [refreshTrigger, setRefreshTrigger] = useState(0); 

   const fetchData = useCallback(async () => {
      setIsLoading(true);
      setOperationStatus(null);
      try {
         const filesizes = await invoke<StorageUsage>("get_storage_usage");
         setStorageInfo(filesizes);
      } catch (error) {
         Logger.error("Failed to fetch storage usage:", error);
         setOperationStatus({ type: 'error', message: 'Failed to load storage data.' });
         setStorageInfo(null);
      } finally {
         setIsLoading(false);
      }
   }, []); 

   useEffect(() => {
      fetchData();
   }, [fetchData, refreshTrigger]); 

   const handleCopy = () => {
      if (!storageInfo?.database_path) return;
      navigator.clipboard.writeText(storageInfo.database_path);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
   };

   const handleClearCache = async () => {
      if (isClearingCache) return;
      setIsClearingCache(true);
      setOperationStatus(null);
      try {
         Logger.info("Simulating invoke: clear_image_cache");
         await invoke("clear_image_cache");
         setOperationStatus({ type: 'success', message: 'Cache cleared successfully.' });
         setRefreshTrigger(prev => prev + 1);
         setTimeout(() => setOperationStatus(null), 5000);
      } catch (error) {
         Logger.error("Clear cache failed:", error);
         setOperationStatus({ type: 'error', message: 'Failed to clear cache.' });
      } finally {
         setIsClearingCache(false);
      }
   };

   const handleCleanOldData = async () => {
      if (isCleaningData) return;
      setIsCleaningData(true);
      setOperationStatus(null);
      try {
         Logger.info("Simulating invoke: clean_old_data");
         await invoke("clean_old_data");
         setOperationStatus({ type: 'success', message: 'Old data removed successfully.' });
         setRefreshTrigger(prev => prev + 1);
         setTimeout(() => setOperationStatus(null), 5000);
      } catch (error) {
         Logger.error("Clean old data failed:", error);
         setOperationStatus({ type: 'error', message: 'Failed to clean old data.' });
      } finally {
         setIsCleaningData(false);
      }
   };


   const handleReset = async () => {
      if (isResetting) return;
      setIsResetting(true);
      setOperationStatus(null);
      try {
         Logger.info("Simulating invoke: reset_application_data");
         await invoke("reset_application_data");
         setOperationStatus({ type: 'success', message: 'Application data reset successfully.' });
         setRefreshTrigger(prev => prev + 1);
         setTimeout(() => setOperationStatus(null), 7000);
      } catch (error) {
         Logger.error("Reset failed:", error);
         setOperationStatus({ type: 'error', message: 'Failed to reset application data.' });
      } finally {
         setIsResetting(false);
         setShowResetConfirm(false); 
      }
   };


   const dbSizeMB = formatBytesToMB(storageInfo?.database_size_bytes ?? 0);
   const cacheSizeMB = formatBytesToMB(storageInfo?.image_cache_size_bytes ?? 0);
   const totalSizeMB = formatBytesToMB(storageInfo?.total_size_bytes ?? 0);
   const dbSizeBytes = storageInfo?.database_size_bytes ?? 0;
   const cacheSizeBytes = storageInfo?.image_cache_size_bytes ?? 0;
   const totalSizeBytes = storageInfo?.total_size_bytes ?? 0;
   const dbPath = storageInfo?.database_path ?? 'Loading...';

   const dbPercent = calcPercent(dbSizeBytes, totalSizeBytes);
   const cachePercent = calcPercent(cacheSizeBytes, totalSizeBytes);

   const cardBaseClass = "p-6 rounded-lg border backdrop-blur-sm transition-all duration-200 shadow-lg shadow-black/10";

   const buttonBaseClass = "flex items-center gap-3 px-4 py-2.5 w-full text-sm font-medium rounded-md border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
   const indigoButtonClass = "text-indigo-300 bg-indigo-900/30 border-indigo-700/40 hover:bg-indigo-900/50 hover:border-indigo-600/60 disabled:hover:bg-indigo-900/30";
   const redButtonClass = "text-red-300 bg-red-900/30 border-red-700/40 hover:bg-red-900/50 hover:border-red-600/60 disabled:hover:bg-red-900/30";

   return (
      <div className="space-y-6">
         {/* Header */}
         <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
               <HardDrive className="h-6 w-6 text-indigo-400" />
               Data & Storage
            </h2>
            {isLoading && <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />}
         </div>

         {/* Operation Status Message */}
         {operationStatus && (
            <div className={`
                    text-sm mb-4 p-4 border rounded-lg backdrop-blur-sm shadow-lg shadow-black/10 animate-fadeIn flex items-center gap-3
                    ${operationStatus.type === 'success' ? 'bg-green-900/30 border-green-700/50 text-green-300' : 'bg-red-900/30 border-red-700/50 text-red-300'}
                `}>
               <div className={`
                        flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full border
                        ${operationStatus.type === 'success' ? 'bg-green-900/50 border-green-700/50' : 'bg-red-900/50 border-red-700/50'}
                    `}>
                  {operationStatus.type === 'success' ? <Check className="h-4 w-4 text-green-400" /> : <AlertTriangle className="h-4 w-4 text-red-400" />}
               </div>
               <div>
                  <p className="font-medium mb-0.5">{operationStatus.type === 'success' ? 'Success' : 'Error'}</p>
                  <p className={`${operationStatus.type === 'success' ? 'text-green-300/90' : 'text-red-300/90'}`}>
                     {operationStatus.message}
                  </p>
               </div>
               <button onClick={() => setOperationStatus(null)} className="ml-auto p-1 rounded-md hover:bg-white/10">
                  <X className="h-4 w-4" />
               </button>
            </div>
         )}

         {/* --- Database Location Card --- */}
         <div className={`${cardBaseClass} bg-gray-800/40 border-gray-700/60 hover:border-gray-600/80`}>
            <h3 className="text-base font-medium text-slate-200 mb-4 flex items-center gap-2">
               <Database className="h-5 w-5 text-indigo-400" />
               Database Location
            </h3>
            <div className="flex items-center gap-3">
               <p className="text-xs text-slate-400 truncate flex-1 font-mono" title={dbPath}>
                  {dbPath}
               </p>
               <button
                  onClick={handleCopy}
                  disabled={!storageInfo?.database_path || copiedPath}
                  className="p-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors rounded-md hover:bg-indigo-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Copy database path"
               >
                  {copiedPath ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
               </button>
            </div>
         </div>

         {/* Storage Statistics Card */}
         <div className={`${cardBaseClass} bg-gray-800/40 border-gray-700/60 hover:border-gray-600/80`}>
            <h3 className="text-base font-medium text-slate-200 mb-4 flex items-center gap-2">
               <BarChart className="h-5 w-5 text-indigo-400" />
               Storage Statistics
            </h3>
            <div className="space-y-5">
               {/* Stat Bar: Database */}
               <div>
                  <div className="flex justify-between text-sm mb-2 items-center">
                     <span className="text-slate-400 flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5 text-indigo-400" /> Database Size
                     </span>
                     <span className="text-slate-200 bg-indigo-900/30 px-2 py-0.5 rounded text-xs border border-indigo-700/40 font-mono">
                        {dbSizeMB} MB
                     </span>
                  </div>
                  <div className="h-2 bg-gray-700/80 rounded-full overflow-hidden shadow-inner shadow-black/20">
                     <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500 ease-out"
                        style={{ width: dbPercent }}
                        aria-label={`Database usage: ${dbPercent} MB`}
                     ></div>
                  </div>
               </div>
               {/* Stat Bar: Cache */}
               <div>
                  <div className="flex justify-between text-sm mb-2 items-center">
                     <span className="text-slate-400 flex items-center gap-1.5">
                        <FileStack className="h-3.5 w-3.5 text-indigo-400" /> Cached Files
                     </span>
                     <span className="text-slate-200 bg-indigo-900/30 px-2 py-0.5 rounded text-xs border border-indigo-700/40 font-mono">
                        {cacheSizeMB} MB
                     </span>
                  </div>
                  <div className="h-2 bg-gray-700/80 rounded-full overflow-hidden shadow-inner shadow-black/20">
                     <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500 ease-out"
                        style={{ width: cachePercent }}
                        aria-label={`Cache usage: ${cachePercent} MB`}
                     ></div>
                  </div>
               </div>
               {/* Total */}
               <div className="pt-4 flex justify-between items-center text-sm text-slate-400 border-t border-gray-700/60">
                  <span className="font-medium">Total Storage Used</span>
                  <span className="font-medium text-slate-200 bg-indigo-900/40 px-2.5 py-1 rounded text-xs border border-indigo-700/50 font-mono">
                     {totalSizeMB} MB
                  </span>
               </div>
            </div>
         </div>

         {/* Management Tools Card */}
         <div className={`${cardBaseClass} bg-gray-800/40 border-gray-700/60 hover:border-gray-600/80`}>
            <h3 className="text-base font-medium text-slate-200 mb-4 flex items-center gap-2">
               <Settings className="h-5 w-5 text-indigo-400" />
               Management Tools
            </h3>
            <div className="space-y-3">
               {/* Clear Cache Button */}
               <button
                  onClick={handleClearCache}
                  disabled={isClearingCache || isCleaningData || isResetting || cacheSizeBytes === 0}
                  className={`${buttonBaseClass} ${indigoButtonClass}`}
               >
                  <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center">
                     {isClearingCache ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </div>
                  <div className="flex-grow text-left">Clear Image Cache</div>
                  <span className="text-xs text-indigo-400/70">Free up {cacheSizeMB} MB</span>
               </button>

               {/* Clean Old Data Button */}
               <button
                  onClick={handleCleanOldData}
                  disabled={isClearingCache || isCleaningData || isResetting}
                  className={`${buttonBaseClass} ${indigoButtonClass}`}
               >
                  <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center">
                     {isCleaningData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                  </div> 
                  <div className="flex-grow text-left">Clean-up Old Data</div>
                  <span className="text-xs text-indigo-400/70">Entries <ArrowRight className="h-3 w-3 inline-block" /> 30 days</span>
               </button>

            </div>
            <p className="text-xs text-slate-400/80 mt-4">
               These actions help maintain optimal performance. Data will refresh automatically after completion.
            </p>
         </div>

         {/* Danger Zone Card */}
         <div className={`${cardBaseClass} bg-red-900/20 border-red-700/40 hover:border-red-600/60`}>
            <h3 className="text-base font-medium text-slate-200 mb-4 flex items-center gap-2">
               <AlertTriangle className="h-5 w-5 text-red-400" />
               Danger Zone
            </h3>
            {!showResetConfirm ? (
               <div className="space-y-3">
                  <button
                     onClick={() => setShowResetConfirm(true)}
                     disabled={isClearingCache || isCleaningData || isResetting}
                     className={`${buttonBaseClass} ${redButtonClass}`}
                  >
                     <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center">
                        <Trash2 className="h-4 w-4" />
                     </div>
                     <div className="flex-grow text-left">Reset Application Data</div>
                  </button>
                  <p className="text-xs text-red-400/70 mt-1">
                     This action permanently deletes all indexed data, cache, and settings. It cannot be undone.
                  </p>
               </div>
            ) : (
               <div className="space-y-4">
                  <div className="p-4 bg-red-900/40 border border-red-700/50 rounded-lg">
                     <p className="text-sm font-medium text-red-200">Are you absolutely sure?</p>
                     <p className="text-sm text-red-300/90 mt-1">
                        This will permanently delete everything and cannot be recovered.
                     </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                     <button
                        onClick={handleReset}
                        disabled={isResetting}
                        className="flex-1 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600/90 rounded-md hover:bg-red-700/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                     >
                        {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Yes, Reset Everything
                     </button>
                     <button
                        onClick={() => setShowResetConfirm(false)}
                        disabled={isResetting}
                        className="flex-1 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-gray-700/80 rounded-md hover:bg-gray-600/80 border border-gray-600/80 transition-colors disabled:opacity-60"
                     >
                        Cancel
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};