import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, Bot, Route, Eye, EyeOff, AlertTriangle, ExternalLink, Shield, Check, X, Copy, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import Logger from '../../utils/log';

const DISCORD_TOKEN_KEY = 'discordBotToken';
const OPENROUTER_API_KEY = 'openRouterApiKey';

export const ApiTokensSection: React.FC = () => {
   const [discordToken, setDiscordToken] = useState('');
   const [openRouterKey, setOpenRouterKey] = useState('');
   const [discordVisible, setDiscordVisible] = useState(false);
   const [openRouterVisible, setOpenRouterVisible] = useState(false);
   const [isEditingDiscord, setIsEditingDiscord] = useState(false);
   const [isEditingOpenRouter, setIsEditingOpenRouter] = useState(false);
   const [tempDiscordToken, setTempDiscordToken] = useState('');
   const [tempOpenRouterKey, setTempOpenRouterKey] = useState('');
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState('');
   const [success, setSuccess] = useState('');
   const [copiedToken, setCopiedToken] = useState('');
   const [testingConnection, setTestingConnection] = useState(false);

   const discordInputRef = useRef<HTMLInputElement>(null);
   const openRouterInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      if (copiedToken) {
         const timer = setTimeout(() => setCopiedToken(''), 2000);
         return () => clearTimeout(timer);
      }
   }, [copiedToken]);

   useEffect(() => {
      if (success) {
         const timer = setTimeout(() => setSuccess(''), 5000);
         return () => clearTimeout(timer);
      }
   }, [success]);

   useEffect(() => {
      const loadKeys = async () => {
         setIsLoading(true);
         setError('');
         try {
            const dt = await invoke<string | null>('get_secret', { keyName: DISCORD_TOKEN_KEY });
            const ork = await invoke<string | null>('get_secret', { keyName: OPENROUTER_API_KEY });
            setDiscordToken(dt ?? '');
            setOpenRouterKey(ork ?? '');
         } catch (err) {
            Logger.error("Load keys error:", err);
            setError(`Failed to load API keys: ${err}`);
         } finally {
            setIsLoading(false);
         }
      };
      loadKeys();
   }, []);

   useEffect(() => {
      if (isEditingDiscord && discordInputRef.current) {
         discordInputRef.current.focus();
      }
   }, [isEditingDiscord]);

   useEffect(() => {
      if (isEditingOpenRouter && openRouterInputRef.current) {
         openRouterInputRef.current.focus();
      }
   }, [isEditingOpenRouter]);

   const handleEdit = (keyName: string) => {
      setError(''); setSuccess('');
      if (keyName === DISCORD_TOKEN_KEY) {
         setTempDiscordToken(discordToken);
         setIsEditingDiscord(true);
      } else {
         setTempOpenRouterKey(openRouterKey);
         setIsEditingOpenRouter(true);
      }
   };

   const handleCancel = (keyName: string) => {
      if (keyName === DISCORD_TOKEN_KEY) {
         setIsEditingDiscord(false);
         setTempDiscordToken('');
      } else {
         setIsEditingOpenRouter(false);
         setTempOpenRouterKey('');
      }
      setError('');
   };

   const handleCopy = (value: string, key: string) => {
      if (!value) return;
      navigator.clipboard.writeText(value);
      setCopiedToken(key);
   };

   const handleSave = async (keyName: string, tempValue: string, setValue: (v: string) => void, setEditing: (v: boolean) => void) => {
      setError('');
      setSuccess('');
      const valueToSave = tempValue.trim();

      if (keyName === DISCORD_TOKEN_KEY && !valueToSave) {
         setError('Discord Bot Token cannot be empty.');
         return;
      }

      try {
         setTestingConnection(true);

         await invoke('save_secret', { keyName, secret: valueToSave });
         setValue(valueToSave);
         setSuccess(`${keyName === DISCORD_TOKEN_KEY ? 'Discord Token' : 'OpenRouter Key'} saved successfully!`);
         setEditing(false);

      } catch (err) {
         Logger.error(`Save ${keyName} error:`, err);
         setError(`Failed to save ${keyName === DISCORD_TOKEN_KEY ? 'Discord Token' : 'OpenRouter Key'}: ${err}`);
      } finally {
         setTestingConnection(false);
      }
   }

   const renderKeyInput = (
      label: string,
      keyName: string,
      value: string,
      tempValue: string,
      setTempValue: (v: string) => void,
      isVisible: boolean,
      setVisible: (v: boolean) => void,
      isEditing: boolean,
      setEditing: (v: boolean) => void,
      Icon: React.ElementType,
      placeholder: string,
      description: string,
      inputRef: React.RefObject<HTMLInputElement>,
      required: boolean = false
   ) => (
      <div className="p-6 bg-gray-800/40 rounded-lg border border-gray-700/60 backdrop-blur-sm transition-all duration-200 hover:border-gray-600/80 shadow-lg shadow-black/10">
         <div className="flex justify-between items-center mb-3">
            <label className="text-base font-medium text-slate-200 flex items-center gap-2">
               <Icon className="h-5 w-5 text-indigo-400" />
               {label} {required && <span className='text-red-500 text-xs'>*</span>}
            </label>
            {!isEditing && value && (
               <div className="flex gap-2">
                  <button
                     onClick={() => handleEdit(keyName)}
                     className="px-3 py-1 text-xs font-medium text-slate-300 bg-gray-700/80 rounded-md hover:bg-gray-600 border border-gray-600/80 transition-all duration-150 hover:shadow-sm hover:shadow-indigo-900/30"
                  >
                     Edit
                  </button>
               </div>
            )}
            {!isEditing && !value && (
               <button
                  onClick={() => handleEdit(keyName)}
                  className="px-3 py-1 text-xs font-medium text-white bg-indigo-600/90 rounded-md hover:bg-indigo-700/90 transition-all duration-150 hover:shadow-sm hover:shadow-indigo-900/30"
               >
                  Add Key
               </button>
            )}
         </div>

         <div className='text-sm text-slate-400 mb-4'>{description}</div>

         {isEditing ? (
            <div className='space-y-3'>
               <div className='relative'>
                  <input
                     ref={inputRef}
                     type={isVisible ? "text" : "password"}
                     value={tempValue}
                     onChange={(e) => setTempValue(e.target.value)}
                     placeholder={placeholder}
                     className="w-full px-3 py-2.5 pr-10 bg-gray-700/70 border border-gray-600/80 rounded-md text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition-all duration-150 shadow-sm shadow-black/10"
                  />
                  <button
                     onClick={() => setVisible(!isVisible)}
                     className="absolute top-0 right-0 h-full px-2.5 text-slate-400 hover:text-slate-100 transition-colors"
                     aria-label={isVisible ? 'Hide token' : 'Show token'}
                  >
                     {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
               </div>
               <div className="flex items-center justify-end gap-2">
                  <button
                     onClick={() => handleCancel(keyName)}
                     className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-gray-600/80 rounded-md hover:bg-gray-500/80 transition-colors"
                  >
                     Cancel
                  </button>
                  <button
                     onClick={() => handleSave(keyName, tempValue, keyName === DISCORD_TOKEN_KEY ? setDiscordToken : setOpenRouterKey, setEditing)}
                     className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600/90 rounded-md hover:bg-indigo-700/90 transition-colors flex items-center gap-1.5"
                     disabled={testingConnection}
                  >
                     {testingConnection ? (
                        <>
                           <Loader2 className="h-3 w-3 animate-spin" />
                           Saving...
                        </>
                     ) : (
                        <>
                           <Check className="h-3 w-3" />
                           Save
                        </>
                     )}
                  </button>
               </div>
            </div>
         ) : (
            <div className='flex items-center justify-between text-sm font-mono bg-gray-900/70 px-3 py-2.5 rounded-md border border-gray-700/60 min-h-[44px] group relative overflow-hidden'>
               <div className={`absolute inset-0 bg-indigo-600/20 transition-all duration-300 ${copiedToken === keyName ? 'opacity-100' : 'opacity-0'}`}></div>
               <span className={`truncate relative z-10 ${value ? 'text-slate-300' : 'text-slate-500 italic'}`}>
                  {value ? (isVisible ? value : '•'.repeat(value.length > 30 ? 30 : value.length)) : 'Not Set'}
               </span>
               {value && (
                  <div className="flex items-center gap-1.5 relative z-10">
                     <button
                        onClick={() => handleCopy(value, keyName)}
                        className={`p-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors rounded-md hover:bg-indigo-900/30 ${copiedToken === keyName ? 'text-green-400' : ''}`}
                        aria-label="Copy token"
                     >
                        {copiedToken === keyName ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                     </button>
                     <div className="h-4 w-px bg-gray-700"></div>
                     <button
                        onClick={() => setVisible(!isVisible)}
                        className="p-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors rounded-md hover:bg-indigo-900/30"
                        aria-label={isVisible ? 'Hide token' : 'Show token'}
                     >
                        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                     </button>
                  </div>
               )}
            </div>
         )}
      </div>
   );

   return (
      <div className="space-y-6">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
               <KeyRound className="h-6 w-6 text-indigo-400" />
               API Tokens
            </h2>
            <div className="flex items-center justify-center h-8 w-8 bg-indigo-600/20 rounded-full">
               <Shield className="h-4 w-4 text-indigo-400" />
            </div>
         </div>

         <div className="flex items-start gap-3 p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-300 text-sm backdrop-blur-sm shadow-lg shadow-black/10">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
               <strong className="font-semibold">Security notice:</strong> Your API tokens are securely stored in your system's keychain and never shared with third parties.
            </div>
         </div>

         {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
               <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <KeyRound className="h-6 w-6 text-indigo-400/50" />
                  </div>
               </div>
               <p className="mt-4 text-slate-400">Loading secure tokens...</p>
            </div>
         ) : (
            <>
               {error && (
                  <div className='text-red-400 text-sm mb-4 p-4 bg-red-900/30 border border-red-700/50 rounded-lg backdrop-blur-sm shadow-lg shadow-black/10 animate-fadeIn flex items-center gap-3'>
                     <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-red-900/50 rounded-full border border-red-700/50">
                        <X className="h-4 w-4 text-red-400" />
                     </div>
                     <div>
                        <p className="font-medium mb-0.5">Error</p>
                        <p className="text-red-300/90">{error}</p>
                     </div>
                  </div>
               )}

               {success && (
                  <div className='text-green-400 text-sm mb-4 p-4 bg-green-900/30 border border-green-700/50 rounded-lg backdrop-blur-sm shadow-lg shadow-black/10 animate-fadeIn flex items-center gap-3'>
                     <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-green-900/50 rounded-full border border-green-700/50">
                        <Check className="h-4 w-4 text-green-400" />
                     </div>
                     <div>
                        <p className="font-medium mb-0.5">Success</p>
                        <p className="text-green-300/90">{success}</p>
                     </div>
                  </div>
               )}

               {renderKeyInput(
                  "Discord Bot Token", DISCORD_TOKEN_KEY,
                  discordToken,
                  tempDiscordToken, setTempDiscordToken,
                  discordVisible, setDiscordVisible,
                  isEditingDiscord, setIsEditingDiscord,
                  Bot, "Paste your Discord Bot Token",
                  "Required to fetch data from Discord. Bot needs Read Message History permissions.",
                  discordInputRef, true
               )}

               {renderKeyInput(
                  "OpenRouter API Key", OPENROUTER_API_KEY,
                  openRouterKey,
                  tempOpenRouterKey, setTempOpenRouterKey,
                  openRouterVisible, setOpenRouterVisible,
                  isEditingOpenRouter, setIsEditingOpenRouter,
                  Route, "Paste your OpenRouter Key (sk-or-...)",
                  "Optional. Used for AI-powered image description and search features.",
                  openRouterInputRef, false
               )}

               <div className="mt-8 pt-4 border-t border-gray-700/40 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                     href="https://discord.com/developers/applications"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center gap-3 p-4 text-sm text-indigo-300 bg-indigo-900/20 hover:bg-indigo-900/30 transition-colors rounded-lg border border-indigo-700/40 hover:border-indigo-700/60 group"
                  >
                     <Bot className="h-5 w-5 text-indigo-400" />
                     <div className="flex-1">
                        <p className="font-medium">Discord Developer Portal</p>
                        <p className="text-xs text-indigo-300/70">Create or manage your Discord bot</p>
                     </div>
                     <ExternalLink className="h-4 w-4 text-indigo-400/50 group-hover:text-indigo-400 transition-colors" />
                  </a>

                  <a
                     href="https://openrouter.ai/settings/keys"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center gap-3 p-4 text-sm text-indigo-300 bg-indigo-900/20 hover:bg-indigo-900/30 transition-colors rounded-lg border border-indigo-700/40 hover:border-indigo-700/60 group"
                  >
                     <Route className="h-5 w-5 text-indigo-400" />
                     <div className="flex-1">
                        <p className="font-medium">OpenRouter Dashboard</p>
                        <p className="text-xs text-indigo-300/70">Manage your API keys and usage</p>
                     </div>
                     <ExternalLink className="h-4 w-4 text-indigo-400/50 group-hover:text-indigo-400 transition-colors" />
                  </a>
               </div>
            </>
         )}
      </div>
   );
};