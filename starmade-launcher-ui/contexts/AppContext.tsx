import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { LaunchOptions, TaskState } from '@xmcl/runtime-api';
import { useData } from './DataContext';
import { useInstanceLaunch } from '../components/hooks/useInstanceLaunch';
import { useTaskManager } from '../components/hooks/useTaskManager';
import { usePreLaunchFlush } from '../components/hooks/usePreLaunchFlush';

/**
 * Phase 2.1 / 5.1: AppContext boundaries strengthened.
 * 
 * AppContext is now limited to:
 * - Navigation and modal toggles
 * - Aggregating domain hooks (DataContext, useInstanceLaunch, useTaskManager)
 * - Exposing pre-launch flush registration API
 * 
 * AppContext does NOT own:
 * - Diagnosis logic (removed useInstanceVersionInstall, needsInstall, fixingVersion)
 * - Launch orchestration (moved to useLaunchButton)
 * - Error mapping (moved to useLaunchException via useInstanceLaunch)
 * 
 * Task aggregation remains here temporarily (deferred to Phase 3 useTasks).
 */

export interface AppContextType {
  // Navigation
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // Modal state
  isLaunchModalOpen: boolean;
  setIsLaunchModalOpen: (open: boolean) => void;

  // Launch orchestration
  /**
   * Phase 2.1 / 5.1: startLaunching ONLY receives pre-built LaunchOptions
   * and calls useInstanceLaunch.launch(). NO diagnosis logic here.
   */
  startLaunching: (options: LaunchOptions) => Promise<void>;
  isLaunching: boolean;

  // Pre-launch flush API (Phase 2.1)
  registerPreLaunchFlush: (listener: () => void | Promise<void>) => void;
  unregisterPreLaunchFlush: (listener: () => void | Promise<void>) => void;

  // Launch error state (from useLaunchException via useInstanceLaunch)
  launchError: {
    title: string;
    description: string;
    extraText?: string;
    unexpected?: boolean;
  } | null;
  clearLaunchError: () => void;

  // Game exit error
  gameExitError: {
    code: number;
    crashReport?: string;
    crashReportLocation?: string;
    errorLog?: string;
  } | null;
  clearGameExitError: () => void;

  // Task management
  tasks: any[];
  launchProgress: number;

  // REMOVED Phase 2.1 / 5.1: No more diagnosis state
  // - needsInstall: boolean (REMOVED)
  // - fixingVersion: boolean (REMOVED)
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const data = useData();

  // Navigation state
  const [currentPage, setCurrentPage] = useState('play');

  // Modal state
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);

  // Phase 2.1: Pre-launch flush hook
  const { register, unregister, executeAll } = usePreLaunchFlush();

  // Phase 2.2: Launch hook with integrated useLaunchException
  const {
    launch,
    isLaunching,
    launchError,
    clearLaunchError,
    gameExitError,
    clearGameExitError,
  } = useInstanceLaunch();

  // Task management
  const { tasks } = useTaskManager();

  /**
   * Phase 2.1 / 5.1: startLaunching boundary strengthened.
   * 
   * This function ONLY:
   * 1. Clears UI state (modals, errors)
   * 2. Calls useInstanceLaunch.launch() with pre-built options
   * 
   * ALL diagnosis happens in useLaunchButton.onClick BEFORE this is called.
   */
  const startLaunching = useCallback(
    async (options: LaunchOptions) => {
      setIsLaunchModalOpen(false);
      clearGameExitError();
      clearLaunchError();

      try {
        await launch(options);
      } catch (e) {
        console.error('AppContext: Launch error', e);
      }
    },
    [launch, clearGameExitError, clearLaunchError]
  );

  /**
   * Task progress aggregation.
   * 
   * Phase 2.1 / 5.1 NOTE: This remains in AppContext temporarily.
   * Per roadmap: "After useTasks exists, remove aggregate progress derivations."
   * This is deferred to Phase 3 implementation.
   */
  const launchProgress = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.state === TaskState.Running);
    if (activeTasks.length === 0) return 0;

    const totalProgress = activeTasks.reduce((sum, t) => {
      if (t.total === 0) return sum;
      return sum + ((t.progress / t.total) * 100);
    }, 0);

    return totalProgress / activeTasks.length;
  }, [tasks]);

  const value: AppContextType = {
    // Navigation
    currentPage,
    setCurrentPage,

    // Modal state
    isLaunchModalOpen,
    setIsLaunchModalOpen,

    // Launch orchestration
    startLaunching,
    isLaunching,

    // Pre-launch flush (Phase 2.1)
    registerPreLaunchFlush: register,
    unregisterPreLaunchFlush: unregister,

    // Launch errors (Phase 2.2)
    launchError,
    clearLaunchError,
    gameExitError,
    clearGameExitError,

    // Task management
    tasks,
    launchProgress,

    // Phase 2.1 / 5.1: REMOVED diagnosis state
    // needsInstall (REMOVED)
    // fixingVersion (REMOVED)
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