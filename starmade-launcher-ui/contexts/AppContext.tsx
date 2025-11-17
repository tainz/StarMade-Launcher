import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import type { AppContextType, Page, PageProps } from '../types';
import { useData } from './DataContext';
import { useService } from '../components/hooks/useService';
import { LaunchServiceKey, LaunchOptions, TaskState } from '@xmcl/runtime-api';
import { useTaskManager } from '../components/hooks/useTaskManager';
import { useInstanceVersionInstall } from '../components/hooks/useInstanceVersionInstall';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activePage, setActivePage] = useState<Page>('Play');
    const [pageProps, setPageProps] = useState<PageProps>({});
    const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [progress, setProgress] = useState(0);
    const [gameExitError, setGameExitError] = useState<{
        code: number;
        crashReport?: string;
        crashReportLocation?: string;
        errorLog?: string;
    } | null>(null);

    const data = useData();
    const launchService = useService(LaunchServiceKey);

    // Use the task manager hook
    const { tasks, pause, resume, cancel } = useTaskManager();

    // Use the instance-version install hook to diagnose/fix version issues
    // We only need the currently selected instance; pass it as a single-element array.[attached_file:1]
    const javaVersions = data.javaVersions ?? []; // provided by DataContext.[attached_file:1]

    const selectedInstanceArray = useMemo(
      () => (data.selectedInstance ? [data.selectedInstance] : []),
      [data.selectedInstance]
    ); // [attached_file:1]

    const { instruction, fix, loading: fixingVersion } = useInstanceVersionInstall(
      data.selectedInstance?.path ?? '',
      selectedInstanceArray,
      javaVersions
    ); // [attached_file:1]

    // Set up game exit handler (Step 7)
    useEffect(() => {
        const handleMinecraftExit = (
            exitCode: number,
            signal: string,
            crashReport?: string,
            crashReportLocation?: string,
            errorLog?: string
        ) => {
            console.log('Minecraft exited', { exitCode, signal, crashReport, crashReportLocation, errorLog });

            // Only show error if exit code is non-zero (indicates crash or error)
            if (exitCode !== 0) {
                console.error('Game crashed or exited with error:', {
                    exitCode,
                    signal,
                    crashReportLocation,
                });

                setGameExitError({
                    code: exitCode,
                    crashReport,
                    crashReportLocation,
                    errorLog,
                });

                // Show error to user
                // TODO: Replace with proper modal component
                const message = crashReportLocation 
                    ? `Game crashed! Exit code: ${exitCode}\n\nCrash report saved to:\n${crashReportLocation}`
                    : `Game exited with error code: ${exitCode}`;
                
                alert(message);
            } else {
                console.log('Game exited normally');
            }

            // Reset launching state
            setIsLaunching(false);
            setProgress(0);
        };

        // Subscribe to minecraft-exit event
        if (launchService && typeof launchService.on === 'function') {
            launchService.on('minecraft-exit', handleMinecraftExit);

            return () => {
                if (typeof launchService.removeListener === 'function') {
                    launchService.removeListener('minecraft-exit', handleMinecraftExit);
                }
            };
        }
    }, [launchService]);

    // Calculate overall progress from all active tasks
    const launchProgress = useMemo(() => {
      const activeTasks = tasks.filter((t) => t.state === TaskState.Running);
      if (activeTasks.length === 0) return 0;

      const totalProgress = activeTasks.reduce((sum, t) => {
        if (t.total <= 0) return sum;
        return sum + (t.progress / t.total) * 100;
      }, 0);

      return totalProgress / activeTasks.length;
    }, [tasks]);

    // Update progress state from calculated launchProgress
    useEffect(() => {
        setProgress(launchProgress);
    }, [launchProgress]);

    // Update isLaunching based on any active tasks
    useEffect(() => {
      const hasActiveTasks = tasks.some((t) => t.state === TaskState.Running);

      if (hasActiveTasks) {
        if (!isLaunching) {
          setIsLaunching(true);
        }
      } else if (isLaunching) {
        // Brief delay to let the button show "completed"
        const timeout = setTimeout(() => {
          setIsLaunching(false);
          setProgress(0);
        }, 1500);

        return () => clearTimeout(timeout);
      }
    }, [tasks, isLaunching]);

    const navigate = (page: Page, props: PageProps = {}) => {
        setActivePage(page);
        setPageProps(props);
    };

    const openLaunchModal = () => {
        if (!isLaunching) {
            setIsLaunchModalOpen(true);
        }
    };
    
    const closeLaunchModal = () => setIsLaunchModalOpen(false);

    const startLaunching = useCallback(async () => {
      if (!data.selectedInstance || !data.activeAccount) {
        console.error(
          'Cannot launch without a selected instance and active account.'
        ); // [attached_file:1]
        setIsLaunchModalOpen(false);
        return;
      }

      setIsLaunchModalOpen(false);
      setGameExitError(null);
      setIsLaunching(true);

      try {
        // 1. Ensure there is some version to launch (defensive for legacy/imported instances).[attached_file:1]
        let versionToLaunch =
          data.selectedInstance.version ||
          data.selectedInstance.runtime?.minecraft; // [attached_file:1]

        if (!versionToLaunch) {
          console.warn(
            'Selected instance has no version or runtime.minecraft; aborting launch.'
          ); // [attached_file:1]
          setIsLaunching(false);
          setProgress(0);
          alert(
            'This instance does not have a Minecraft version configured. Please edit the installation and select a version.'
          ); // [attached_file:1]
          return;
        }

        // 2. If diagnose hook says the version is missing/corrupt, fix it first.[attached_file:1]
        if (instruction) {
          console.log(
            'Installing missing components for instance before launch',
            instruction
          ); // [attached_file:1]
          await fix(); // will install jar/libraries/assets based on instruction.[attached_file:1][attached_file:2]

          // After fix(), the on-disk version should be complete; if editInstance
          // later updates instance.version (e.g. for Forge/Fabric), you can
          // re-read it here once you wire that in.[attached_file:2]
          versionToLaunch =
            data.selectedInstance.version ||
            data.selectedInstance.runtime?.minecraft; // [attached_file:1]
        }

        // 3. Construct launch options using the (now) guaranteed non-empty version.[attached_file:1][attached_file:2]
        const options: LaunchOptions = {
          version: versionToLaunch,
          gameDirectory: data.selectedInstance.path,
          user: data.activeAccount,
          java: data.selectedInstance.java,
          maxMemory: data.selectedInstance.maxMemory,
          minMemory: data.selectedInstance.minMemory,
          vmOptions: data.selectedInstance.vmOptions,
          mcOptions: data.selectedInstance.mcOptions,
        };

        await launchService.launch(options);
        console.log('Launch command sent successfully'); // [attached_file:1]
        // isLaunching will then be driven by task updates from useTaskManager.[attached_file:1]
      } catch (e) {
        console.error('Failed to launch game', e); // [attached_file:1]
        setIsLaunching(false);
        setProgress(0);

        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        alert(`Launch failed: ${errorMessage}`); // [attached_file:1]
        // Later you can replace this with a useLaunchException-based modal.[attached_file:2]
      }
    }, [
      data.selectedInstance,
      data.activeAccount,
      instruction,
      fix,
      launchService,
      setIsLaunchModalOpen,
      setGameExitError,
    ]);
    
    const completeLaunching = () => {
        setIsLaunching(false);
        setProgress(0);
    };

    const clearGameExitError = () => {
        setGameExitError(null);
    };

    const value: AppContextType = {
        activePage,
        pageProps,
        isLaunchModalOpen,
        isLaunching,
        progress,
        navigate,
        openLaunchModal,
        closeLaunchModal,
        startLaunching,
        completeLaunching,
        // Expose task manager functions if needed by other components
        tasks,
        pauseTask: pause,
        resumeTask: resume,
        cancelTask: cancel,
        // Expose game exit error state
        gameExitError,
        clearGameExitError,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
