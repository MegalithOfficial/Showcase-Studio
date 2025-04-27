import React, { useEffect, useState, useCallback, useMemo } from 'react'; 
import {
   Database, RefreshCw, Image, MessageSquare, BarChart, Search, CheckSquare, Square
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { DiscordChannel, IndexedMessage } from '../../utils/types';
import { listen } from '@tauri-apps/api/event';
import toast from 'react-hot-toast';
import Logger from '../../utils/log';

type EnhancedChannelStats = {
   id: string;
   name: string;
   totalMessages: number;
   totalImages: number;
   lastUpdated: string;
   status: 'active' | 'paused' | 'error';
   growth: number;
   isSelectedForIndexing: boolean;
};

export const IndexingSection: React.FC = () => {
   const [searchTerm, setSearchTerm] = useState('');
   const [isIndexing, setIsIndexing] = useState(false);
   const [channelData, setChannelData] = useState<EnhancedChannelStats[]>([]);
   const [isLoadingData, setIsLoadingData] = useState(true);
   const [isTogglingChannel, setIsTogglingChannel] = useState<{ [key: string]: boolean }>({});
   const [selectedChannelCount, setSelectedChannelCount] = useState(0);
   const [totalMessagesInSelected, setTotalMessagesInSelected] = useState(0);
   const [totalImagesInSelected, setTotalImagesInSelected] = useState(0);


   const fetchData = useCallback(async () => {
      setIsLoadingData(true);
      try {
         const config = await invoke<{ selected_server_id: string, selected_channel_ids: string[] }>('get_configuration');
         const serverId = config.selected_server_id;
         const selectedChannelIdsSet = new Set(config.selected_channel_ids || []);

         if (!serverId) {
            Logger.warn("No server selected in configuration.");
            setChannelData([]);
            setIsLoadingData(false);
            return;
         }

         const allChannels = await invoke<DiscordChannel[]>('get_discord_channels', { guildIdStr: serverId });
         const fetchedMessages = await invoke<IndexedMessage[]>('get_indexed_messages', { serverId });

         const enhancedChannels: EnhancedChannelStats[] = allChannels.map(channel => {
            const channelMessages = fetchedMessages.filter(message => message.channel_id === channel.id);
            const totalMessages = channelMessages.length;
            const totalImages = channelMessages.reduce((acc, msg) => acc + (msg.attachments?.length || 0), 0);

            const lastMsgTimestamp = channelMessages.length > 0
               ? Math.max(...channelMessages.map(msg => new Date(msg.timestamp * 1000).getTime()))
               : 0;
            const lastUpdated = lastMsgTimestamp ? new Date(lastMsgTimestamp).toISOString() : '';

            return {
               id: channel.id,
               name: channel.name,
               totalMessages,
               totalImages,
               lastUpdated,
               status: 'active',
               growth: 0,
               isSelectedForIndexing: selectedChannelIdsSet.has(channel.id),
            };
         });

         const selectedChannels = enhancedChannels.filter(c => c.isSelectedForIndexing);
         setSelectedChannelCount(selectedChannels.length);
         setTotalMessagesInSelected(
            selectedChannels.reduce((sum, ch) => sum + ch.totalMessages, 0)
         );
         setTotalImagesInSelected(
            selectedChannels.reduce((sum, ch) => sum + ch.totalImages, 0)
         );

         setChannelData(enhancedChannels);
      } catch (error) {
         Logger.error('Failed to fetch data:', error);
         toast.error("Failed to load channel data.");
         setChannelData([]);
      } finally {
         setIsLoadingData(false);
      }
   }, []);

   useEffect(() => {
      fetchData();

      const listeners = [
         listen<string>('indexing-status', (event) => toast.loading(event.payload, { id: "indexing" })),
         listen<string>('indexing-progress', (event) => toast.loading(`Progress: ${event.payload}`, { id: "indexing" })),
         listen<string>('indexing-complete', () => {
            toast.success("Indexing complete!", { id: "indexing" });
            setIsIndexing(false);
            fetchData();
         }),
         listen<string>('indexing-error', (event) => {
            toast.error(`Indexing error: ${event.payload}`, { id: "indexing" });
            setIsIndexing(false);
         }),
      ];

      return () => {
         Promise.all(listeners).then(unlisteners => {
            unlisteners.forEach(unlisten => unlisten());
         }).catch(err => Logger.error("Error cleaning up listeners:", err));
         toast.dismiss("indexing");
      };
   }, [fetchData]);

   const handleToggleChannelIndexing = async (channelId: string) => {
      const originalChannelData = [...channelData]; 
      const channelIndex = channelData.findIndex(c => c.id === channelId);
      if (channelIndex === -1) return;

      setIsTogglingChannel(prev => ({ ...prev, [channelId]: true }));

      const optimisticChannelData = channelData.map(channel =>
         channel.id === channelId
            ? { ...channel, isSelectedForIndexing: !channel.isSelectedForIndexing }
            : channel
      );
      setChannelData(optimisticChannelData);

      try {
         const updatedSelectedIds = optimisticChannelData
            .filter(channel => channel.isSelectedForIndexing)
            .map(channel => channel.id);

         const config = await invoke<{ selected_server_id: string, selected_channel_ids: string[] }>('get_configuration');

         config.selected_channel_ids = updatedSelectedIds;

         await invoke('set_configuration', {
            serverId: config.selected_server_id,
            channelIds: config.selected_channel_ids,
            isSetupComplete: true
         });

         setSelectedChannelCount(config.selected_channel_ids.length);

      } catch (error) {
         Logger.error(`Failed to update channel ${channelId} selection:`, error);
         toast.error(`Failed to update selection for channel ${channelData[channelIndex].name}.`);
         setChannelData(originalChannelData);
      } finally {
         setIsTogglingChannel(prev => ({ ...prev, [channelId]: false }));
         toast(
            'Re-indexing after changes are recommended!',
            {
               icon: <RefreshCw className="h-4 w-4 text-indigo-400" />,
               duration: 4000
            }
         );
      }
   };

   const handleReindex = () => {
      if (isIndexing) return;

      const selectedChannels = channelData.filter(c => c.isSelectedForIndexing);
      if (selectedChannels.length === 0) {
         toast.error("No channels selected for indexing.");
         return;
      }

      setIsIndexing(true);
      toast.loading("Starting indexing process...", { id: "indexing" });

      invoke('start_initial_indexing')
         .then(() => Logger.info("Indexing process started successfully."))
         .catch((err) => {
            Logger.error("Failed to invoke start_initial_indexing:", err);
            const errorMsg = err instanceof Error ? err.message : String(err);
            toast.error(`Failed to start indexing: ${errorMsg}`, { id: "indexing" });
            setIsIndexing(false);
         });
   };

   const sortedAndFilteredChannels = useMemo(() => {
      return [...channelData] 
         .sort((a, b) => {
            if (a.isSelectedForIndexing && !b.isSelectedForIndexing) {
               return -1;
            }
            if (!a.isSelectedForIndexing && b.isSelectedForIndexing) {
               return 1; 
            }
            return a.name.localeCompare(b.name);
         })
         .filter(channel => 
            channel.name.toLowerCase().includes(searchTerm.toLowerCase())
         );
   }, [channelData, searchTerm]); 

   return (
      <div className="space-y-6">
         <h2 className="text-2xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Database className="h-6 w-6 text-indigo-400" />
            Indexing Configuration & Status
         </h2>

         {/* Statistics Section */}
         <div className="p-6 bg-gray-800/40 rounded-lg border border-gray-700/60 backdrop-blur-sm transition-all duration-200 hover:border-gray-600/80 shadow-lg shadow-black/10">
            <h3 className="text-base font-medium text-slate-200 mb-5 flex items-center gap-2">
               <Database className="h-4 w-4 text-indigo-400" /> Statistics (Selected Channels)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/40">
                  <div className="flex items-center gap-2 mb-1">
                     <CheckSquare className="h-4 w-4 text-indigo-400" />
                     <span className="text-xs text-slate-400">Channels Selected</span>
                  </div>
                  <p className="text-2xl font-semibold text-slate-100">{selectedChannelCount}</p>
               </div>
               <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/40">
                  <div className="flex items-center gap-2 mb-1">
                     <MessageSquare className="h-4 w-4 text-indigo-400" />
                     <span className="text-xs text-slate-400">Messages Indexed</span>
                  </div>
                  <p className="text-2xl font-semibold text-slate-100">{totalMessagesInSelected.toLocaleString()}</p>
               </div>
               <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/40">
                  <div className="flex items-center gap-2 mb-1">
                     <Image className="h-4 w-4 text-indigo-400" />
                     <span className="text-xs text-slate-400">Images Indexed</span>
                  </div>
                  <p className="text-2xl font-semibold text-slate-100">{totalImagesInSelected.toLocaleString()}</p>
               </div>
            </div>
         </div>

         {/* Channel Selection & Analytics Section */}
         <div className="p-6 bg-gray-800/40 rounded-lg border border-gray-700/60 backdrop-blur-sm transition-all duration-200 hover:border-gray-600/80 shadow-lg shadow-black/10">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
               <h3 className="text-base font-medium text-slate-200 flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-indigo-400" /> Channel Selection & Stats
               </h3>

               <div className="flex items-center gap-3">
                  <div className="relative">
                     <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                     <input
                        type="text"
                        placeholder="Search channels..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="py-1.5 pl-9 pr-3 text-sm bg-gray-900/70 border border-gray-700/60 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200 placeholder-slate-500 w-full sm:w-auto"
                        disabled={isIndexing || isLoadingData}
                     />
                  </div>
                  <div className="group relative">
                     <button
                        className={`flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-md shadow-lg shadow-indigo-900/20 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400
                           ${isIndexing || selectedChannelCount === 0
                              ? 'bg-indigo-900/60 text-indigo-300 cursor-not-allowed opacity-70'
                              : 'bg-indigo-500 text-white hover:scale-105 hover:from-indigo-600 hover:to-indigo-800'
                           }`}
                        aria-label="Reindex Selected Channels"
                        onClick={handleReindex}
                        disabled={isIndexing || isLoadingData || selectedChannelCount === 0}
                        title={selectedChannelCount === 0 ? "Select at least one channel to index" : "Start indexing selected channels"}
                     >
                        <RefreshCw
                           className={`h-4 w-4 ${isIndexing ? 'animate-spin' : ''}`}
                        />
                        {isIndexing ? 'Indexing...' : `Index Selected (${selectedChannelCount})`}
                     </button>
                  </div>
               </div>
            </div>

            <div className="relative">
               {isLoadingData && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-gray-900/60 backdrop-blur-sm rounded-lg">
                     <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
                     <span className="text-base text-indigo-200 font-medium">Loading Channels...</span>
                  </div>
               )}
               {isIndexing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-900/60 backdrop-blur-sm rounded-lg">
                     <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
                     <span className="text-base text-indigo-200 font-medium">Indexing...</span>
                  </div>
               )}

               <div className={isIndexing || isLoadingData ? "pointer-events-none select-none filter blur-sm transition-all duration-300" : "transition-all duration-300"}>
                  <div className="bg-gray-900/30 rounded-lg border border-gray-700/40 overflow-hidden max-h-[50vh] overflow-y-auto">
                     <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                           <thead className="sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
                              <tr className="bg-gray-900/60">
                                 <th className="sticky top-0 z-10 px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-16">Index</th>
                                 <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Channel</th>
                                 <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Messages</th>
                                 <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Images</th>
                                 <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Last Activity</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-800/70">
                              {sortedAndFilteredChannels.map((channel) => (
                                 <tr key={channel.id} className={`hover:bg-gray-800/30 transition-colors duration-150 ${channel.isSelectedForIndexing ? 'bg-indigo-900/10' : ''}`}> 
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                       <button
                                          onClick={() => handleToggleChannelIndexing(channel.id)}
                                          disabled={isTogglingChannel[channel.id] || isIndexing || isLoadingData}
                                          className={`p-1 rounded transition-colors ${isTogglingChannel[channel.id] ? 'opacity-50 cursor-wait' : 'hover:bg-indigo-600/30'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                          aria-label={channel.isSelectedForIndexing ? `Disable indexing for ${channel.name}` : `Enable indexing for ${channel.name}`}
                                       >
                                          {channel.isSelectedForIndexing
                                             ? <CheckSquare className="h-5 w-5 text-indigo-400" />
                                             : <Square className="h-5 w-5 text-slate-500" />
                                          }
                                       </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                       <div className="text-sm font-medium text-slate-200">{channel.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                       <div className="flex items-center gap-1.5">
                                          <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                                          <span className="text-sm text-slate-300">{channel.totalMessages.toLocaleString()}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                       <div className="flex items-center gap-1.5">
                                          <Image className="h-3.5 w-3.5 text-indigo-400" />
                                          <span className="text-sm text-slate-300">{channel.totalImages.toLocaleString()}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                       {channel.lastUpdated
                                          ? `${new Date(channel.lastUpdated).toLocaleDateString()} ${new Date(channel.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                          : 'N/A'
                                       }
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                     {!isLoadingData && sortedAndFilteredChannels.length === 0 && (
                        <div className="py-10 text-center text-slate-400">
                           <p>{channelData.length === 0 ? 'No channels found for this server.' : 'No channels match your search.'}</p>
                        </div>
                     )}
                  </div>
                  <div className="flex justify-between items-center mt-4 text-xs text-slate-400">
                     <p>Showing {sortedAndFilteredChannels.length} of {channelData.length} total channels</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};