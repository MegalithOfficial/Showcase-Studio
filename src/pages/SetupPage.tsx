import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
   Bot,
   Route,
   Clapperboard,
   ArrowRight,
   Server,
   Hash,
   X,
   Loader2
} from 'lucide-react';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import toast from 'react-hot-toast';

import { HeadlessFloatingSelect, SelectOption } from '../components/ui/CustomSelect';
import Logger from '../utils/log';

interface SerializableGuild {
   id: string;
   name: string;
   icon: string | null;
}

interface DiscordChannel {
   id: string;
   name: string;
   topic: string;
   position: number;
   parent_id: string;
   parent_name: string;
}

const BackgroundBlob: React.FC<{
   className?: string;
   animateProps: any;
}> = ({ className = '', animateProps }) => {
   return (
      <motion.div
         className={`absolute rounded-full filter blur-3xl opacity-30 ${className} -z-10`}
         {...animateProps}
      />
   );
};

const LoadingOverlay: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
   <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-xl">
      <Loader2 className="h-8 w-8 text-purple-400 animate-spin mb-3" />
      <p className="text-gray-300 text-sm">{message}</p>
   </div>
);

const SetupPage: React.FC = () => {
   const [currentStep, setCurrentStep] = useState<number>(1);
   const navigate = useNavigate();

   const [discordToken, setDiscordToken] = useState<string>('');
   const [openRouterKey, setOpenRouterKey] = useState<string>('');
   const [isSaving, setIsSaving] = useState<boolean>(false);
   const [servers, setServers] = useState<SerializableGuild[]>([]);
   const [selectedServer, setSelectedServer] = useState<SerializableGuild | null>(null);
   const [channels, setChannels] = useState<DiscordChannel[]>([]);
   const [selectedChannels, setSelectedChannels] = useState<DiscordChannel[]>([]);
   const [isLoadingServers, setIsLoadingServers] = useState<boolean>(false);
   const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(false);
   const [isFinishing, setIsFinishing] = useState<boolean>(false);
   const [indexingStatus, setIndexingStatus] = useState<string | null>(null);

   useEffect(() => {
      if (currentStep === 2) {
         const fetchServers = async () => {
            setIsLoadingServers(true);
            setServers([]);
            setSelectedServer(null);
            setChannels([]);
            setSelectedChannels([]);

            try {
               Logger.info("Fetching Discord Servers...");
               const fetchedServers = await invoke<SerializableGuild[]>('fetch_discord_guilds');

               if (fetchedServers.length === 0) {
                  toast.error("No Discord servers found. Make sure your bot has been added to at least one server.");
               }

               setServers(fetchedServers);
            } catch (err) {
               Logger.error("Failed to fetch servers:", err);
               toast.error(`Failed to load servers: ${err instanceof Error ? err.message : String(err)}`);
               setCurrentStep(1);
            } finally {
               setIsLoadingServers(false);
            }
         };
         fetchServers();
      }
   }, [currentStep]);

   const fetchChannels = useCallback(async (serverId: string) => {
      if (!serverId) return;
      setIsLoadingChannels(true);
      setChannels([]);
      
      try {
         Logger.info("Fetching Discord Channels for server:", serverId);
         const fetchedChannels = await invoke<DiscordChannel[]>('get_discord_channels', { guildIdStr: serverId });

         if (fetchedChannels.length === 0) {
            toast.error("No text channels found in this server.");
         }

         setChannels(fetchedChannels);
      } catch (err) {
         Logger.error("Failed to fetch channels:", err);
         toast.error(`Failed to load channels: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
         setIsLoadingChannels(false);
      }
   }, []);

   useEffect(() => {
      let unlistenStatus: (() => void) | null = null;
      let unlistenProgress: (() => void) | null = null;
      let unlistenComplete: (() => void) | null = null;
      let unlistenError: (() => void) | null = null;

      if (currentStep === 3) {
         setIndexingStatus("Initializing indexing process...");

         const startIndexing = async () => {
            try {

               unlistenStatus = await listen<string>('indexing-status', (event) => {
                  Logger.info("Indexing status:", event.payload);
                  setIndexingStatus(event.payload);
               });

               unlistenProgress = await listen<string>('indexing-progress', (event) => {
                  Logger.info("Indexing progress:", event.payload);
                  setIndexingStatus(`Progress: ${event.payload}`);
               });

               unlistenComplete = await listen<string>('indexing-complete', (event) => {
                 Logger.info("Indexing complete:", event.payload);
                  setIndexingStatus(event.payload);
                  setTimeout(() => {
                     window.location.reload();
                     navigate('/');
                  }, 2000);
               });

               unlistenError = await listen<string>('indexing-error', (event) => {
                  Logger.error("Indexing error:", event.payload);
                  toast.error(event.payload);
                  setIndexingStatus("An error occurred during indexing.");
               });

               Logger.info("Starting to index...");
               await invoke('start_initial_indexing');
               setIndexingStatus("Indexing started, fetching messages...");
               Logger.success("Indexxed Succesfully.");

            } catch (err) {
               Logger.error("Failed to invoke start_initial_indexing:", err);
               const errorMsg = err instanceof Error ? err.message : String(err);
               toast.error(`Failed to start indexing process: ${errorMsg}`);
               setIndexingStatus("Failed to start indexing.");
               unlistenStatus?.();
               unlistenProgress?.();
               unlistenComplete?.();
               unlistenError?.();
            }
         };

         startIndexing();
      }

      return () => {
         Logger.info("Cleaning up indexing listeners... (Setup Page)");
         unlistenStatus?.();
         unlistenProgress?.();
         unlistenComplete?.();
         unlistenError?.();
      };
   }, [currentStep, navigate]);


   const handleInitialSave = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      
      if (!discordToken) {
         toast.error('Discord Bot Token is required.');
         return;
      }
      
      setIsSaving(true);

      try {
         await invoke('save_secret', {
            keyName: "discordBotToken",
            secret: discordToken
         });
         await invoke('save_secret', {
            keyName: "openRouterApiKey",
            secret: openRouterKey || ''
         });

         Logger.info('Configuration saved successfully.');
         setIsSaving(false);
         setCurrentStep(2);
      } catch (err) {
         Logger.error("Failed to save configuration:", err);
         toast.error(`Failed to save configuration: ${err instanceof Error ? err.message : String(err)}`);
         setIsSaving(false);
      }
   };

   const handleServerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const serverId = event.target.value;
      const server = servers.find(s => s.id === serverId) || null;
      setSelectedServer(server);
      setSelectedChannels([]);
      setChannels([]);
      if (server) {
         fetchChannels(server.id);
      } else {
         setIsLoadingChannels(false);
      }
   };

   const handleAddChannel = useCallback((channelId: string | null) => {
      if (!channelId) return;

      const channelToAdd = channels.find(c => c.id === channelId);
      const alreadySelected = selectedChannels.some(sc => sc.id === channelId);

      if (channelToAdd && !alreadySelected) {
         Logger.info('handleAddChannel: Adding channel to state:', channelToAdd.name);
         setSelectedChannels(prev => [...prev, channelToAdd].sort((a, b) => a.position - b.position));
      } else {
         Logger.warn('handleAddChannel: Channel not found or already added.');
      }
   }, [channels, selectedChannels]);

   const removeSelectedChannel = (channelId: string) => {
      setSelectedChannels(prev => prev.filter(c => c.id !== channelId));
   };

   const channelOptions = useMemo((): SelectOption[] => {
      return channels.map(channel => ({
         value: channel.id,
         label: channel.name,
         secondaryLabel: channel.parent_name || undefined,
         icon: <Hash className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />,
      }));
   }, [channels]);

   const handleFinish = async () => {
      setIsFinishing(true);
      
      if (!selectedServer) {
         toast.error("Please select a server.");
         setIsFinishing(false);
         return;
      }
      
      if (selectedChannels.length === 0) {
         toast.error("Please select at least one channel.");
         setIsFinishing(false);
         return;
      }
      
      try {
         const serverIdToSave = selectedServer.id;
         const channelIdsToSave = selectedChannels.map(c => c.id);

         Logger.info("Saving configuration before finishing:", { serverId: serverIdToSave, channelIds: channelIdsToSave });

         await invoke('set_configuration', {
            serverId: serverIdToSave,
            channelIds: channelIdsToSave,
            isSetupComplete: true
         });
         Logger.success("Configuration saved successfully.");
         
         setCurrentStep(3);
      } catch (err) {
         Logger.error("Failed to save configuration:", err);
         toast.error(`Failed to save settings: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
         setIsFinishing(false);
      }
   };

   const leftVariants = {
      hidden: { x: -100, opacity: 0 },
      visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 50, damping: 20, duration: 0.8 } },
      exit: { x: -100, opacity: 0, transition: { duration: 0.3 } }
   };

   const rightVariants = {
      hidden: { x: 100, opacity: 0 },
      visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 50, damping: 20, duration: 0.8, delay: 0.1 } },
      exit: { x: 100, opacity: 0, transition: { duration: 0.3 } }
   };

   const blobAnimation1 = {
      animate: {
         scale: [1, 1.15, 1],
         opacity: [0.3, 0.4, 0.3],
         x: ['0%', '5%', '0%'],
         y: ['0%', '-10%', '0%'],
      },
      transition: {
         duration: 15,
         repeat: Infinity,
         repeatType: 'reverse',
         ease: 'easeInOut',
      } as const,
   };

   const blobAnimation2 = {
      animate: {
         scale: [1, 1.1, 1.05, 1],
         opacity: [0.25, 0.35, 0.3, 0.25],
         x: ['0%', '-8%', '3%', '0%'],
         y: ['0%', '6%', '-4%', '0%'],
      },
      transition: {
         duration: 20,
         repeat: Infinity,
         repeatType: 'reverse',
         ease: 'easeInOut',
      } as const,
   };
   const blobAnimation3 = {
      animate: {
         scale: [1, 1.08, 1],
         opacity: [0.35, 0.45, 0.35],
         x: ['0%', '10%', '-5%', '0%'],
         y: ['0%', '-12%', '4%', '0%'],
      },
      transition: {
         duration: 18,
         repeat: Infinity,
         repeatType: 'reverse',
         ease: 'easeInOut',
         delay: 2,
      } as const,
   };

   const renderStepContent = () => {
      switch (currentStep) {
         case 1:
            return (
               <motion.div
                  key="step1"
                  className="relative w-full lg:w-1/2 flex justify-center lg:justify-start z-10"
                  variants={rightVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
               >
                  <div className="w-full max-w-md bg-gray-800/60 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-700/60">
                     <h2 className="text-2xl font-semibold text-gray-200 mb-6 text-center lg:text-left">
                        App Configuration
                     </h2>
                     
                     <form onSubmit={handleInitialSave} className="space-y-6">
                        {/* Discord Token Input */}
                        <div>
                           <label htmlFor="discordToken" className="block text-sm font-medium text-gray-300 mb-1.5">
                              Discord Bot Token <span className="text-red-500">*</span>
                           </label>
                           <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-purple-400">
                                 <Bot className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors duration-200" />
                              </div>
                              <input
                                 type="password"
                                 id="discordToken"
                                 value={discordToken}
                                 onChange={(e) => setDiscordToken(e.target.value)}
                                 required
                                 disabled={isSaving}
                                 className="block w-full pl-10 pr-3 py-2.5 bg-gray-900/70 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out"
                                 placeholder="Paste your Bot Token here"
                              />
                           </div>
                           <p className="mt-1.5 text-xs text-gray-500">Required. Found in your Discord Developer Portal.</p>
                        </div>
                        {/* OpenRouter Key Input */}
                        <div>
                           <label htmlFor="openRouterKey" className="block text-sm font-medium text-gray-300 mb-1.5">
                              OpenRouter API Key <span className='text-gray-500 text-xs'>(Optional)</span>
                           </label>
                           <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                 <Route className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-400 transition-colors duration-200" />
                              </div>
                              <input
                                 type="password"
                                 id="openRouterKey"
                                 value={openRouterKey}
                                 onChange={(e) => setOpenRouterKey(e.target.value)}
                                 disabled={isSaving}
                                 className="block w-full pl-10 pr-3 py-2.5 bg-gray-900/70 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                                 placeholder="sk-or-..."
                              />
                           </div>
                           <p className="mt-1.5 text-xs text-gray-500">Optional. For potential future AI features.</p>
                        </div>
                        {/* Save Button */}
                        <div>
                           <button
                              type="submit"
                              disabled={isSaving || !discordToken}
                              className={`w-full flex justify-center items-center py-3 px-4 mt-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isSaving || !discordToken ? 'bg-gray-600 cursor-not-allowed opacity-70' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500'} transition-all duration-150 ease-in-out group`}
                           >
                              {isSaving ? (
                                 <>
                                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                                    Saving...
                                 </>
                              ) : (
                                 <>
                                    Save & Continue
                                    <ArrowRight className="h-5 w-5 ml-2 transform transition-transform duration-200 ease-in-out group-hover:translate-x-1" />
                                 </>
                              )}
                           </button>
                        </div>
                     </form>
                  </div>
               </motion.div>
            );

         case 2:
            return (
               <motion.div
                  key="step2"
                  className="relative w-full lg:w-1/2 flex justify-center lg:justify-start z-10"
                  variants={rightVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
               >
                  <div className="relative w-full max-w-md bg-gray-800/60 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-700/60 overflow-hidden">
                     {(isLoadingServers || isLoadingChannels) && (
                        <LoadingOverlay message={isLoadingServers ? "Loading servers..." : "Loading channels..."} />
                     )}
                     <h2 className="text-2xl font-semibold text-gray-200 mb-6 text-center lg:text-left">
                        Select Showcase Channels
                     </h2>

                     <div className="space-y-6">
                        {/* Server Select */}
                        <div>
                           <label htmlFor="serverSelect" className="block text-sm font-medium text-gray-300 mb-1.5">
                              Select Server
                           </label>
                           <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                 <Server className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors duration-200" />
                              </div>
                              <select
                                 id="serverSelect"
                                 value={selectedServer?.id || ''}
                                 onChange={handleServerChange}
                                 disabled={isLoadingServers || isLoadingChannels}
                                 className={`block w-full pl-10 pr-8 py-2.5 bg-gray-900/70 border border-gray-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-purple-500 focus:border-purple-500 sm:text-sm appearance-none transition duration-150 ease-in-out ${!selectedServer ? 'text-gray-500' : 'text-white'}`}
                              >
                                 <option value="" disabled className="text-gray-500">-- Select a Server --</option>
                                 {servers.map(server => (
                                    <option key={server.id} value={server.id} className="text-white bg-gray-800">
                                       {server.name}
                                    </option>
                                 ))}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                 <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                              </div>
                           </div>
                        </div>

                        {/* Channel Select  */}
                        <div>
                           <label htmlFor="channelSelect" className="block text-sm font-medium text-gray-300 mb-1.5">
                              Add Channels to Index 
                           </label>
                           <HeadlessFloatingSelect
                              options={channelOptions}
                              value={null}
                              onChange={handleAddChannel} 
                              placeholder={
                                 !selectedServer ? "-- Select Server First --"
                                    : isLoadingChannels ? "Loading channels..."
                                       : channels.length === 0 ? "-- No Text Channels Found --"
                                          : "-- Add a Channel --"
                              }
                              disabled={!selectedServer || isLoadingChannels}
                              loading={isLoadingChannels}
                              listClassName="max-h-48" 
                           />
                        </div>

                        {/* Selected Channels List */}
                        {selectedChannels.length > 0 && (
                           <div className="mt-4 pt-4 border-t border-gray-700/50">
                              <p className="text-sm font-medium text-gray-300 mb-2">Channels to Index:</p>
                              <div className="flex flex-wrap gap-2">
                                 <AnimatePresence> 
                                    {selectedChannels.map(channel => (
                                       <motion.div
                                          key={channel.id}
                                          layout
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.8 }}
                                          transition={{ duration: 0.15 }}
                                          className="flex items-center bg-gray-700/80 text-slate-200 text-sm pl-2.5 pr-1.5 py-1 rounded-full"
                                       >
                                          <Hash className="w-3 h-3 mr-1.5 opacity-70" />
                                          <span>{channel.name}</span>
                                          {/* Display category */}
                                          {channel.parent_name && <span className='text-xs text-slate-400 ml-1.5 opacity-80'>({channel.parent_name})</span>}
                                          <button
                                             type="button"
                                             onClick={() => removeSelectedChannel(channel.id)}
                                             className="ml-2 text-slate-400 hover:text-red-400 hover:bg-gray-600/50 p-0.5 rounded-full focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                                             aria-label={`Remove ${channel.name}`}
                                          >
                                             <X className="w-3.5 h-3.5" />
                                          </button>
                                       </motion.div>
                                    ))}

                                 </AnimatePresence>
                              </div>
                           </div>
                        )}

                        {/* Finish Button */}
                        <div>
                           <button
                              type="button"
                              onClick={handleFinish}
                              disabled={!selectedServer || selectedChannels.length === 0 || isLoadingServers || isLoadingChannels || isFinishing}
                              className={`w-full flex justify-center items-center py-3 px-4 mt-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${(!selectedServer || selectedChannels.length === 0 || isLoadingServers || isLoadingChannels || isFinishing) ? 'bg-gray-600 cursor-not-allowed opacity-70' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500'} transition-all duration-150 ease-in-out group`}
                           >
                              {isFinishing ? (
                                 <> <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" /> Finishing... </>
                              ) : (
                                 <> Finish Setup <ArrowRight className="h-5 w-5 ml-2 transform transition-transform duration-200 ease-in-out group-hover:translate-x-1" /> </>
                              )}
                           </button>
                        </div>
                     </div>
                  </div>
               </motion.div>
            );

         case 3:
            return (
               <motion.div
                  key="step3"
                  className="relative w-full lg:w-1/2 flex justify-center lg:justify-start z-10"
                  variants={rightVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
               >
                  <div className="w-full max-w-md bg-gray-800/60 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-700/60 flex flex-col items-center justify-center text-center min-h-[16rem]">
                     <Loader2 className="h-12 w-12 text-purple-400 animate-spin mb-5" />
                     <h2 className="text-xl font-semibold text-gray-200 mb-2">
                        Indexing Messages...
                     </h2>
                     <p className="text-gray-400 text-sm px-4 leading-relaxed">
                        {indexingStatus || "Please wait while we gather the initial data."}
                     </p>
                  </div>
               </motion.div>
            );
         default:
            return null;
      }
   };

   return (
      <motion.div
         className="relative flex flex-col lg:flex-row items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-950 to-black p-6 lg:p-12 overflow-hidden z-0"
         initial="hidden"
         animate="visible"
      >
         {/* Background Blobs */}
         <BackgroundBlob
            className="w-72 h-72 lg:w-96 lg:h-96 bg-gradient-to-br from-purple-600 via-indigo-700 to-transparent top-[-15%] left-[-10%] lg:top-[-20%] lg:left-[5%]"
            animateProps={blobAnimation1}
         />
         <BackgroundBlob
            className="w-64 h-64 lg:w-[500px] lg:h-[500px] bg-gradient-to-tl from-cyan-600 via-blue-700 to-transparent bottom-[-10%] right-[-15%] lg:bottom-[5%] lg:right-[0%]"
            animateProps={blobAnimation2}
         />
         <BackgroundBlob
            className="hidden lg:block w-80 h-80 bg-gradient-to-tr from-pink-600 via-purple-800 to-transparent top-[30%] right-[15%]"
            animateProps={blobAnimation3}
         />

         {/* Left Column (Info) */}
         <motion.div
            className="relative w-full lg:w-1/2 flex flex-col justify-center items-center lg:items-start text-center lg:text-left p-8 lg:pr-12 mb-10 lg:mb-0 z-10"
            variants={leftVariants} 
            initial="hidden"
            animate="visible"
         >
            <Clapperboard className="h-20 w-20 lg:h-24 lg:w-24 text-purple-500 mb-6" strokeWidth={1.5} />
            <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-4 leading-tight">
               Showcase Studio
            </h1>
            <p className="text-lg lg:text-xl text-gray-400 mb-8 max-w-md lg:max-w-none">
               {currentStep === 1 ? "Let's connect your Discord bot to start indexing showcase images." : currentStep === 2 ? "Select the server and channels that you want to index." : "Preparing your studio..."}
            </p>
         </motion.div>

         {/* Right Column */}
         <AnimatePresence mode="wait">
            {renderStepContent()}
         </AnimatePresence>

      </motion.div>
   );
};

export default SetupPage;
