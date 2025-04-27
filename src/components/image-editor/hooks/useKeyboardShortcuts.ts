import { useEffect } from 'react';

type ShortcutHandler = () => void;
type ShortcutMap = Record<string, ShortcutHandler>;

export function useKeyboardShortcuts(handlers: ShortcutMap) {
   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         let keyHandled = false;

         if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && handlers.next) {
            handlers.next();
            keyHandled = true;
         } else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && handlers.previous) {
            handlers.previous();
            keyHandled = true;
         } else if (e.key === 'Enter' && handlers.save) {
            handlers.save();
            keyHandled = true;
         } else if (e.key === 's' && (e.ctrlKey || e.metaKey) && handlers.save) {
            handlers.save();
            keyHandled = true;
         }

         if (keyHandled) {
            e.preventDefault();
         }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
         window.removeEventListener('keydown', handleKeyDown);
      };
   }, [handlers]); 
}