import { useState, useEffect, useCallback } from 'react';
import { LaunchServiceKey, LaunchOptions } from '@xmcl/runtime-api';
import { useService } from './useService';
import { getLaunchErrorMessage, LaunchErrorDisplay } from '../../utils/errorMapping';

export function useInstanceLaunch() {
    const launchService = useService(LaunchServiceKey);
    const [launchError, setLaunchError] = useState<LaunchErrorDisplay | null>(null);
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
            rawErrorLog?: any,
        ) => {
            const normalized =
                rawExit && typeof rawExit === 'object' && ('code' in rawExit || 'exitCode' in rawExit)
                    ? (rawExit.exitCode ?? rawExit)
                    : {
                        code: rawExit,
                        signal: rawSignal,
                        crashReport: rawCrashReport,
                        crashReportLocation: rawCrashReportLocation,
                        errorLog: rawErrorLog,
                    };

            const { code, signal, crashReport, crashReportLocation, errorLog } = normalized;

            console.log('Minecraft exited', { code, signal });
            setIsLaunching(false);

            if (code !== 0) {
                console.error('Game crashed or exited with error');
                setGameExitError({
                    code,
                    crashReport,
                    crashReportLocation,
                    errorLog,
                });
            }
        };

        if (launchService && typeof launchService.on === 'function') {
            launchService.on('minecraft-exit', handleMinecraftExit);
            return () => {
                if (typeof launchService.removeListener === 'function') {
                    launchService.removeListener('minecraft-exit', handleMinecraftExit);
                }
            };
        }
    }, [launchService]);

    // 2. The Launch Action
    const launch = useCallback(async (options: LaunchOptions) => {
        setLaunchError(null);
        setGameExitError(null);
        setIsLaunching(true);
        try {
            await launchService.launch(options);
            return true;
        } catch (e) {
            console.error('Failed to launch game', e);
            setIsLaunching(false);
            const errorDisplay = getLaunchErrorMessage(e);
            setLaunchError(errorDisplay);
            return false;
        }
    }, [launchService]);

    // 3. The Kill Action
    const kill = useCallback(async () => {
        // await launchService.kill(); // Implement if backend supports it
        setIsLaunching(false);
    }, [launchService]);

    const clearLaunchError = useCallback(() => setLaunchError(null), []);
    const clearGameExitError = useCallback(() => setGameExitError(null), []);

    return {
        launch,
        kill,
        isLaunching,
        setIsLaunching, // Exposed for AppContext to sync with tasks
        launchError,
        setLaunchError,
        clearLaunchError,
        gameExitError,
        clearGameExitError
    };
}
