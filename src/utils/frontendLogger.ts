import { invoke } from '@tauri-apps/api/core';

/**
 * Logs an informational message to the backend.
 * Falls back to console.info if backend invocation fails.
 * @param message The message to log.
 */
export const info = async (message: string): Promise<void> => {
   try {
      await invoke('log_frontend_info', { message });
   } catch (error) {
      console.error("Failed to send info log to backend:", error);
      console.info(`Original Frontend Info: ${message}`); // Fallback
   }
};

/**
 * Logs a warning message to the backend.
 * Falls back to console.warn if backend invocation fails.
 * @param message The message to log.
 */
export const warn = async (message: string): Promise<void> => {
   try {
      await invoke('log_frontend_warn', { message });
   } catch (error) {
      console.error("Failed to send warn log to backend:", error);
      console.warn(`Original Frontend Warn: ${message}`); // Fallback
   }
};

/**
 * Serializes an error object into a string for logging.
 * @param errorObj The error object or any value to serialize.
 * @returns A string representation of the error, or undefined.
 */
const serializeErrorDetails = (errorObj?: any): string | undefined => {
   if (errorObj === undefined || errorObj === null) {
      return undefined;
   }
   if (errorObj instanceof Error) {
      return JSON.stringify({
         name: errorObj.name,
         message: errorObj.message,
         stack: errorObj.stack,
      });
   }
   if (typeof errorObj === 'object') {
      try {
         return JSON.stringify(errorObj);
      } catch (e) {
         // Handle circular references or other stringification errors
         return `Unserializable Object: ${String(errorObj)}`;
      }
   }
   return String(errorObj);
};

/**
 * Logs an error message to the backend.
 * Includes details from an error object if provided.
 * Falls back to console.error if backend invocation fails.
 * @param message The primary error message.
 * @param errorObj Optional error object or additional details.
 */
export const error = async (message: string, errorObj?: any): Promise<void> => {
   try {
      const errorDetails = serializeErrorDetails(errorObj);
      await invoke('log_frontend_error', { message, errorDetails });
   } catch (invokeErr) {
      console.error("Failed to send error log to backend:", invokeErr);
      // Fallback to console.error, trying to preserve original error info
      if (errorObj) {
         console.error(`Original Frontend Error: ${message}`, errorObj);
      } else {
         console.error(`Original Frontend Error: ${message}`);
      }
   }
};

// Optional: A debug logger, though backend currently filters out debug level.
// If backend log level is changed, this could be useful.
/**
 * Logs a debug message. Currently, backend might filter this out.
 * Falls back to console.debug if backend invocation fails.
 * @param message The message to log.
 */
// export const debug = async (message: string): Promise<void> => {
//   try {
//     // Assuming a 'log_frontend_debug' command might exist or be added later
//     // await invoke('log_frontend_debug', { message });
//     // For now, as backend filters debug, we can just console.debug it
//     console.debug(`Frontend Debug: ${message}`);
//   } catch (error) {
//     console.error("Failed to send debug log to backend:", error);
//     console.debug(`Original Frontend Debug: ${message}`); // Fallback
//   }
// };

const frontendLogger = {
   info,
   warn,
   error,
   // debug, // Uncomment if debug is implemented
};

export default frontendLogger;