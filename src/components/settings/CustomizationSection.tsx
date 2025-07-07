import React, { useState, useEffect } from 'react';
import { Paintbrush, RefreshCw, Bell, BellOff, Loader2, Layers, Image as ImageIcon, 
  Upload, Sliders, User, Type, Info, X, Check, Save, RotateCcw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { InfoToast } from '../layout/Toasts';
import Logger from '../../utils/log';
import { open } from '@tauri-apps/plugin-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import type { OverlayPosition, OverlayStyle, CustomizationSettingsPayload } from '../../utils/types';

export const CustomizationSection: React.FC = () => {
   const [autoUpdatesEnabled, setAutoUpdatesEnabled] = useState<boolean>(true);
   const [isLoading, setIsLoading] = useState<boolean>(true);
   const [isSaving, setIsSaving] = useState<boolean>(false);
   const [hasChanges, setHasChanges] = useState<boolean>(false);

   // Overlay settings
   const [overlayPosition, setOverlayPosition] = useState<OverlayPosition>('bottom-right');
   const [overlayStyle, setOverlayStyle] = useState<OverlayStyle>('black');
   const [overlayWidth, setOverlayWidth] = useState<number>(70);
   const [overlayTransparency, setOverlayTransparency] = useState<number>(20);
   const [showAvatar, setShowAvatar] = useState<boolean>(true);

   // First slide template
   const [firstSlideImage, setFirstSlideImage] = useState<string | null>(null);
   const [showTitle, setShowTitle] = useState<boolean>(true);
   const [showAuthor, setShowAuthor] = useState<boolean>(true);

   useEffect(() => {
     const loadSettings = async () => {
       try {
         Logger.info("Loading customization preferences from backend");
         const backendSettings = await invoke<CustomizationSettingsPayload>('get_customization_settings');

         setAutoUpdatesEnabled(backendSettings.autoUpdateEnabled ?? true);

         const os = backendSettings.overlaySettings;
         setOverlayPosition(os?.position ?? 'bottom-right');
         setOverlayStyle(os?.style ?? 'black');
         setOverlayWidth(os?.width ?? 70);
         setOverlayTransparency(os?.transparency ?? 20);
         setShowAvatar(os?.showAvatar ?? true);

         const fs = backendSettings.firstSlideSettings;
         setFirstSlideImage(fs?.backgroundImage ?? null);
         setShowTitle(fs?.showTitle ?? true);
         setShowAuthor(fs?.showAuthor ?? true);

       } catch (error) {
         Logger.error("Failed to load customization settings from backend:", error);
         // Fallback to UI defaults if backend load fails
         setAutoUpdatesEnabled(true);
         setOverlayPosition('bottom-right');
         setOverlayStyle('black');
         setOverlayWidth(70);
         setOverlayTransparency(20);
         setShowAvatar(true);
         setFirstSlideImage(null);
         setShowTitle(true);
         setShowAuthor(true);
       } finally {
         setIsLoading(false);
         setTimeout(() => { // Important: allow state updates to process
           setHasChanges(false);
         }, 0);
       }
     };
     loadSettings();
   }, []); // Empty dependency array means this runs once on mount

   // Track changes to set the hasChanges flag
   useEffect(() => {
     if (!isLoading) { // This condition is important
       setHasChanges(true);
     }
   }, [
     overlayPosition, overlayStyle, overlayWidth, overlayTransparency,
     showAvatar, firstSlideImage, showTitle, showAuthor, autoUpdatesEnabled
   ]);

   const handleToggleAutoUpdates = async () => {
     if (isSaving) return;

     const newValue = !autoUpdatesEnabled;
     setIsSaving(true);

     try {
       Logger.info(`Setting auto updates to: ${newValue} via backend`);
       await invoke('set_auto_update_setting', { enabled: newValue });
       setAutoUpdatesEnabled(newValue); // Update UI state after successful backend call
       InfoToast(`Automatic updates ${newValue ? "enabled" : "disabled"}`);
     } catch (error) {
       Logger.error("Failed to save update setting via backend:", error);
     } finally {
       setIsSaving(false);
     }
   };

   const handleSelectFirstSlideImage = async () => {
      try {
         const selected = await open({
            multiple: false,
            filters: [{
               name: 'Images',
               extensions: ['jpg', 'jpeg', 'png', 'webp']
            }]
         });

         if (selected && !Array.isArray(selected)) {
            setFirstSlideImage(selected);
            InfoToast("First slide background updated");
         }
      } catch (error) {
         Logger.error("Failed to select image:", error);
      }
   };

   const handleClearFirstSlideImage = () => {
      setFirstSlideImage(null);
      InfoToast("Background image removed");
   };

   const handleOverlayPositionChange = (position: OverlayPosition) => {
      setOverlayPosition(position);
   };

   const handleOverlayStyleChange = (style: OverlayStyle) => {
      setOverlayStyle(style);
   };

   const handleTransparencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setOverlayTransparency(parseInt(e.target.value));
   };

   const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setOverlayWidth(parseInt(e.target.value));
   };

   const handleToggleShowAvatar = () => {
      setShowAvatar(!showAvatar);
   };

   const handleToggleShowTitle = () => {
      setShowTitle(!showTitle);
   };

   const handleToggleShowAuthor = () => {
      setShowAuthor(!showAuthor);
   };

   const handleResetSettings = async () => {
     try {
       Logger.info("Resetting customization settings to defaults");
       
       // Reset to defaults
       setAutoUpdatesEnabled(true);
       setOverlayPosition('bottom-right');
       setOverlayStyle('black');
       setOverlayWidth(70);
       setOverlayTransparency(20);
       setShowAvatar(true);
       setFirstSlideImage(null);
       setShowTitle(true);
       setShowAuthor(true);
       
       InfoToast("Settings reset to defaults");
     } catch (error) {
       Logger.error("Failed to reset settings:", error);
     }
   };

   const handleSaveSettings = async () => {
     setIsSaving(true);
     try {
       Logger.info("Saving customization settings to backend");

       const settingsToSave: CustomizationSettingsPayload = {
         autoUpdateEnabled: autoUpdatesEnabled,
         overlaySettings: {
           position: overlayPosition,
           style: overlayStyle,
           showAvatar: showAvatar,
           width: overlayWidth,
           transparency: overlayTransparency
         },
         firstSlideSettings: {
           backgroundImage: firstSlideImage,
           showTitle: showTitle,
           showAuthor: showAuthor
         }
       };
       
       await invoke('save_customization_settings', { payload: settingsToSave });

       InfoToast("Settings saved successfully");
       setHasChanges(false); // Reset hasChanges after successful save
     } catch (error) {
       Logger.error("Failed to save settings to backend:", error);
       // Optionally show an error toast to the user
     } finally {
       setIsSaving(false);
     }
   };

   const getPositionClass = () => {
      switch (overlayPosition) {
         case 'top-left': return 'top-0 left-0';
         case 'top-right': return 'top-0 right-0';
         case 'bottom-left': return 'bottom-0 left-0';
         case 'bottom-right': return 'bottom-0 right-0';
         case 'hidden': return 'hidden';
         default: return 'bottom-0 right-0';
      }
   };

   if (isLoading) {
      return (
         <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
                  <Paintbrush className="h-6 w-6 text-indigo-400" />
                  Customization
               </h2>
               <div className="flex items-center justify-center h-10 w-10 bg-indigo-600/20 rounded-full">
                  <Paintbrush className="h-5 w-5 text-indigo-400" />
               </div>
            </div>

            <div className="p-8 bg-gray-800/40 rounded-xl border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10 flex flex-col items-center justify-center">
               <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mb-3" />
               <span className="text-slate-300">Loading your preferences...</span>
            </div>
         </div>
      );
   }

   return (
      <div className="space-y-8 pb-24">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
               <Paintbrush className="h-6 w-6 text-indigo-400" />
               Customization
            </h2>
            <div className="flex items-center justify-center h-10 w-10 bg-indigo-600/20 rounded-full">
               <Paintbrush className="h-5 w-5 text-indigo-400" />
            </div>
         </div>

         {/* Overlay Settings Section */}
         <div className="space-y-6">
            <div className="flex items-center border-b border-gray-700 pb-2">
               <Layers className="w-5 h-5 text-indigo-400 mr-2" />
               <h3 className="text-xl font-medium text-slate-200">Overlay Settings</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
               {/* Preview Section */}
               <div className="p-6 bg-gray-800/40 rounded-xl border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10">
                  <h4 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
                     <Layers className="h-5 w-5 text-indigo-400" />
                     Preview
                  </h4>

                  <div className="rounded-lg overflow-hidden border border-gray-700/70 bg-gradient-to-br from-gray-900 to-gray-800 aspect-video relative">
                     {/* Sample presentation slide */}
                     <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-br from-indigo-900/20 to-purple-900/10 flex items-center justify-center">
                           <span className="text-slate-500 text-sm">Sample Presentation Slide</span>
                        </div>
                     </div>

                     {/* Overlay preview */}
                     {overlayPosition !== 'hidden' && (
                        <div
                           className={`absolute ${getPositionClass()} m-2 p-3 rounded-lg ${
                              overlayStyle === 'black' 
                                 ? 'bg-black text-white' 
                                 : 'bg-white text-black'
                           } shadow-md transition-all duration-200`}
                           style={{
                              width: `${overlayWidth}%`,
                              opacity: 1 - (overlayTransparency / 100)
                           }}
                        >
                           <div className="flex gap-3 items-center">
                              {showAvatar && (
                                 <div className={`w-8 h-8 rounded-full ${
                                    overlayStyle === 'black' 
                                       ? 'bg-indigo-600' 
                                       : 'bg-indigo-500'
                                 } flex-shrink-0 flex items-center justify-center`}>
                                    <User className="w-4 h-4 text-white" />
                                 </div>
                              )}
                              <div className="space-y-1.5">
                                 <div className={`h-2.5 w-32 ${
                                    overlayStyle === 'black' 
                                       ? 'bg-gray-300' 
                                       : 'bg-gray-600'
                                 } rounded-full`}></div>
                                 <div className={`h-2 w-24 ${
                                    overlayStyle === 'black' 
                                       ? 'bg-gray-500' 
                                       : 'bg-gray-400'
                                 } rounded-full`}></div>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
                  
                  <div className="mt-4">
                     <div className="flex items-center gap-1.5 text-xs text-indigo-300">
                        <Info className="w-3.5 h-3.5" />
                        <span>This is how your overlay will appear on presentations</span>
                     </div>
                  </div>
               </div>

               {/* Controls Section */}
               <div className="space-y-5">
                  {/* Position Controls */}
                  <div className="p-5 bg-gray-800/40 rounded-xl border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10">
                     <h4 className="text-sm font-medium text-slate-200 mb-3 flex items-center gap-2">
                        Position
                        <span className="ml-auto text-xs text-indigo-300 font-normal">Choose where to display</span>
                     </h4>
                     <div className="grid grid-cols-3 gap-2">
                        {[
                           { value: "top-left", label: "Top Left" },
                           { value: "top-right", label: "Top Right" },
                           { value: "hidden", label: "Hidden" },
                           { value: "bottom-left", label: "Bottom Left" },
                           { value: "bottom-right", label: "Bottom Right" },
                        ].map(position => (
                           <button
                              key={position.value}
                              onClick={() => handleOverlayPositionChange(position.value as OverlayPosition)}
                              className={`px-3 py-2 rounded-lg border text-sm transition-all duration-150 ${
                                 overlayPosition === position.value
                                    ? "bg-indigo-600/40 border-indigo-500/60 text-indigo-300 shadow-inner"
                                    : "bg-gray-800/60 border-gray-700/40 text-slate-400 hover:bg-gray-700/70 hover:text-slate-300"
                              }`}
                           >
                              {position.label}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Style Controls */}
                  <div className="p-5 bg-gray-800/40 rounded-xl border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10">
                     <h4 className="text-sm font-medium text-slate-200 mb-3 flex items-center gap-2">
                        <Type className="h-4 w-4 text-indigo-400" />
                        Style
                     </h4>
                     <div className="grid grid-cols-2 gap-3">
                        <button
                           onClick={() => handleOverlayStyleChange("black")}
                           className={`px-3 py-3 rounded-lg border text-sm transition-all duration-150 ${
                              overlayStyle === "black"
                                 ? "bg-indigo-600/40 border-indigo-500/60 text-indigo-300 shadow-inner"
                                 : "bg-gray-800/60 border-gray-700/40 text-slate-400 hover:bg-gray-700/70 hover:text-slate-300"
                           }`}
                        >
                           <div className="flex justify-center items-center gap-2">
                              <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center border border-gray-700">
                                 {overlayStyle === "black" && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span>Dark Mode</span>
                           </div>
                        </button>
                        <button
                           onClick={() => handleOverlayStyleChange("white")}
                           className={`px-3 py-3 rounded-lg border text-sm transition-all duration-150 ${
                              overlayStyle === "white"
                                 ? "bg-indigo-600/40 border-indigo-500/60 text-indigo-300 shadow-inner"
                                 : "bg-gray-800/60 border-gray-700/40 text-slate-400 hover:bg-gray-700/70 hover:text-slate-300"
                           }`}
                        >
                           <div className="flex justify-center items-center gap-2">
                              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-400">
                                 {overlayStyle === "white" && <Check className="w-3 h-3 text-black" />}
                              </div>
                              <span>Light Mode</span>
                           </div>
                        </button>
                     </div>
                  </div>

                  {/* Sliders */}
                  <div className="p-5 bg-gray-800/40 rounded-xl border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10 space-y-5">
                     {/* Width Slider */}
                     <div>
                        <div className="flex justify-between items-center mb-2">
                           <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                              <Sliders className="h-4 w-4 text-indigo-400" />
                              Width
                           </h4>
                           <span className="text-xs py-0.5 px-2 bg-indigo-900/50 text-indigo-300 rounded-full font-mono">
                              {overlayWidth}%
                           </span>
                        </div>
                        <input
                           type="range"
                           min="30"
                           max="100"
                           value={overlayWidth}
                           onChange={handleWidthChange}
                           className="w-full h-2 bg-gray-700/80 rounded-full appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                           <span>Narrow</span>
                           <span>Wide</span>
                        </div>
                     </div>

                     {/* Transparency Slider */}
                     <div>
                        <div className="flex justify-between items-center mb-2">
                           <h4 className="text-sm font-medium text-slate-200">Transparency</h4>
                           <span className="text-xs py-0.5 px-2 bg-indigo-900/50 text-indigo-300 rounded-full font-mono">
                              {overlayTransparency}%
                           </span>
                        </div>
                        <input
                           type="range"
                           min="0"
                           max="60"
                           value={overlayTransparency}
                           onChange={handleTransparencyChange}
                           className="w-full h-2 bg-gray-700/80 rounded-full appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                           <span>Solid</span>
                           <span>Translucent</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Avatar Toggle */}
            <div className="p-5 bg-gray-800/40 rounded-xl border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10">
               <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                     <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-900/30 flex items-center justify-center mt-0.5">
                        <User className="h-5 w-5 text-indigo-400" />
                     </div>
                     <div>
                        <h4 className="text-sm font-medium text-slate-200">Show Avatar</h4>
                        <p className="text-xs text-slate-400 mt-1">
                           Display user avatar next to messages in the overlay
                        </p>
                     </div>
                  </div>
                  <div>
                     <button
                        onClick={handleToggleShowAvatar}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                           showAvatar ? 'bg-indigo-600' : 'bg-gray-700'
                        }`}
                     >
                        <span
                           className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              showAvatar ? 'translate-x-6' : 'translate-x-1'
                           }`}
                        />
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* First Slide Template Section */}
         <div className="space-y-6 pt-4">
            <div className="flex items-center border-b border-gray-700 pb-2">
               <ImageIcon className="w-5 h-5 text-indigo-400 mr-2" />
               <h3 className="text-xl font-medium text-slate-200">First Slide Template</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
               {/* Preview Section */}
               <div className="p-6 bg-gray-800/40 rounded-xl border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10">
                  <h4 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
                     <ImageIcon className="h-5 w-5 text-indigo-400" />
                     Preview
                  </h4>

                  <div className="rounded-lg overflow-hidden border border-gray-700/70 bg-gradient-to-br from-gray-900 to-gray-800 aspect-video relative">
                     {firstSlideImage ? (
                        <img 
                           src={firstSlideImage} 
                           alt="First slide template" 
                           className="absolute inset-0 w-full h-full object-cover" 
                        />
                     ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/10"></div>
                     )}
                     
                     <div className="absolute inset-0 flex flex-col justify-center items-center p-4 text-center">
                        {showTitle && (
                           <h3 className="text-xl font-bold text-white mb-2 bg-black/30 px-4 py-2 rounded-lg">
                              Presentation Title
                           </h3>
                        )}
                        {showAuthor && (
                           <p className="text-sm text-white bg-black/30 px-3 py-1 rounded-lg">
                              By: Presenter Name
                           </p>
                        )}
                     </div>
                  </div>
                  
                  <div className="mt-4">
                     <div className="flex items-center gap-1.5 text-xs text-indigo-300">
                        <Info className="w-3.5 h-3.5" />
                        <span>First slide appearance when you start a presentation</span>
                     </div>
                  </div>
               </div>

               {/* Controls Section */}
               <div className="space-y-5">
                  {/* Background Image */}
                  <div className="p-5 bg-gray-800/40 rounded-xl border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10">
                     <h4 className="text-sm font-medium text-slate-200 mb-3 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-indigo-400" />
                        Background Image
                     </h4>
                     
                     <div className="flex flex-col gap-3">
                        <button
                           onClick={handleSelectFirstSlideImage}
                           className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg text-sm border border-indigo-600/30 transition-colors"
                        >
                           <Upload className="h-4 w-4" />
                           {firstSlideImage ? "Change Background Image" : "Select Background Image"}
                        </button>
                        
                        {firstSlideImage && (
                           <div className="flex flex-col gap-2">
                              <div className="flex items-center px-3 py-2 bg-gray-900/50 rounded-lg text-xs text-slate-400 truncate">
                                 <span className="truncate flex-1">{firstSlideImage.split(/[\\/]/).pop()}</span>
                                 <button 
                                    onClick={handleClearFirstSlideImage} 
                                    className="ml-2 p-1 text-slate-500 hover:text-red-400 rounded-full"
                                 >
                                    <X className="h-3.5 w-3.5" />
                                 </button>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Content Controls */}
                  <div className="p-5 bg-gray-800/40 rounded-xl border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10 space-y-4">
                     <h4 className="text-sm font-medium text-slate-200">Content Display</h4>
                     
                     {/* Show Title Toggle */}
                     <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                           <Type className="h-4 w-4 text-indigo-400" />
                           <span className="text-sm text-slate-300">Show Title</span>
                        </div>
                        <button
                           onClick={handleToggleShowTitle}
                           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              showTitle ? 'bg-indigo-600' : 'bg-gray-700'
                           }`}
                        >
                           <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                 showTitle ? 'translate-x-6' : 'translate-x-1'
                              }`}
                           />
                        </button>
                     </div>
                     
                     {/* Show Author Toggle */}
                     <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                           <User className="h-4 w-4 text-indigo-400" />
                           <span className="text-sm text-slate-300">Show Author</span>
                        </div>
                        <button
                           onClick={handleToggleShowAuthor}
                           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              showAuthor ? 'bg-indigo-600' : 'bg-gray-700'
                           }`}
                        >
                           <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                 showAuthor ? 'translate-x-6' : 'translate-x-1'
                              }`}
                           />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Updates Settings Section */}
         <div className="space-y-6 pt-4">
            <div className="flex items-center border-b border-gray-700 pb-2">
               <Bell className="w-5 h-5 text-indigo-400 mr-2" />
               <h3 className="text-xl font-medium text-slate-200">Update Settings</h3>
            </div>

            <div className="p-6 bg-gray-800/40 rounded-xl border border-gray-700/60 backdrop-blur-sm shadow-lg shadow-black/10">
               <div className="flex items-center justify-between py-4 px-5 bg-gray-900/50 rounded-xl border border-gray-700/50">
                  <div className="flex items-start gap-4">
                     <div className="flex-shrink-0 h-12 w-12 rounded-full bg-indigo-900/30 flex items-center justify-center mt-0.5">
                        {autoUpdatesEnabled ? (
                           <Bell className="h-6 w-6 text-indigo-400" />
                        ) : (
                           <BellOff className="h-6 w-6 text-slate-500" />
                        )}
                     </div>
                     <div>
                        <h4 className="text-base font-medium text-slate-200">Automatic update notifications</h4>
                        <p className="text-sm text-slate-400 mt-1">
                           {autoUpdatesEnabled
                              ? "You'll receive notifications when updates are available"
                              : "Updates won't be checked automatically"}
                        </p>
                     </div>
                  </div>
                  <div className="flex flex-col items-end">
                     <button
                        onClick={handleToggleAutoUpdates}
                        disabled={isSaving}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                           autoUpdatesEnabled ? 'bg-indigo-600' : 'bg-gray-700'
                        } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                     >
                        {isSaving && (
                           <span className="absolute -left-7">
                              <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                           </span>
                        )}
                        <span
                           className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                              autoUpdatesEnabled ? 'translate-x-8' : 'translate-x-1'
                           }`}
                        />
                     </button>
                     <p className="text-xs text-slate-500 italic mt-3">
                        Tip: You can always manually check for updates in the About section
                     </p>
                  </div>
               </div>
            </div>
         </div>

         <AnimatePresence>
            {hasChanges && (
               <motion.div 
                  initial={{ 
                     opacity: 0, 
                     scale: 0.9, 
                     y: 20,
                     x: 20
                  }}
                  animate={{ 
                     opacity: 1, 
                     scale: 1, 
                     y: 0,
                     x: 0
                  }}
                  exit={{ 
                     opacity: 0, 
                     scale: 0.95, 
                     y: 10,
                     x: 10
                  }}
                  transition={{
                     type: "spring",
                     stiffness: 300,
                     damping: 25,
                     duration: 0.3
                  }}
                  className="fixed bottom-6 right-6 z-50"
               >
                  <motion.div 
                     className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/80 rounded-xl shadow-2xl shadow-black/20 p-4 min-w-[320px]"
                     whileHover={{ scale: 1.02 }}
                     transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                     <div className="flex items-start gap-3">
                        <motion.div 
                           className="flex-shrink-0 w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center mt-0.5"
                           initial={{ rotate: -10 }}
                           animate={{ rotate: 0 }}
                           transition={{ delay: 0.1 }}
                        >
                           <Info className="w-4 h-4 text-amber-400" />
                        </motion.div>
                        <div className="flex-1">
                           <motion.h4 
                              className="text-sm font-medium text-slate-200 mb-1"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                           >
                              Careful — you have unsaved changes!
                           </motion.h4>
                           <motion.p 
                              className="text-xs text-slate-400 mb-4"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.15 }}
                           >
                              Your customization settings have been modified but not saved yet.
                           </motion.p>
                           <motion.div 
                              className="flex gap-2"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                           >
                              <motion.button
                                 onClick={handleResetSettings}
                                 className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors duration-150"
                                 whileHover={{ scale: 1.05 }}
                                 whileTap={{ scale: 0.95 }}
                              >
                                 <RotateCcw className="w-3.5 h-3.5" />
                                 Reset
                              </motion.button>
                              <motion.button
                                 onClick={handleSaveSettings}
                                 disabled={isSaving}
                                 className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white text-xs font-medium rounded-md transition-all duration-150"
                                 whileHover={{ scale: isSaving ? 1 : 1.05 }}
                                 whileTap={{ scale: isSaving ? 1 : 0.95 }}
                              >
                                 {isSaving ? (
                                    <>
                                       <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                       Saving...
                                    </>
                                 ) : (
                                    <>
                                       <Save className="w-3.5 h-3.5" />
                                       Save Changes
                                    </>
                                 )}
                              </motion.button>
                           </motion.div>
                        </div>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
};