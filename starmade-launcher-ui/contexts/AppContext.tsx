/**
 * contexts/AppContext.tsx
 * 
 * REFACTOR NOTES (Phase 2.1):
 * - Now uses usePreLaunchFlush hook instead of preLaunchFlushRef
 * - Exposes registration methods but does NOT execute flush in startLaunching
 * - Full launch orchestration (flush + diagnosis) moved to useLaunchButton
 */

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
import { usePreLaunchFlush } from '../components/hooks/usePreLaunchFlush'; // NEW

type InternalAppContextType = AppContextType & {
  launchError: any;
  clearLaunchError: () => void;
  fixingVersion?: boolean;
  needsInstall: boolean;
  // ADDED: Pre-launch flush registry (Phase 2.1)
  registerPreLaunchFlush: (flush: () => void | Promise<void>) => void;
  unregisterPreLaunchFlush: (flush: () => void | Promise<void>) => void;
};

const AppContext = createContext<InternalAppContextType>(undefined!);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<Page>('Play');
  const [pageProps, setPageProps] = useState<PageProps>({});
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  // NEW: Pre-launch flush hook (Phase 2.1)
  const { register, unregister, executeAll } = usePreLaunchFlush();

  const data = useData();
  const { tasks, pause, resume, cancel } = useTaskManager();
  const {
    launch,
    isLaunching,
    setIsLaunching,
    launchError,
    setLaunchError,
    clearLaunchError,
    gameExitError,
    clearGameExitError,
  } = useInstanceLaunch();

  const javaVersions = data.javaVersions ?? [];
  const { status: javaStatus, refreshing: javaRefreshing } = useInstanceJava(
    data.selectedInstance,
    javaVersions
  );
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

  const { status: resolvedJava } = useResolvedJavaForInstance(
    data.selectedInstance,
    undefined,
    javaVersions
  );

  const launchProgress = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.state === TaskState.Running);
    if (activeTasks.length === 0) return 0;
    const totalProgress = activeTasks.reduce((sum, t) => {
      if (t.total === 0) return sum;
      return sum + (t.progress / t.total) * 100;
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

  const navigate = (page: Page, props?: PageProps) => {
    setActivePage(page);
    setPageProps(props ?? {});
  };

  const openLaunchModal = () => {
    if (!isLaunching && !fixingVersion) setIsLaunchModalOpen(true);
  };

  const closeLaunchModal = () => setIsLaunchModalOpen(false);

  /**
   * REFACTORED (Phase 2.1): startLaunching now ONLY builds LaunchOptions and calls launch.
   * All diagnosis and pre-launch flush logic moved to useLaunchButton.
   * This matches Vue's pattern where launchButton.ts owns the onClick sequence,
   * and AppContext only provides the launch action.
   */
  const startLaunching = useCallback(async () => {
    if (!data.selectedInstance) {
      setLaunchError({
        title: 'No Instance Selected',
        description: 'Please select an installation.',
      });
      return;
    }

    // Close modal and clear errors
    setIsLaunchModalOpen(false);
    clearGameExitError();
    clearLaunchError();

    try {
      // Build launch options from resolved data
      let versionToLaunch =
        data.selectedInstance.version ?? data.selectedInstance.runtime?.minecraft;

      if (!versionToLaunch) {
        setLaunchError({
          title: 'Missing Version',
          description: 'No Minecraft version configured.',
        });
        return;
      }

      // If there's an install instruction, fix it first
      if (instruction) {
        console.log('[AppContext] Fixing instance...', instruction);
        await fix();
        // After fix, version might have changed
        versionToLaunch =
          data.selectedInstance.version ?? data.selectedInstance.runtime?.minecraft;
      }

      const finalJavaPath = resolvedJava?.finalJavaPath;
      if (!finalJavaPath) {
        setLaunchError({
          title: 'No Java Found',
          description: 'Cannot launch without a valid Java installation.',
        });
        return;
      }

      console.log('[AppContext] Launching with Java:', finalJavaPath);

      const options: LaunchOptions = {
        version: versionToLaunch,
        gameDirectory: data.selectedInstance.path,
        user: data.activeAccount!,
        java: finalJavaPath,
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
    instruction,
    fix,
    launch,
    setLaunchError,
    clearGameExitError,
    clearLaunchError,
    resolvedJava,
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
    // NEW: Pre-launch flush registry (Phase 2.1)
    registerPreLaunchFlush: register,
    unregisterPreLaunchFlush: unregister,
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