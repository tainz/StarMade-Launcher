import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useData } from './DataContext';
import { useInstanceLaunch } from '../components/hooks/useInstanceLaunch';
import { useTaskManager } from '../components/hooks/useTaskManager';
import { usePreLaunchFlush } from '../components/hooks/usePreLaunchFlush';
import { LaunchOptions, TaskState, TaskItem } from '@xmcl/runtime-api';

type Page = 'play' | 'installations' | 'settings' | 'news';

interface PageProps {
  installationId?: string;
}

interface AppContextValue {
  // Navigation
  activePage: Page;
  pageProps: PageProps;
  navigateTo: (page: Page, props?: PageProps) => void;

  // Modals
  isLaunchModalOpen: boolean;
  setIsLaunchModalOpen: (open: boolean) => void;

  // Progress (UI display only)
  progress: number;

  // Launch orchestration - SIMPLIFIED (no diagnosis)
  startLaunching: (options: LaunchOptions) => Promise<void>;
  isLaunching: boolean;
  launchError: any;
  clearLaunchError: () => void;
  gameExitError: any;
  clearGameExitError: () => void;

  // Pre-launch flush (Phase 2.1)
  registerPreLaunchFlush: (listener: () => void | Promise<void>) => void;
  unregisterPreLaunchFlush: (listener: () => void | Promise<void>) => void;
  executePreLaunchFlush: () => Promise<void>; // NEW: expose for useLaunchButton

  // Tasks (for UI display)
  tasks: TaskItem[];
  // FIX: Updated signatures to match useTaskManager (accepts TaskItem object, not string ID)
  pauseTask: (task: TaskItem) => void;
  resumeTask: (task: TaskItem) => void;
  cancelTask: (task: TaskItem) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // FIX: Removed incorrect destructuring of 'data' which caused "Property 'data' does not exist" error.
  // The data context is not used in this provider logic, so it was removed.
  // If needed in future: const data = useData();

  // Navigation state
  const [activePage, setActivePage] = useState<Page>('play');
  const [pageProps, setPageProps] = useState<PageProps>({});

  const navigateTo = useCallback((page: Page, props: PageProps = {}) => {
    setActivePage(page);
    setPageProps(props);
  }, []);

  // Modal state
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);

  // Progress state (UI only)
  const [progress, setProgress] = useState(0);

  // Phase 2.1: Pre-launch flush hook
  const { register, unregister, executeAll } = usePreLaunchFlush();

  // Launch hook (Phase 2.2: uses useLaunchException internally)
  const {
    launch,
    isLaunching,
    launchError,
    clearLaunchError,
    gameExitError,
    clearGameExitError,
  } = useInstanceLaunch();

  // Task manager (for UI display)
  const { tasks, pause, resume, cancel } = useTaskManager();

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

  // Phase 2.1 / 5.1: Strengthened AppContext.startLaunching
  // ONLY builds LaunchOptions and calls launch - NO diagnosis
  const startLaunching = useCallback(
    async (options: LaunchOptions) => {
      // Close modal and clear errors (UI concerns only)
      setIsLaunchModalOpen(false);
      clearGameExitError();
      clearLaunchError();

      try {
        // Simply call launch with pre-built options
        await launch(options);
      } catch (e) {
        // Error handling is done by useInstanceLaunch via useLaunchException
        console.error('AppContext: Launch error:', e);
      }
    },
    [launch, clearGameExitError, clearLaunchError]
  );

  const value: AppContextValue = {
    // Navigation
    activePage,
    pageProps,
    navigateTo,

    // Modals
    isLaunchModalOpen,
    setIsLaunchModalOpen,

    // Progress
    progress,

    // Launch (simplified)
    startLaunching,
    isLaunching,
    launchError,
    clearLaunchError,
    gameExitError,
    clearGameExitError,

    // Pre-launch flush (Phase 2.1)
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