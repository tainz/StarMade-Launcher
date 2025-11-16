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

    const data = useData();
    const launchService = useService(LaunchServiceKey);
    
    // Use the task manager hook
    const { tasks, pause, resume, cancel } = useTaskManager();

    // Get the instance version install hook to check for missing components
    const { instruction, fix: fixInstanceVersion, loading: fixingInstance } = useInstanceVersionInstall(
        data.selectedInstance?.path || '',
        data.installations.map(inst => ({
            path: inst.id,
            name: inst.name,
            version: inst.version,
            runtime: { minecraft: inst.version },
            // Map other Instance properties as needed
        } as any)), // TODO: Properly type this conversion
        data.javaVersions || []
    );

    // Calculate overall progress from active tasks
    const launchProgress = useMemo(() => {
        const activeTasks = tasks.filter(
            (t) => t.state === TaskState.Running && (
                t.path.includes('install') || t.path.startsWith('launch')
            )
        );
        
        if (activeTasks.length === 0) return 0;

        const totalProgress = activeTasks.reduce((sum, t) => {
            if (t.total > 0) {
                return sum + (t.progress / t.total) * 100;
            }
            return sum;
        }, 0);

        return totalProgress / activeTasks.length;
    }, [tasks]);

    // Update progress state from calculated launchProgress
    useEffect(() => {
        setProgress(launchProgress);
    }, [launchProgress]);

    // Update isLaunching based on tasks
    useEffect(() => {
        const hasLaunchTasks = tasks.some(
            (t) => (t.path === 'launch' || t.path.includes('install')) && 
                   t.state === TaskState.Running
        );
        
        if (hasLaunchTasks) {
            setIsLaunching(true);
        } else {
            // Check if any tasks just completed
            const hasCompletedTasks = tasks.some(
                (t) => (t.path === 'launch' || t.path.includes('install')) &&
                       (t.state === TaskState.Succeed || 
                        t.state === TaskState.Failed || 
                        t.state === TaskState.Cancelled)
            );

            if (hasCompletedTasks && isLaunching) {
                // Brief delay to show completion state
                const timeout = setTimeout(() => {
                    setIsLaunching(false);
                    setProgress(0);
                }, 1500);
                return () => clearTimeout(timeout);
            } else if (!hasLaunchTasks) {
                setIsLaunching(false);
                setProgress(0);
            }
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
            console.error("Cannot launch without a selected instance and active account.");
            setIsLaunchModalOpen(false);
            return;
        }

        setIsLaunchModalOpen(false);
        setIsLaunching(true); // Optimistically set launching state

        try {
            // Check if there are missing version components that need to be installed
            if (instruction) {
                console.log('Missing components detected, installing...', instruction);
                try {
                    await fixInstanceVersion();
                    console.log('Missing components installed successfully');
                } catch (installError) {
                    console.error('Failed to install missing version components:', installError);
                    setIsLaunching(false);
                    setProgress(0);
                    // TODO: Show user-friendly error dialog
                    alert('Failed to install required game files. Please check the logs.');
                    return;
                }
            }

            // Proceed with launch after ensuring all components are installed
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
            // The isLaunching state is now handled by the task manager
        } catch (e) {
            console.error("Failed to launch game:", e);
            setIsLaunching(false); // Reset on failure
            setProgress(0);
            // TODO: Parse launch exceptions and show user-friendly errors
            alert(`Launch failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }, [data.selectedInstance, data.activeAccount, launchService, instruction, fixInstanceVersion]);
    
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
        // Expose task manager functions if needed by other components
        tasks,
        pauseTask: pause,
        resumeTask: resume,
        cancelTask: cancel,
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
