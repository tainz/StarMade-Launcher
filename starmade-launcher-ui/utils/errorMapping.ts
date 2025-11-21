import { LaunchException } from '@xmcl/runtime-api';

export interface LaunchErrorDisplay {
  title: string;
  description: string;
  extraText?: string;
}

/**
 * Maps backend errors to user-friendly UI messages.
 * Mirrors logic from xmcl-keystone-ui/src/composables/launchException.ts
 */
export const getLaunchErrorMessage = (e: any): LaunchErrorDisplay => {
  // Handle nested exception object (common in IPC errors)
  // The backend often sends { exception: { type: ... }, name: ... }
  const exception = e?.exception || e;

  // Check if it's a structured LaunchException from backend
  if (exception && typeof exception === 'object' && 'type' in exception) {
    switch (exception.type) {
      case 'launchInvalidJavaPath':
        return { 
          title: 'Invalid Java Path', 
          description: `The Java path is invalid: ${exception.javaPath}. Please check your installation settings.` 
        };
      case 'launchJavaNoPermission':
        return {
          title: 'Java Permission Denied',
          description: `The launcher does not have permission to execute Java at: ${exception.javaPath}. Check your antivirus or file permissions.`
        };
      case 'launchNoProperJava':
        return { 
          title: 'No Java Found', 
          description: `No compatible Java version found for Minecraft ${exception.version || 'unknown'}. Please install the recommended Java version.` 
        };
      case 'launchNoVersionInstalled':
        return { 
          title: 'Version Not Installed', 
          description: `The version ${exception.options?.version} is not fully installed. Please try repairing the installation.` 
        };
      case 'launchBadVersion':
        return {
          title: 'Bad Version',
          description: `The version ${exception.version} is invalid or corrupted.`
        };
      case 'launchSpawnProcessFailed':
        return {
          title: 'Process Spawn Failed',
          description: 'Failed to start the game process. This might be due to system restrictions or missing files.'
        };
      case 'launchGeneralException':
      default:
         return {
            title: 'Launch Failed',
            description: 'An unexpected error occurred during the launch sequence.'
         }
    }
  }
  
  // Fallback for generic JS errors
  const msg = e instanceof Error ? e.message : String(e);
  return { 
    title: 'Launch Failed', 
    description: msg || 'An unexpected error occurred while trying to launch the game.' 
  };
};
