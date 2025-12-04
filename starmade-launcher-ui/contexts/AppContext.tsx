import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { AppContextType, Page, PageProps } from '../types';
import { useData } from './DataContext';
import { useInstanceLaunch } from '../components/hooks/useInstanceLaunch';
import { useTaskManager } from '../components/hooks/useTaskManager';
import { usePreLaunchFlush } from '../components/hooks/usePreLaunchFlush';
import { useInstanceVersionInstall } from '../components/hooks/useInstanceVersionInstall';
import { LaunchOptions, TaskState } from '@xmcl/runtime-api';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const data = useData();

  // Navigation state
  const [activePage, setActivePage] = useState<Page>('Play');
  const [pageProps, setPageProps] = useState<PageProps>({});

  const navigate = useCallback((page: Page, props: PageProps = {}) => {
    setActivePage(page);
    setPageProps(props);
  }, []);

  // Modal state
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);

  const openLaunchModal = useCallback(() => {
    setIsLaunchModalOpen(true);
  }, []);

  const closeLaunchModal = useCallback(() => {
    setIsLaunchModalOpen(false);
  }, []);

  // Progress state
  const [progress, setProgress] = useState(0);

  // Phase 2.1: Pre-launch flush hook
  const { register, unregister, executeAll } = usePreLaunchFlush();

  // Launch hook (Phase 2.2: uses useLaunchException internally)
  const {
    launch,
    isLaunching,
    setIsLaunching,
    launchError,
    clearLaunchError,
    gameExitError,
    clearGameExitError,
  } = useInstanceLaunch();

  // Task manager
  const { tasks, pause, resume, cancel } = useTaskManager();

  // UI state flags (for display only, not for orchestration)
  const javaVersions = data.javaVersions ?? [];
  const selectedInstanceArray = useMemo(
    () => (data.selectedInstance ? [data.selectedInstance] : []),
    [data.selectedInstance]
  );

  const { instruction, loading: fixingVersion } = useInstanceVersionInstall(
    data.selectedInstance?.path ?? '',
    selectedInstanceArray,
    javaVersions
  );

  const needsInstall = !!instruction;

  // Derive aggregate progress for UI (Phase 3 will move to useTasks)
  const launchProgress = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.state === TaskState.Running);
    if (activeTasks.length === 0) return 0;

    const totalProgress = activeTasks.reduce((sum, t) => {
      if (t.total === 0) return sum;
      return sum + ((t.progress / t.total) * 100);
    }, 0);

    return totalProgress / activeTasks.length;
  }, [tasks]);

  useEffect(() => {
    setProgress(launchProgress);
  }, [launchProgress]);

  // Sync isLaunching with task presence
  useEffect(() => {
    const hasActiveTasks = tasks.some((t) => t.state === TaskState.Running);
    if (hasActiveTasks && !isLaunching) {
      setIsLaunching(true);
    } else if (!hasActiveTasks && isLaunching) {
      const timeout = setTimeout(() => {
        if (progress === 0) setIsLaunching(false);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [tasks, isLaunching, setIsLaunching, progress]);

  // Phase 2.1 / 5.1: Strengthened AppContext.startLaunching
  // ONLY builds LaunchOptions and calls launch - NO diagnosis
  const startLaunching = useCallback(
    async (options: LaunchOptions) => {
      setIsLaunchModalOpen(false);
      clearGameExitError();
      clearLaunchError();

      try {
        await launch(options);
      } catch (e) {
        console.error('AppContext: Launch error:', e);
      }
    },
    [launch, clearGameExitError, clearLaunchError]
  );

  const completeLaunching = useCallback(() => {
    setIsLaunching(false);
    setProgress(0);
  }, [setIsLaunching]);

  const value: AppContextType = {
    // Navigation
    activePage,
    pageProps,
    navigate,

    // Modals
    isLaunchModalOpen,
    openLaunchModal,
    closeLaunchModal,

    // Progress
    progress,

    // Launch (Phase 2 refactored)
    startLaunching,
    completeLaunching,
    isLaunching,
    launchError,
    clearLaunchError,
    gameExitError,
    clearGameExitError,

    // UI state flags
    needsInstall,
    fixingVersion,

    // Phase 2.1: Pre-launch flush
    registerPreLaunchFlush: register,
    unregisterPreLaunchFlush: unregister,
    executePreLaunchFlush: executeAll,

    // Tasks
    tasks,
    pauseTask: pause,
    resumeTask: resume,
    cancelTask: cancel,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};