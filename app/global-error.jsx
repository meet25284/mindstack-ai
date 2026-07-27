'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log root layout error to console or error service
    console.error('Fatal root layout error caught by app/global-error.jsx:', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 font-sans min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/90 border border-red-900/50 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-600/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">System Critical Error</h1>
            <p className="text-sm text-slate-400">
              A fatal error occurred in the application root layout.
            </p>
          </div>

          {isDev && error?.message && (
            <div className="text-left bg-red-950/50 border border-red-900/60 rounded-xl p-4 overflow-x-auto max-h-40 text-xs font-mono text-red-300">
              <p className="font-semibold text-red-400 mb-1">Development Error Message:</p>
              {error.message}
              {error.digest && (
                <p className="mt-2 text-[10px] text-slate-400">Digest: {error.digest}</p>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => reset()}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
