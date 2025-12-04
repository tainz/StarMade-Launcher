/**
 * components/hooks/useLaunchException.ts
 * 
 * Hook to manage launch exception state and error mapping.
 * Mirrors Vue's launchException.ts composable.
 * 
 * Responsibilities:
 * - Maintains reactive error state (title, description, extraText, unexpected)
 * - Provides onException/onError handlers that map errors to UI-friendly messages
 * - Used internally by useInstanceLaunch to encapsulate error handling
 */

import { useState, useCallback } from 'react';
import { getLaunchErrorMessage, LaunchErrorDisplay } from '../../utils/errorMapping';

export interface UseLaunchExceptionReturn {
  /**
   * Current error state (null if no error)
   */
  error: LaunchErrorDisplay | null;

  /**
   * Handler for structured LaunchException errors from backend
   */
  onException: (exception: any) => void;

  /**
   * Handler for generic JS errors
   */
  onError: (error: unknown) => void;

  /**
   * Clear the current error
   */
  clearError: () => void;
}

/**
 * Hook to manage launch exception state and error mapping.
 * 
 * This hook centralizes the logic for mapping backend launch exceptions
 * and generic JS errors into user-friendly error messages. It mirrors
 * Vue's launchException.ts composable.
 * 
 * @returns Error state and handlers
 */
export function useLaunchException(): UseLaunchExceptionReturn {
  const [error, setError] = useState<LaunchErrorDisplay | null>(null);

  /**
   * Handle structured LaunchException from backend.
   * Maps exception type to user-friendly message.
   */
  const onException = useCallback((exception: any) => {
    const errorDisplay = getLaunchErrorMessage(exception);
    setError(errorDisplay);
  }, []);

  /**
   * Handle generic JS errors.
   * Extracts message and wraps in LaunchErrorDisplay.
   */
  const onError = useCallback((err: unknown) => {
    const errorDisplay = getLaunchErrorMessage(err);
    setError(errorDisplay);
  }, []);

  /**
   * Clear the current error.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    onException,
    onError,
    clearError,
  };
}