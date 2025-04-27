import React from 'react';

interface ControlSectionProps {
   title: string;
   icon?: React.ReactNode; 
   children: React.ReactNode;
   className?: string; 
}

const ControlSection: React.FC<ControlSectionProps> = ({ title, icon, children, className = '' }) => {
   return (
      <div className={`bg-gray-900/30 rounded-lg border border-gray-800/50 p-3 ${className}`}>
         <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            {icon && (
               <div className="w-4 h-4 flex items-center justify-center bg-indigo-500/20 rounded-md flex-shrink-0">
                  {icon}
               </div>
            )}
            {title}
         </h3>
         {children}
      </div>
   );
};

export default ControlSection;