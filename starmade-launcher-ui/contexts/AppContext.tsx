import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import type { AppContextType, Page, PageProps } from '../types';
import { useData } from './DataContext';
import { LaunchOptions, TaskState } from '@xmcl/runtime-api';
import { useTaskManager } from '../components/hooks/useTaskManager';
import { useInstanceVersionInstall } from '../components/hooks/useInstanceVersionInstall';
import { useInstanceJava } from '../components/hooks/useInstanceJava';
import { useInstanceJavaDiagnose } from '../components/hooks/useInstanceJavaDiagnose';
import { useUserDiagnose } from '../components/hooks/useUserDiagnose';
import { useInstanceLaunch } from '../components/hooks/useInstanceLaunch';
import { useResolvedJavaForInstance } from '../components/hooks/useResolvedJavaForInstance';

type InternalAppContextType = AppContextType & {
  launchError: any;
  clearLaunchError: () => void;
  fixingVersion?: boolean;
  needsInstall: boolean;
};

const AppContext = createContext<InternalAppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<Page>('Play');
  const [pageProps, setPageProps] = useState<PageProps>({});
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const data = useData();
  const { tasks, pause, resume, cancel } = useTaskManager();

  const { launch, isLaunching, setIsLaunching, launchError, setLaunchError, clearLaunchError, gameExitError, clearGameExitError } =
    useInstanceLaunch();

  // --- DIAGNOSIS HOOKS ---
  const javaVersions = data.javaVersions ?? [];

  // FIXED: Use useInstanceJava for diagnosis (returns InstanceJavaStatus)
  const { status: javaStatus, refreshing: javaRefreshing } = useInstanceJava(
    data.selectedInstance,
    javaVersions
  );

  // FIXED: Pass InstanceJavaStatus to diagnosis hook (correct type)
  const { issue: javaIssue } = useInstanceJavaDiagnose(javaStatus);

  const { issue: userIssue, fix: fixUser } = useUserDiagnose();

  const selectedInstanceArray = useMemo(
    () => (data.selectedInstance ? [data.selectedInstance] : []),
    [data.selectedInstance]
  );

  const { instruction, fix, loading: fixingVersion } = useInstanceVersionInstall(
    data.selectedInstance?.path ?? '',
    selectedInstanceArray,
    javaVersions
  );

  // ADDED: Use centralized resolver for finalJavaPath only (not for diagnosis)
  const { status: resolvedJava } = useResolvedJavaForInstance(
    data.selectedInstance,
    undefined,  // No resolved version needed for launch Java selection
    javaVersions
  );

  // --- PROGRESS SYNC ---
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

  useEffect(() => {
    const hasActiveTasks = tasks.some((t) => t.state === TaskState.Running);

    if (hasActiveTasks && !isLaunching) {
      setIsLaunching(true);
    } else if (!hasActiveTasks && isLaunching) {
      const timeout = setTimeout(() => {
        if (progress <= 0) {
          setIsLaunching(false);
        }
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [tasks, isLaunching, setIsLaunching, progress]);

  const navigate = (page: Page, props?: PageProps) => {
    setActivePage(page);
    setPageProps(props ?? {});
  };

  const openLaunchModal = () => {
    if (!isLaunching && !fixingVersion) {
      setIsLaunchModalOpen(true);
    }
  };

  const closeLaunchModal = () => {
    setIsLaunchModalOpen(false);
  };

  // --- LAUNCH ORCHESTRATION ---
  const startLaunching = useCallback(async () => {
    if (!data.selectedInstance) {
      setLaunchError({ title: 'No Instance Selected', description: 'Please select an installation.' });
      return;
    }

    // Step 1: Fix user session
    if (userIssue) {
      setIsLaunchModalOpen(false);
      try {
        await fixUser();
        return;
      } catch (e) {
        setLaunchError({ title: 'Login Failed', description: 'Could not refresh session.' });
        return;
      }
    }

    // Step 2: Check Java compatibility
    if (javaIssue) {
      setIsLaunchModalOpen(false);
      setLaunchError({ title: javaIssue.title, description: javaIssue.description });
      return;
    }

    setIsLaunchModalOpen(false);
    clearGameExitError();
    clearLaunchError();

    try {
      let versionToLaunch = data.selectedInstance.version || data.selectedInstance.runtime?.minecraft;

      if (!versionToLaunch) {
        setLaunchError({ title: 'Missing Version', description: 'No Minecraft version configured.' });
        return;
      }

      // Step 3: Fix version/assets if needed
      if (instruction) {
        console.log('[AppContext] Fixing instance...', instruction);
        await fix();
        versionToLaunch = data.selectedInstance.version || data.selectedInstance.runtime?.minecraft;
      }

      // Step 4: Get final Java path from centralized resolver
      const finalJavaPath = resolvedJava?.finalJavaPath;

      if (!finalJavaPath) {
        setLaunchError({ title: 'No Java Found', description: 'Cannot launch without a valid Java installation.' });
        return;
      }

      console.log('[AppContext] Launching with Java:', finalJavaPath);

      const options: LaunchOptions = {
        version: versionToLaunch,
        gameDirectory: data.selectedInstance.path,
        user: data.activeAccount!,
        java: finalJavaPath,  // Use centralized resolver's output
        maxMemory: data.selectedInstance.maxMemory,
        minMemory: data.selectedInstance.minMemory,
        vmOptions: data.selectedInstance.vmOptions,
        mcOptions: data.selectedInstance.mcOptions,
      };

      await launch(options);
    } catch (e) {
      console.error('[AppContext] Launch error:', e);
    }
  }, [
    data.selectedInstance,
    data.activeAccount,
    userIssue,
    fixUser,
    javaIssue,
    instruction,
    fix,
    launch,
    setLaunchError,
    clearGameExitError,
    clearLaunchError,
    resolvedJava,  // Depend on resolver for finalJavaPath
  ]);

  const completeLaunching = () => {
    setIsLaunching(false);
    setProgress(0);
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
    needsInstall: !!instruction,
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
