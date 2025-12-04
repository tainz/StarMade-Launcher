/**
 * components/hooks/useInstanceLaunch.ts
 * 
 * REFACTOR NOTES (Phase 2.2):
 * - Now uses useLaunchException internally to handle error mapping
 * - Exposes exception hook's error state and clearError method
 * - All error mapping centralized in useLaunchException
 */

import { useState, useEffect, useCallback } from 'react';
import { LaunchServiceKey, LaunchOptions } from '@xmcl/runtime-api';
import { useService } from './useService';
import { useLaunchException } from './useLaunchException'; // NEW

export function useInstanceLaunch() {
  const launchService = useService(LaunchServiceKey);

  // NEW: Launch exception hook (Phase 2.2)
  const { error: launchError, onException, onError, clearError: clearLaunchError } = useLaunchException();

  const [isLaunching, setIsLaunching] = useState(false);

  // State for GameExitModal (AppGameExitDialog)
  const [gameExitError, setGameExitError] = useState<{
    code: number;
    crashReport?: string;
    crashReportLocation?: string;
    errorLog?: string;
  } | null>(null);

  // 1. Handle Game Exit / Crash Events
  useEffect(() => {
    const handleMinecraftExit = (
      rawExit: any,
      rawSignal?: any,
      rawCrashReport?: any,
      rawCrashReportLocation?: any,
      rawErrorLog?: any
    ) => {
      const normalized =
        rawExit && typeof rawExit === 'object' && ('code' in rawExit || 'exitCode' in rawExit)
          ? { ...rawExit, exitCode: rawExit.exitCode ?? rawExit.code }
          : { code: rawExit, signal: rawSignal, crashReport: rawCrashReport, crashReportLocation: rawCrashReportLocation, errorLog: rawErrorLog };

      const { code, signal, crashReport, crashReportLocation, errorLog } = normalized;
      console.log('[Minecraft exited]', code, signal);

      setIsLaunching(false);

      if (code !== 0) {
        console.error('[Game crashed or exited with error]');
        setGameExitError({ code, crashReport, crashReportLocation, errorLog });
      }
    };

    if (launchService && typeof (launchService as any).on === 'function') {
      (launchService as any).on('minecraft-exit', handleMinecraftExit);
      return () => {
        if (typeof (launchService as any).removeListener === 'function') {
          (launchService as any).removeListener('minecraft-exit', handleMinecraftExit);
        }
      };
    }
  }, [launchService]);

  // 2. The Launch Action
  const launch = useCallback(
    async (options: LaunchOptions): Promise<boolean> => {
      clearLaunchError(); // Clear previous errors
      setGameExitError(null);
      setIsLaunching(true);

      try {
        await launchService.launch(options);
        return true;
      } catch (e) {
        console.error('[Failed to launch game]', e);
        setIsLaunching(false);
        
        // NEW: Use exception hook to map error (Phase 2.2)
        onError(e);
        return false;
      }
    },
    [launchService, onError, clearLaunchError]
  );

  // 3. The Kill Action
  const kill = useCallback(async () => {
    await launchService.kill(); // Implement if backend supports it
    setIsLaunching(false);
  }, [launchService]);

  const clearGameExitError = useCallback(() => {
    setGameExitError(null);
  }, []);

  return {
    launch,
    kill,
    isLaunching,
    setIsLaunching, // Exposed for AppContext to sync with tasks
    launchError, // NEW: Now from useLaunchException (Phase 2.2)
    setLaunchError: onException, // NEW: Alias for AppContext compatibility (Phase 2.2)
    clearLaunchError,
    gameExitError,
    clearGameExitError,
  };
}