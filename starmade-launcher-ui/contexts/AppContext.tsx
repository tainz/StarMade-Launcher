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
  
  // --- USE THE NEW HOOK ---
  const { 
    launch, 
    isLaunching, 
    setIsLaunching, 
    launchError, 
    setLaunchError, 
    clearLaunchError, 
    gameExitError, 
    clearGameExitError 
  } = useInstanceLaunch();

  // --- DIAGNOSIS HOOKS ---
  const javaVersions = data.javaVersions ?? [];
  const { status: javaStatus } = useInstanceJava(data.selectedInstance, javaVersions);
  const { issue: javaIssue } = useInstanceJavaDiagnose(javaStatus);
  const { issue: userIssue, fix: fixUser } = useUserDiagnose();

  const selectedInstanceArray = useMemo(
    () => (data.selectedInstance ? [data.selectedInstance] : []),
    [data.selectedInstance],
  );

  const { instruction, fix, loading: fixingVersion } = useInstanceVersionInstall(
    data.selectedInstance?.path ?? '',
    selectedInstanceArray,
    javaVersions,
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

  // Sync isLaunching with tasks
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

  const navigate = (page: Page, props: PageProps = {}) => {
    setActivePage(page);
    setPageProps(props);
  };

  const openLaunchModal = () => {
    if (!isLaunching && !fixingVersion) setIsLaunchModalOpen(true);
  };
  const closeLaunchModal = () => setIsLaunchModalOpen(false);

  // --- ORCHESTRATION LOGIC ---
  const startLaunching = useCallback(async () => {
    if (!data.selectedInstance) {
      setLaunchError({ title: 'No Instance Selected', description: 'Please select an installation.' });
      return;
    }

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

      if (instruction) {
        console.log('Fixing instance...', instruction);
        await fix();
        versionToLaunch = data.selectedInstance.version || data.selectedInstance.runtime?.minecraft;
      }

      // FIX: Resolve Java Path if "Auto" is selected
      // If data.selectedInstance.java is empty string (Auto), we use the resolved path from javaStatus
      const configuredJava = data.selectedInstance.java;
      let finalJavaPath = configuredJava;

      if (!finalJavaPath && javaStatus?.java?.path) {
          finalJavaPath = javaStatus.java.path;
          console.log("Auto-resolved Java path:", finalJavaPath);
      }

      const options: LaunchOptions = {
        version: versionToLaunch,
        gameDirectory: data.selectedInstance.path,
        user: data.activeAccount!,
        java: finalJavaPath, // Use the resolved path
        maxMemory: data.selectedInstance.maxMemory,
        minMemory: data.selectedInstance.minMemory,
        vmOptions: data.selectedInstance.vmOptions,
        mcOptions: data.selectedInstance.mcOptions,
      };

      await launch(options);

    } catch (e) {
      console.error("Launch flow error", e);
    }
  }, [
    data.selectedInstance, data.activeAccount, userIssue, fixUser, javaIssue, 
    instruction, fix, launch, setLaunchError, clearGameExitError, clearLaunchError,
    javaStatus // Add javaStatus to dependencies
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
