import { NextResponse } from 'next/server';

/**
 * Custom Error class for API responses with explicit HTTP status code.
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

/**
 * Higher-order function wrapper for Next.js App Router API route handlers.
 * Catches errors, logs them, and formats standardized JSON error responses.
 *
 * @param {Function} handler - API handler function `async (req, context) => NextResponse`
 * @returns {Function} Wrapped API route handler
 *
 * @example
 * export const GET = withApiErrorHandler(async (req) => {
 *   // throw new ApiError("Unauthorized", 401);
 *   return NextResponse.json({ success: true, data: [] });
 * });
 */
export function withApiErrorHandler(handler) {
  return async function wrappedHandler(req, context) {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error(`[API Error] ${req.method} ${req.url}:`, error);

      if (error instanceof ApiError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            ...(error.data ? { data: error.data } : {}),
          },
          { status: error.statusCode }
        );
      }

      const statusCode = error.status || error.statusCode || 500;
      const message =
        process.env.NODE_ENV === 'development'
          ? error.message || 'Internal Server Error'
          : statusCode === 500
          ? 'Internal Server Error'
          : error.message || 'An unexpected error occurred';

      return NextResponse.json(
        {
          success: false,
          error: message,
          ...(process.env.NODE_ENV === 'development' && error.stack
            ? { stack: error.stack }
            : {}),
        },
        { status: statusCode }
      );
    }
  };
}
