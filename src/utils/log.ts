import { info as feInfo, warn as feWarn, error as feError } from './frontendLogger';

/**
 * Console Logger Utility Bundle
 * A set of enhanced logging functions for prettier, more informative console output
 */
interface LoggerStyles {
   title: string;
   success: string;
   info: string;
   warning: string;
   error: string;
   debug: string;
   trace: string;
   groupCollapsed: string;
   highlight: string;
}

const Logger = {
   // Style constants
   styles: {
      title: 'font-weight: bold; font-size: 1.2em;',
      success: 'color: #4CAF50; font-weight: bold;',
      info: 'color: #2196F3; font-weight: bold;',
      warning: 'color: #FF9800; font-weight: bold;',
      error: 'color: #F44336; font-weight: bold;',
      debug: 'color: #9C27B0; font-weight: bold;',
      trace: 'color: #607D8B; font-style: italic;',
      groupCollapsed: 'font-weight: bold; color: #777;',
      highlight: 'background: #FFFF00; color: #000; padding: 2px 4px; border-radius: 2px;'
   } as LoggerStyles,

   timestamp(): string {
      return `[${new Date().toISOString()}]`;
   },

   formatModule(module?: string): string {
      return module ? `[${module}]` : '';
   },

   success(message: string, data?: any, module?: string): void {
      console.log(
         `%c${this.timestamp()} ${this.formatModule(module)} ✓ SUCCESS: %c${message}`,
         this.styles.success,
         '',
         data || ''
      );
      if (data) console.dir(data);
   },

   info(message: string, data?: any, module?: string): void {
      // Backend logging (only the main message)
      feInfo(module ? `[${module}] ${message}` : message);

      // Existing console logging
      console.log(
         `%c${this.timestamp()} ${this.formatModule(module)} ℹ INFO: %c${message}`,
         this.styles.info,
         '',
         data || ''
      );
      if (data) console.dir(data);
   },

   warn(message: string, data?: any, module?: string): void {
      // Backend logging (only the main message)
      feWarn(module ? `[${module}] ${message}` : message);

      // Existing console logging
      console.log(
         `%c${this.timestamp()} ${this.formatModule(module)} ⚠ WARNING: %c${message}`,
         this.styles.warning,
         '',
         data || ''
      );
      if (data) console.dir(data);
   },

   error(message: string, errorObj?: Error | any, module?: string): void {
      // Backend logging
      feError(module ? `[${module}] ${message}` : message, errorObj);

      // Existing console logging
      console.log(
         `%c${this.timestamp()} ${this.formatModule(module)} ✖ ERROR: %c${message}`,
         this.styles.error,
         ''
      );
      if (errorObj) {
         if (errorObj instanceof Error) {
            console.error(errorObj);
         } else {
            console.dir(errorObj);
         }
      }
   },

   debug(message: string, data?: any, module?: string): void {
      console.log(
         `%c${this.timestamp()} ${this.formatModule(module)} 🔍 DEBUG: %c${message}`,
         this.styles.debug,
         '',
         data || ''
      );
      if (data) console.dir(data);
   },

   group(title: string, collapsed: boolean = false): void {
      const method = collapsed ? 'groupCollapsed' : 'group';
      console[method](`%c${title}`, this.styles.title);
   },

   groupEnd(): void {
      console.groupEnd();
   },

   async time<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
      console.time(`⏱️ ${label}`);
      const result = fn instanceof Promise ? await fn : fn();
      console.timeEnd(`⏱️ ${label}`);
      return result;
   },

   highlight(message: string, highlightedValue: any, module?: string): void {
      console.log(
         `%c${this.timestamp()} ${this.formatModule(module)}: ${message} %c${JSON.stringify(highlightedValue)}`,
         '',
         this.styles.highlight
      );
   },

   table(title: string, data: any[]): void {
      console.log(`%c${this.timestamp()} 📊 ${title}:`, this.styles.info);
      console.table(data);
   },
};

export default Logger;