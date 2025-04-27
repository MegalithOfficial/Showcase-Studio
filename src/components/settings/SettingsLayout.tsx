import { Outlet, useNavigate } from 'react-router-dom';
import SettingsSidebar from './SettingsSidebar';
import { Key, Database, HardDrive, Info, X, } from 'lucide-react';

const settingsSections = [
   { id: 'api', path: 'api', label: 'API Tokens', icon: Key },
   { id: 'indexing', path: 'indexing', label: 'Indexing', icon: Database },
   { id: 'storage', path: 'storage', label: 'Data & Storage', icon: HardDrive },
   { id: 'about', path: 'about', label: 'About', icon: Info },
];

export const SettingsLayout: React.FC = () => {
   const navigate = useNavigate();

   const handleClose = () => {
      navigate('/');
   };
   return (
      <div className={`flex h-screen bg-black text-slate-200 overflow-hidden opacity-100 transition-opacity duration-300`}>
         <SettingsSidebar settingsSections={settingsSections} />
         <div className="flex-1 overflow-auto p-6 relative">
            <div className="absolute top-5 right-8 z-50">
               <button
                  onClick={handleClose}
                  className="p-1.5 rounded-full border border-gray-700 hover:bg-red-500/80 text-slate-400 hover:text-white hover:border-transparent transition-all"
                  title="Close Settings"
               >
                  <X className="h-5.5 w-5.5" />
               </button>
            </div>
            <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-indigo-900/5 rounded-full filter blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-indigo-800/5 rounded-full filter blur-3xl pointer-events-none"></div>
            <div className={`relative z-10 max-w-5xl mx-auto`}>
               <Outlet />
            </div>
         </div>
      </div>
   );
};    