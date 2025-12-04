import { useState, useCallback } from 'react';

export interface LaunchErrorDisplay {
  title: string;
  description: string;
  extraText?: string;
  unexpected?: boolean;
}

export interface UseLaunchExceptionReturn {
  error: LaunchErrorDisplay | null;
  onException: (exception: any) => void;
  onError: (error: unknown) => void;
  clearError: () => void;
}

// Phase 2.2: Error mapping logic moved from utils/errorMapping.ts
// This function is now internal to the hook (matches Vue's launchException.ts pattern)
function getLaunchErrorMessage(e: any): LaunchErrorDisplay {
  // Handle structured LaunchException types
  if (e && typeof e === 'object') {
    // Missing version
    if (e.type === 'missingVersion' || e.error === 'missing-version') {
      return {
        title: 'Missing Version',
        description: `Minecraft version ${e.version || 'unknown'} is not installed.`,
        extraText: 'Click "Install" to download the required version.',
        unexpected: false,
      };
    }

    // Missing Java
    if (e.type === 'missingJava' || e.error === 'missing-java') {
      return {
        title: 'Missing Java',
        description: `Java ${e.javaVersion || 'unknown'} is required but not found.`,
        extraText: 'Please install Java from the Settings page.',
        unexpected: false,
      };
    }

    // Incompatible Java
    if (e.type === 'incompatibleJava' || e.error === 'incompatible-java') {
      return {
        title: 'Incompatible Java',
        description: `Java version ${e.currentVersion || 'unknown'} is not compatible with this instance.`,
        extraText: `Required: Java ${e.requiredVersion || 'unknown'}. Please select a compatible Java installation.`,
        unexpected: false,
      };
    }

    // Missing libraries
    if (e.type === 'missingLibraries' || e.error === 'missing-libraries') {
      return {
        title: 'Missing Libraries',
        description: `${e.count || 'Some'} required libraries are missing.`,
        extraText: 'Click "Install" to download missing libraries.',
        unexpected: false,
      };
    }

    // Missing assets
    if (e.type === 'missingAssets' || e.error === 'missing-assets') {
      return {
        title: 'Missing Assets',
        description: `${e.count || 'Some'} game assets are missing.`,
        extraText: 'Click "Install" to download missing assets.',
        unexpected: false,
      };
    }

    // No user selected
    if (e.type === 'noUser' || e.error === 'no-user') {
      return {
        title: 'No User Selected',
        description: 'Please log in with a Minecraft account before launching.',
        extraText: 'Go to Settings > Account to add an account.',
        unexpected: false,
      };
    }

    // Launch general exception
    if (e.type === 'launchGeneralException' || e.exception) {
      return {
        title: 'Launch Failed',
        description: 'An unexpected error occurred while launching the game.',
        extraText: e.exception?.message || e.message || JSON.stringify(e),
        unexpected: true,
      };
    }

    // Generic error object with message
    if (e.message) {
      return {
        title: 'Launch Error',
        description: e.message,
        extraText: e.stack,
        unexpected: true,
      };
    }
  }

  // Fallback for unknown error types
  return {
    title: 'Unknown Error',
    description: 'An unexpected error occurred.',
    extraText: typeof e === 'string' ? e : JSON.stringify(e),
    unexpected: true,
  };
}

export function useLaunchException(): UseLaunchExceptionReturn {
  const [error, setError] = useState<LaunchErrorDisplay | null>(null);

  // Phase 2.2: onException handler for structured LaunchException errors
  const onException = useCallback((exception: any) => {
    const errorDisplay = getLaunchErrorMessage(exception);
    setError(errorDisplay);
  }, []);

  // Phase 2.2: onError handler for generic JS errors
  const onError = useCallback((err: unknown) => {
    const errorDisplay = getLaunchErrorMessage(err);
    setError(errorDisplay);
  }, []);

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