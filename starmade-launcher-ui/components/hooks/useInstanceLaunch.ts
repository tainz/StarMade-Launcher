import { useState, useEffect, useCallback } from 'react';
import { LaunchServiceKey, LaunchOptions } from '@xmcl/runtime-api';
import { useService } from './useService';
import { useLaunchException } from './useLaunchException';

export function useInstanceLaunch() {
  const launchService = useService(LaunchServiceKey);
  const { error: launchError, onException, onError, clearError: clearLaunchError } = useLaunchException();

  const [isLaunching, setIsLaunching] = useState(false);
  // FIX 1: Add state to store the Process ID
  const [pid, setPid] = useState<string | undefined>(undefined);

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
      setPid(undefined); // Reset PID on exit

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
      clearLaunchError();
      setGameExitError(null);
      setIsLaunching(true);

      try {
        // FIX 2: Capture the PID returned by launch
        const processId = await launchService.launch(options);
        if (typeof processId === 'string') {
            setPid(processId);
        }
        return true;
      } catch (e) {
        console.error('[Failed to launch game]', e);
        setIsLaunching(false);
        onError(e);
        return false;
      }
    },
    [launchService, onError, clearLaunchError]
  );

  // 3. The Kill Action
  const kill = useCallback(async () => {
    // FIX 3: Pass the stored PID to kill()
    if (pid) {
        await launchService.kill(pid);
    }
    setIsLaunching(false);
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
    setLaunchError: onException,
    clearLaunchError,
    gameExitError,
    clearGameExitError,
  };
}