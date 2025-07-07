import React from 'react';
import { Listbox } from '@headlessui/react';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { useFloating, offset, flip, size, autoUpdate } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion'; 
import { createPortal } from 'react-dom';

export interface SelectOption {
   value: string;
   label: string;
   secondaryLabel?: string;
   icon?: React.ReactNode;
}

interface HeadlessFloatingSelectProps {
   options: SelectOption[];
   value: string | null; 
   onChange: (value: string | null) => void;
   placeholder?: string;
   disabled?: boolean;
   loading?: boolean;
   className?: string;
   listClassName?: string; 
}

const dropdownVariants = {
   hidden: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.15 }
   },
   visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, ease: 'easeOut' }
   },
   exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.15, ease: 'easeIn' }
   }
};


export const HeadlessFloatingSelect: React.FC<HeadlessFloatingSelectProps> = ({
   options,
   value,
   onChange,
   placeholder = "Select...",
   disabled = false,
   loading = false,
   className = '',
   listClassName = '',
}) => {
   const selectedOption = options.find(opt => opt.value === value) || null;

   const { refs, floatingStyles } = useFloating({
      placement: "bottom-start",
      strategy: 'fixed',
      whileElementsMounted: autoUpdate, 
      middleware: [
         offset(4), 
         flip({ padding: 8 }), 
         size({ 
            apply({ rects, availableHeight, elements }) {
               Object.assign(elements.floating.style, {
                  maxHeight: `${Math.min(availableHeight, 240)}px`,
                  width: `${rects.reference.width}px`,
               });
            },
            padding: 8,
         }),
      ],
   });

   const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled && !loading) {
         onChange(null);
      }
   };


   return (
      <Listbox value={value} onChange={onChange} disabled={disabled || loading}>
         {({ open }) => ( 
            <div className={`relative ${className}`}>
               <Listbox.Button
                  ref={refs.setReference}
                  className={`relative w-full flex items-center pl-3 pr-10 py-2 bg-gray-800 border rounded-lg shadow-sm text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition duration-150 ease-in-out ${disabled || loading ? 'bg-gray-700/50 cursor-not-allowed text-slate-500' : 'hover:border-gray-600 text-slate-100'} ${value ? 'border-gray-700' : 'border-gray-700'}`}
               >
                  <span className="flex-grow flex items-center min-w-0">
                     {loading ? (
                        <span className="flex items-center text-sm text-slate-500 italic">
                           <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...
                        </span>
                     ) : selectedOption ? (
                        <>
                           {selectedOption.icon && <span className="mr-2 flex-shrink-0">{selectedOption.icon}</span>}
                           <span className="block truncate text-sm">{selectedOption.label}</span>
                           {selectedOption.secondaryLabel && <span className="ml-2 text-xs text-slate-500 truncate flex-shrink-0">{selectedOption.secondaryLabel}</span>}
                        </>
                     ) : (
                        <span className="block truncate text-sm text-slate-500">{placeholder}</span>
                     )}
                  </span>

                  {/* Clear Button */}
                  {value && !disabled && !loading && (
                     <span className="absolute inset-y-0 right-6 flex items-center px-1 z-10">
                        <button
                           type="button"
                           onClick={handleClear}
                           className="p-0.5 rounded-full text-slate-500 hover:text-slate-200 hover:bg-gray-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                           aria-label="Clear selection"
                        >
                           <X className="h-3.5 w-3.5" />
                        </button>
                     </span>
                  )}

                  {/* Dropdown Arrow */}
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                     <ChevronsUpDown
                        className={`h-5 w-5 text-gray-400 transition-opacity duration-150 ${loading || disabled ? 'opacity-50' : ''}`}
                        aria-hidden="true"
                     />
                  </span>
               </Listbox.Button>

               {/* Dropdown Options Panel */}
               {open &&
                  createPortal(
                     <AnimatePresence>
                        {open && (
                           <div
                              ref={refs.setFloating}
                              style={floatingStyles}
                              className="z-50"
                           >
                              <motion.div
                                 variants={dropdownVariants}
                                 initial="hidden"
                                 animate="visible"
                                 exit="hidden"
                                 className={`bg-gray-900 shadow-xl rounded-lg ring-1 ring-gray-700 overflow-hidden focus:outline-none flex flex-col ${listClassName}`}
                              >
                                 <Listbox.Options
                                    static
                                    className="overflow-auto py-1 text-base focus:outline-none sm:text-sm max-h-[240px]"
                                 >
                                    {options.length > 0 ? (
                                       options.map((option) => (
                                          <Listbox.Option
                                             key={option.value}
                                             className={({ active }) =>
                                                `relative cursor-pointer select-none py-2 pl-3 pr-9 transition-colors duration-100 ${active ? 'bg-gray-700/80 text-white' : 'text-slate-200'
                                                }`
                                             }
                                             value={option.value}
                                          >
                                             {({ selected, active }) => (
                                                <div className="flex items-center justify-between">
                                                   {/* Option Content */}
                                                   <div className="flex items-center min-w-0">
                                                      {option.icon && <span className="mr-2 flex-shrink-0">{option.icon}</span>}
                                                      <span className={`block truncate text-sm ${selected ? 'font-medium' : 'font-normal'}`}>
                                                         {option.label}
                                                      </span>
                                                   </div>
                                                   {option.secondaryLabel && (
                                                      <span className={`ml-2 text-xs truncate flex-shrink-0 ${selected ? 'text-indigo-100' : 'text-slate-500'}`}>
                                                         {option.secondaryLabel}
                                                      </span>
                                                   )}

                                                   {/* Show checkmark if selected */}
                                                   {selected ? (
                                                      <span className={`absolute inset-y-0 right-0 flex items-center pr-3 ${active ? 'text-white' : 'text-indigo-400'}`}>
                                                         <Check className="h-4 w-4" aria-hidden="true" />
                                                      </span>
                                                   ) : null}
                                                </div>
                                             )}
                                          </Listbox.Option>
                                       ))
                                    ) : (
                                       <div className="relative cursor-default select-none py-2 px-4 text-slate-500 text-sm italic text-center">
                                          No options available
                                       </div>
                                    )}
                                 </Listbox.Options>
                              </motion.div>
                           </div>
                        )}
                     </AnimatePresence>,
                     document.body
                  )
               }
            </div>
         )}
      </Listbox>
   );
};