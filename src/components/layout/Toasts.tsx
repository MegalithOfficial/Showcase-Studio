import { toast } from 'react-hot-toast';
import { Check, AlertCircle, X, BellRing, Zap, Info, ShieldAlert } from 'lucide-react';


export const SuccessToast = (message: string) => {
   toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-gradient-to-r from-[#2b2d31] to-[#36393f] shadow-lg rounded-lg pointer-events-auto flex overflow-hidden border-l-4 border-green-500`}>
         <div className="flex-1 p-4 flex items-center">
            <div className="flex-shrink-0 bg-green-500/10 p-2 rounded-full">
               <Check size={18} className="text-green-400" />
            </div>
            <div className="ml-3 flex-1">
               <p className="text-sm font-medium text-gray-200">
                  Success
               </p>
               <p className="mt-1 text-xs text-gray-400">
                  {message}
               </p>
            </div>
            <button
               onClick={() => toast.dismiss(t.id)}
               className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-300 transition-colors"
            >
               <X size={16} />
            </button>
         </div>
      </div>
   ), { duration: 4000 });
};

export const ErrorToast = (message: string) => {
   toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-gradient-to-r from-[#2b2d31] to-[#36393f] shadow-lg rounded-lg pointer-events-auto flex overflow-hidden border-l-4 border-red-500`}>
         <div className="flex-1 p-4 flex items-center">
            <div className="flex-shrink-0 bg-red-500/10 p-2 rounded-full">
               <AlertCircle size={18} className="text-red-400" />
            </div>
            <div className="ml-3 flex-1">
               <p className="text-sm font-medium text-gray-200">
                  Error
               </p>
               <p className="mt-1 text-xs text-red-400">
                  {message}
               </p>
            </div>
            <button
               onClick={() => toast.dismiss(t.id)}
               className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-300 transition-colors"
            >
               <X size={16} />
            </button>
         </div>
      </div>
   ), { duration: 5000 });
};

export const InfoToast = (message: string) => {
   toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-gradient-to-r from-[#2b2d31] to-[#36393f] shadow-lg rounded-lg pointer-events-auto flex overflow-hidden border-l-4 border-blue-500`}>
         <div className="flex-1 p-4 flex items-center">
            <div className="flex-shrink-0 bg-blue-500/10 p-2 rounded-full">
               <Info size={18} className="text-blue-400" />
            </div>
            <div className="ml-3 flex-1">
               <p className="text-sm font-medium text-gray-200">
                  Information
               </p>
               <p className="mt-1 text-xs text-gray-400">
                  {message}
               </p>
            </div>
            <button
               onClick={(e) => {
                  e.stopPropagation()
                  console.log('Close button clicked! Toast ID:', t.id); // <-- Add this
                  toast.dismiss(t.id);
               }}
               className="ml-4 flex-shrink-0 p-1.5 rounded-full text-gray-400 hover:text-gray-100 hover:bg-gray-700/50 transition-all group z-50"
               aria-label="Close"
            >
               <X size={16} className="group-hover:scale-110 transition-transform" />
            </button>
         </div>
      </div>
   ), { duration: 4000 });
};

export const WarningToast = (message: string) => {
   toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-gradient-to-r from-[#2b2d31] to-[#36393f] shadow-lg rounded-lg pointer-events-auto flex overflow-hidden border-l-4 border-yellow-500`}>
         <div className="flex-1 p-4 flex items-center">
            <div className="flex-shrink-0 bg-yellow-500/10 p-2 rounded-full">
               <ShieldAlert size={18} className="text-yellow-400" />
            </div>
            <div className="ml-3 flex-1">
               <p className="text-sm font-medium text-gray-200">
                  Warning
               </p>
               <p className="mt-1 text-xs text-yellow-400">
                  {message}
               </p>
            </div>
            <button
               onClick={() => toast.dismiss(t.id)}
               className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-300 transition-colors"
            >
               <X size={16} />
            </button>
         </div>
      </div>
   ), { duration: 4500 });
};

export const UpdateToast = (version: string) => {
   toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-gradient-to-r from-[#2b2d31] to-[#36393f] shadow-lg rounded-lg pointer-events-auto overflow-hidden`}>
         <div className="flex-1 p-4">
            <div className="flex items-center">
               <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-md bg-blue-500 flex items-center justify-center text-white">
                     <Zap size={20} />
                  </div>
               </div>
               <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-200">
                     Update Available
                  </p>
                  <div className="mt-1 flex items-center">
                     <span className="text-xs text-gray-400">
                        Version <span className="font-medium text-blue-400">{version}</span> is now available
                     </span>
                  </div>
               </div>
            </div>
         </div>
         <div className="bg-[#2f3136] px-4 py-3 flex justify-between items-center border-t border-gray-700">
            <span className="text-xs text-gray-400 flex items-center">
               <Info size={12} className="mr-1" />
               New features and bug fixes
            </span>
            <div className="flex space-x-2">
               <button
                  onClick={() => toast.dismiss(t.id)}
                  className="text-sm text-gray-400 hover:text-gray-300 transition-colors font-medium"
               >
                  Later
               </button>
               <button
                  onClick={() => {
                     toast.dismiss(t.id);
                     SuccessToast("Update scheduled for next restart");
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
               >
                  Update Now
               </button>
            </div>
         </div>
      </div>
   ), { duration: 10000 });
};

export const NotificationToast = (title: string, message: string) => {
   toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-gradient-to-r from-[#2b2d31] to-[#36393f] shadow-lg rounded-lg pointer-events-auto overflow-hidden`}>
         <div className="flex-1 p-4">
            <div className="flex items-center">
               <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-md bg-purple-500 flex items-center justify-center text-white">
                     <BellRing size={20} />
                  </div>
               </div>
               <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-200">
                     {title}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                     {message}
                  </p>
               </div>
            </div>
         </div>
         <div className="bg-[#2f3136] px-4 py-3 flex justify-between items-center border-t border-gray-700">
            <span className="text-xs text-gray-400">
               {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="flex space-x-2">
               <button
                  onClick={() => toast.dismiss(t.id)}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
               >
                  Dismiss
               </button>
            </div>
         </div>
      </div>
   ), { duration: 6000 });
};