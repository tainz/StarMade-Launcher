import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import type { AppContextType, Page, PageProps } from '../types';
import { useData } from './DataContext';
import { useService } from '../components/hooks/useService';
import { LaunchServiceKey, LaunchOptions, TaskState } from '@xmcl/runtime-api';
import { useTaskManager } from '../components/hooks/useTaskManager';
import { useInstanceVersionInstall } from '../components/hooks/useInstanceVersionInstall';
import { useInstanceJava } from '../components/hooks/useInstanceJava';
import { useInstanceJavaDiagnose } from '../components/hooks/useInstanceJavaDiagnose';

// Structured launch error type for pre‑launch failures
type LaunchError = {
  title: string;
  description: string;
  extraText?: string;
};

// Internal context type extends the shared AppContextType
type InternalAppContextType = AppContextType & {
  launchError: LaunchError | null;
  clearLaunchError: () => void;
  fixingVersion?: boolean;
};

const AppContext = createContext<InternalAppContextType | undefined>(undefined);

// Helper to parse backend launch exceptions into friendly UI messages
const getLaunchErrorMessage = (e: any): { title: string, description: string } => {
  // Check if it's a structured LaunchException from backend
  if (e && typeof e === 'object' && 'type' in e) {
    switch (e.type) {
      case 'launchInvalidJavaPath':
        return { 
          title: 'Invalid Java Path', 
          description: `The Java path is invalid: ${e.javaPath}. Please check your installation settings.` 
        };
      case 'launchJavaNoPermission':
        return {
          title: 'Java Permission Denied',
          description: `The launcher does not have permission to execute Java at: ${e.javaPath}. Check your antivirus or file permissions.`
        };
      case 'launchNoProperJava':
        return { 
          title: 'No Java Found', 
          description: `No compatible Java version found for Minecraft ${e.version}. Please install the recommended Java version.` 
        };
      case 'launchNoVersionInstalled':
        return { 
          title: 'Version Not Installed', 
          description: `The version ${e.options?.version} is not fully installed. Please try repairing the installation.` 
        };
      case 'launchBadVersion':
        return {
          title: 'Bad Version',
          description: `The version ${e.version} is invalid or corrupted.`
        };
      case 'launchSpawnProcessFailed':
        return {
          title: 'Process Spawn Failed',
          description: 'Failed to start the game process. This might be due to system restrictions or missing files.'
        };
    }
  }
  
  // Fallback for generic errors
  const msg = e instanceof Error ? e.message : String(e);
  return { 
    title: 'Launch Failed', 
    description: msg || 'An unexpected error occurred while trying to launch the game.' 
  };
};

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
  const [launchError, setLaunchError] = useState<LaunchError | null>(null);

  const data = useData();
  const launchService = useService(LaunchServiceKey);

  // Task manager (download/install/launch progress)
  const { tasks, pause, resume, cancel } = useTaskManager();

  // Java selection & status for the selected instance
  const javaVersions = data.javaVersions ?? [];
  const { status: javaStatus } = useInstanceJava(data.selectedInstance, javaVersions);
  const { issue: javaIssue } = useInstanceJavaDiagnose(javaStatus);

  // Diagnose/fix missing version components for the selected instance
  const selectedInstanceArray = useMemo(
    () => (data.selectedInstance ? [data.selectedInstance] : []),
    [data.selectedInstance],
  );

  const { instruction, fix, loading: fixingVersion } = useInstanceVersionInstall(
    data.selectedInstance?.path ?? '',
    selectedInstanceArray,
    javaVersions,
  );

  // Handle game exit (crash / normal exit)
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

      const {
        code,
        signal,
        crashReport,
        crashReportLocation,
        errorLog,
      } = normalized as {
        code: number;
        signal?: string;
        crashReport?: string;
        crashReportLocation?: string;
        errorLog?: string;
      };

      console.log('Minecraft exited', {
        code,
        signal,
        crashReport,
        crashReportLocation,
        errorLog,
      });

      if (code !== 0) {
        console.error('Game crashed or exited with error:', {
          code,
          signal,
          crashReportLocation,
        });

        setGameExitError({
          code,
          crashReport,
          crashReportLocation,
          errorLog,
        });
      } else {
        console.log('Game exited normally');
      }

      setIsLaunching(false);
      setProgress(0);
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

  // Aggregate progress from all running tasks
  const launchProgress = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.state === TaskState.Running);
    if (activeTasks.length === 0) return 0;

    const totalProgress = activeTasks.reduce((sum, t) => {
      if (t.total <= 0) return sum;
      return sum + (t.progress / t.total) * 100;
    }, 0);

    return totalProgress / activeTasks.length;
  }, [tasks]);

  useEffect(() => {
    setProgress(launchProgress);
  }, [launchProgress]);

  // Keep isLaunching in sync with running tasks
  useEffect(() => {
    const hasActiveTasks = tasks.some((t) => t.state === TaskState.Running);

    if (hasActiveTasks) {
      if (!isLaunching) {
        setIsLaunching(true);
      }
    } else if (isLaunching) {
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
    if (!isLaunching && !fixingVersion) {
      setIsLaunchModalOpen(true);
    }
  };

  const closeLaunchModal = () => setIsLaunchModalOpen(false);

  const startLaunching = useCallback(async () => {
    if (!data.selectedInstance || !data.activeAccount) {
      console.error('Cannot launch without a selected instance and active account.');
      setIsLaunchModalOpen(false);
      setLaunchError({
        title: 'Cannot Launch',
        description:
          'Please select an installation and log in with a Minecraft account before launching.',
      });
      return;
    }

    // 0. Java pre‑flight: block or warn if Java is invalid/incompatible.
    if (javaIssue) {
      setIsLaunchModalOpen(false);
      setLaunchError({
        title: javaIssue.title,
        description: javaIssue.description,
      });
      return;
    }

    setIsLaunchModalOpen(false);
    setGameExitError(null);
    setLaunchError(null);
    setIsLaunching(true);

    try {
      // 1. Ensure there is a version to launch.
      let versionToLaunch =
        data.selectedInstance.version || data.selectedInstance.runtime?.minecraft;

      if (!versionToLaunch) {
        console.warn(
          'Selected instance has no version or runtime.minecraft; aborting launch.',
        );
        setIsLaunching(false);
        setProgress(0);
        setLaunchError({
          title: 'Missing Minecraft Version',
          description:
            'This installation does not have a Minecraft version configured. Please edit the installation and select a version before launching.',
        });
        return;
      }

      // 2. If diagnose hook found missing/corrupt components, repair them first.
      if (instruction) {
        console.log(
          'Installing missing components for instance before launch',
          instruction,
        );
        await fix();

        // Re-read version after fix (in case it was updated later for loaders, etc.).
        versionToLaunch =
          data.selectedInstance.version || data.selectedInstance.runtime?.minecraft;
      }

      // 3. Construct launch options and launch the game.
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
      console.log('Launch command sent successfully');
      // Task updates will drive progress/isLaunching from here.
    } catch (e) {
      console.error('Failed to launch game', e);
      setIsLaunching(false);
      setProgress(0);

      // Use the new helper to parse the error
      const { title, description } = getLaunchErrorMessage(e);
      
      setLaunchError({
        title,
        description,
        extraText: JSON.stringify(e, null, 2),
      });
    }
  }, [
    data.selectedInstance,
    data.activeAccount,
    instruction,
    fix,
    launchService,
    javaIssue,
  ]);

  const completeLaunching = () => {
    setIsLaunching(false);
    setProgress(0);
  };

  const clearGameExitError = () => {
    setGameExitError(null);
  };

  const clearLaunchError = () => {
    setLaunchError(null);
  };

  const value: InternalAppContextType = {
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
    tasks,
    pauseTask: pause,
    resumeTask: resume,
    cancelTask: cancel,
    gameExitError,
    clearGameExitError,
    launchError,
    clearLaunchError,
    fixingVersion,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): InternalAppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
