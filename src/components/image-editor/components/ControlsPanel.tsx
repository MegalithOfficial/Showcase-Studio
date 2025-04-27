import React from 'react';
import { motion } from 'framer-motion';
import { Layers, ArrowLeftRight, MessageSquare, User, Save, Loader2 } from 'lucide-react';
import ControlSection from './ControlSection';
import { EditableImage } from '../../../utils/types';
import { OVERLAY_MIN_WIDTH, OVERLAY_MAX_WIDTH } from '../constants';

interface ControlsPanelProps {
   selectedImage: EditableImage;
   onUpdateOverlay: (updates: Partial<EditableImage['overlay']>) => void;
   onUpdateField: (field: keyof EditableImage, value: any) => void;
   onSaveChanges: () => void;
   isSaving: boolean;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
   selectedImage,
   onUpdateOverlay,
   onUpdateField,
   onSaveChanges,
   isSaving
}) => {
   const { overlay, message } = selectedImage; 

   const handleOverlayChange = (key: keyof EditableImage['overlay'], value: any) => {
      onUpdateOverlay({ [key]: value });
   };

   const positionOptions = [
      { value: 'top-left', label: 'Top Left' },
      { value: 'top-right', label: 'Top Right' },
      { value: 'bottom-left', label: 'Bottom Left' },
      { value: 'bottom-right', label: 'Bottom Right' },
      { value: 'hidden', label: 'Hidden' }
   ] as const; 

   const styleOptions = [
      { value: 'black', label: 'Dark' },
      { value: 'white', label: 'Light' },
   ] as const;

   return (
      <div className="space-y-3">
         {/* Position Controls */}
         <ControlSection title="Overlay Position" icon={<Layers className="w-2.5 h-2.5 text-indigo-400" />}>
            <div className="grid grid-cols-2 gap-2">
               {positionOptions.map(({ value, label }) => (
                  <button
                     key={value}
                     onClick={() => handleOverlayChange('position', value)}
                     className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${overlay.position === value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-800'
                        }`}
                     aria-pressed={overlay.position === value}
                  >
                     {label}
                  </button>
               ))}
            </div>
         </ControlSection>

         {/* Width Control */}
         <ControlSection title="Overlay Width" icon={<ArrowLeftRight className="w-2.5 h-2.5 text-indigo-400" />}>
            <div className="flex items-center justify-between mb-1">
               <span className="text-xs text-gray-400">{overlay.width}px</span>
            </div>
            <input
               type="range"
               min={OVERLAY_MIN_WIDTH}
               max={OVERLAY_MAX_WIDTH}
               value={overlay.width}
               onChange={(e) => handleOverlayChange('width', parseInt(e.target.value))}
               className="w-full accent-indigo-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
               disabled={overlay.position === 'hidden'}
               aria-label="Overlay width"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
               <span>Narrow</span>
               <span>Wide</span>
            </div>
         </ControlSection>

         {/* Style Control */}
         <ControlSection title="Overlay Style">
            <div className="space-y-3">
               <div className="grid grid-cols-2 gap-2">
                  {styleOptions.map(({ value, label }) => (
                     <button
                        key={value}
                        onClick={() => handleOverlayChange('style', value)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${overlay.style === value
                           ? 'bg-indigo-600 text-white'
                           : 'bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-800'
                           }`}
                        aria-pressed={overlay.style === value}
                     >
                        {label}
                     </button>
                  ))}
               </div>

               <div className="space-y-1">
                  <div className="flex items-center justify-between">
                     <label htmlFor="transparency-slider" className="text-xs text-gray-400">Transparency</label>
                     <span className="text-xs text-gray-500">{overlay.transparency}%</span>
                  </div>
                  <input
                     id="transparency-slider"
                     type="range"
                     min="0"
                     max="100"
                     value={overlay.transparency}
                     onChange={(e) => handleOverlayChange('transparency', parseInt(e.target.value))}
                     className="w-full accent-indigo-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                     disabled={overlay.position === 'hidden'}
                     aria-label="Overlay transparency"
                  />
               </div>
            </div>
         </ControlSection>

         {/* User Info Control */}
         <ControlSection title="User Information" icon={<User className="w-2.5 h-2.5 text-indigo-400" />}>
            <div className="space-y-3">
               <div>
                  <label htmlFor="message-input" className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                     <MessageSquare className="w-3 h-3" /> Message
                  </label>
                  <textarea
                     id="message-input"
                     value={message}
                     onChange={(e) => onUpdateField('message', e.target.value)}
                     rows={2}
                     className="w-full rounded-md bg-gray-800/50 border border-gray-700/50 text-gray-200 text-sm p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                     placeholder="Message text..."
                     disabled={overlay.position === 'hidden'}
                  />
               </div>

               <div className="flex items-center justify-between">
                  <label htmlFor="avatar-toggle" className="text-xs text-gray-400">Show Avatar</label>
                  <button
                     id="avatar-toggle"
                     onClick={() => handleOverlayChange('showAvatar', !overlay.showAvatar)}
                     className={`relative w-10 h-5 rounded-full transition-colors ${overlay.showAvatar
                        ? 'bg-indigo-600'
                        : 'bg-gray-700'
                        } disabled:opacity-60`}
                     disabled={overlay.position === 'hidden'}
                     aria-pressed={overlay.showAvatar}
                  >
                     <motion.div
                        className="absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full" // Adjusted left positioning
                        initial={false}
                        animate={{
                           x: overlay.showAvatar ? 20 : 0 // Animate x position
                        }}
                        transition={{ duration: 0.15 }}
                     />
                  </button>
               </div>
            </div>
         </ControlSection>

         {/* Save Button */}
         <button
            onClick={onSaveChanges}
            disabled={isSaving}
            className="w-full mt-3 py-2 rounded-md text-sm bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:hover:bg-indigo-600"
         >
            {isSaving ? (
               <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
               </>
            ) : (
               <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
               </>
            )}
         </button>
      </div>
   );
};

export default ControlsPanel;