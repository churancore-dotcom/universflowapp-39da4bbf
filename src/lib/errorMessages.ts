/**
 * Utility for mapping database/API errors to user-friendly messages.
 * This prevents sensitive database details from being exposed to users.
 */

interface ErrorWithCode {
  code?: string;
  message?: string;
}

/**
 * Maps database and API errors to safe, user-friendly messages.
 * Logs the full error for debugging while returning generic messages to users.
 */
export const getUserFriendlyError = (error: ErrorWithCode | Error | unknown, context?: string): string => {
  // Log the full error for debugging (acceptable in browser console)
  console.error(`Error in ${context || 'operation'}:`, error);

  // Handle null/undefined
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  const err = error as ErrorWithCode;

  // PostgreSQL error codes
  if (err.code) {
    switch (err.code) {
      // Unique constraint violation
      case '23505':
        return 'This item already exists.';
      // Foreign key violation
      case '23503':
        return 'Invalid reference. The related item may have been deleted.';
      // Check constraint violation
      case '23514':
        return 'The provided data is invalid. Please check your input.';
      // Not null violation
      case '23502':
        return 'Required information is missing.';
      // Permission denied
      case '42501':
        return 'You do not have permission to perform this action.';
      // Invalid text representation
      case '22P02':
        return 'Invalid data format. Please check your input.';
      // String too long
      case '22001':
        return 'The text you entered is too long.';
      // Authentication errors
      case 'PGRST301':
        return 'Authentication required. Please sign in.';
      default:
        break;
    }
  }

  // Check for specific error message patterns
  const message = err.message?.toLowerCase() || '';

  // Auth-related errors - be careful not to expose user enumeration
  if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
    return 'Invalid email or password.';
  }
  if (message.includes('email already registered') || message.includes('user already registered')) {
    return 'An account with this email already exists.';
  }
  if (message.includes('password') && message.includes('weak')) {
    return 'Password is too weak. Please use a stronger password.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please verify your email address.';
  }
  if (message.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  // Storage-related errors
  if (message.includes('storage') || message.includes('bucket') || message.includes('upload')) {
    return 'File upload failed. Please try again.';
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'Connection error. Please check your internet and try again.';
  }

  // Generic fallback
  return 'An error occurred. Please try again.';
};

/**
 * Specific error handler for authentication operations
 */
export const getAuthError = (error: ErrorWithCode | Error | unknown): string => {
  return getUserFriendlyError(error, 'authentication');
};

/**
 * Specific error handler for upload operations
 */
export const getUploadError = (error: ErrorWithCode | Error | unknown): string => {
  return getUserFriendlyError(error, 'upload');
};

/**
 * Specific error handler for database operations
 */
export const getDatabaseError = (error: ErrorWithCode | Error | unknown): string => {
  return getUserFriendlyError(error, 'database');
};
