'use client';

import { useEffect } from 'react';

/**
 * Client component that registers global listeners for uncaught window errors
 * and unhandled promise rejections outside React's render cycle.
 */
export default function GlobalErrorListener() {
  useEffect(() => {
    const handleGlobalError = (event) => {
      console.error('[Global Uncaught Error]:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    const handleUnhandledRejection = (event) => {
      console.error('[Unhandled Promise Rejection]:', event.reason);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
