import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { AppContextType, Page, PageProps } from '../types';
import { useData } from './DataContext';
import { useService } from '../components/hooks/useService';
import { LaunchServiceKey, LaunchOptions, TaskBatchUpdatePayloads, TaskState } from '@xmcl/runtime-api';

// This is a global from the preload script, so we need to declare it for TypeScript
declare global {
  interface Window {
    taskMonitor: {
      subscribe(): void;
      unsubscribe(): void;
      on(event: 'task-update', listener: (payload: TaskBatchUpdatePayloads) => void): void;
      removeListener(event: 'task-update', listener: (payload: TaskBatchUpdatePayloads) => void): void;
    };
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activePage, setActivePage] = useState<Page>('Play');
    const [pageProps, setPageProps] = useState<PageProps>({});
    const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false); // This will now represent install/launch progress
    const [progress, setProgress] = useState(0);

    const data = useData();
    const launchService = useService(LaunchServiceKey);

    useEffect(() => {
        const handleTaskUpdate = (payload: TaskBatchUpdatePayloads) => {
            const { updates, adds } = payload;
            // Find a relevant task that indicates a download/install or launch process
            const relevantTask = [...updates, ...adds].find(
                (t) => t.path === 'installVersion' || t.path === 'installInstance' || t.path.startsWith('launch')
            );

            if (relevantTask) {
                if (relevantTask.state === TaskState.Running) {
                    setIsLaunching(true);
                    if (relevantTask.total > 0) {
                        const calculatedProgress = (relevantTask.progress / relevantTask.total) * 100;
                        setProgress(calculatedProgress);
                    }
                } else if (
                    relevantTask.state === TaskState.Succeed ||
                    relevantTask.state === TaskState.Failed ||
                    relevantTask.state === TaskState.Cancelled
                ) {
                    // Use a timeout to ensure the user sees the 100% completion state briefly
                    setTimeout(() => {
                        setIsLaunching(false);
                        setProgress(0);
                    }, 1500);
                }
            }
        };

        // Ensure taskMonitor is available before subscribing
        if (window.taskMonitor) {
            window.taskMonitor.subscribe();
            window.taskMonitor.on('task-update', handleTaskUpdate);
        }

        // Cleanup function to remove the listener
        return () => {
            if (window.taskMonitor) {
                window.taskMonitor.removeListener('task-update', handleTaskUpdate);
                window.taskMonitor.unsubscribe();
            }
        };
    }, []);

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
            console.error("Cannot launch without a selected instance and active account.");
            setIsLaunchModalOpen(false);
            return;
        }

        setIsLaunchModalOpen(false);
        setIsLaunching(true); // Optimistically set launching state

        try {
            const options: LaunchOptions = {
                version: data.selectedInstance.version,
                gameDirectory: data.selectedInstance.path,
                user: data.activeAccount,
                java: data.selectedInstance.java,
                maxMemory: data.selectedInstance.maxMemory,
                minMemory: data.selectedInstance.minMemory,
                vmOptions: data.selectedInstance.vmOptions,
                mcOptions: data.selectedInstance.mcOptions,
            };
            await launchService.launch(options);
            // The isLaunching state will be handled by the task manager from now on
        } catch (e) {
            console.error("Failed to launch game:", e);
            setIsLaunching(false); // Reset on failure
            setProgress(0);
        }
    }, [data.selectedInstance, data.activeAccount, launchService]);
    
    const completeLaunching = () => {
        setIsLaunching(false);
        setProgress(0);
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
