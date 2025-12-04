import { useState, useEffect, useCallback } from 'react';
import { LaunchServiceKey, LaunchOptions } from '@xmcl/runtime-api';
import { useService } from './useService';
import { useLaunchException } from './useLaunchException';

export function useInstanceLaunch() {
  const launchService = useService(LaunchServiceKey);
  
  // Phase 2.2: Use useLaunchException for error handling
  const {
    error: launchError,
    onException,
    onError,
    clearError: clearLaunchError,
  } = useLaunchException();

  const [isLaunching, setIsLaunching] = useState(false);
  const [pid, setPid] = useState<string | undefined>(undefined);
  const [gameExitError, setGameExitError] = useState<{
    code: number;
    crashReport?: string;
    crashReportLocation?: string;
    errorLog?: string;
  } | null>(null);

  // Handle Minecraft exit events
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

      console.log('Minecraft exited', { code, signal });
      setIsLaunching(false);
      setPid(undefined);

      if (code !== 0) {
        console.error('Game crashed or exited with error');
        setGameExitError({ code, crashReport, crashReportLocation, errorLog });
      }
    };

    if (launchService && typeof (launchService as any).on === 'function') {
      (launchService as any).on('minecraft-exit', handleMinecraftExit);
    }

    return () => {
      if (launchService && typeof (launchService as any).removeListener === 'function') {
        (launchService as any).removeListener('minecraft-exit', handleMinecraftExit);
      }
    };
  }, [launchService]);

  // Launch action
  const launch = useCallback(
    async (options: LaunchOptions): Promise<boolean> => {
      clearLaunchError();
      setGameExitError(null);
      setIsLaunching(true);

      try {
        const processId = await launchService.launch(options);
        if (typeof processId === 'string') {
          setPid(processId);
        }
        return true;
      } catch (e) {
        console.error('Failed to launch game', e);
        setIsLaunching(false);
        
        // Phase 2.2: Use useLaunchException error handler
        onError(e);
        return false;
      }
    },
    [launchService, onError, clearLaunchError]
  );

  // Kill action
  const kill = useCallback(async () => {
    if (pid) {
      await launchService.kill(pid);
      setIsLaunching(false);
    }
  }, [launchService, pid]);

  const clearGameExitError = useCallback(() => {
    setGameExitError(null);
  }, []);

  return {
    launch,
    kill,
    isLaunching,
    setIsLaunching,
    launchError,
    setLaunchError: onException, // Expose for external error setting
    clearLaunchError,
    gameExitError,
    clearGameExitError,
  };
}