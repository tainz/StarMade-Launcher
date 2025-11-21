import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import type { DataContextType as OriginalDataContextType, ManagedItem } from '../types';
import { useUserState } from '../components/hooks/useUserState';
import { useInstanceServiceState } from '../components/hooks/useInstanceServiceState';
import { useInstanceViewModel } from '../components/hooks/useInstanceViewModel';
import { defaultInstallationData, defaultServerData } from '../data/mockData';
import { CreateInstanceOption, EditInstanceOptions, Instance, MinecraftVersion } from '@xmcl/runtime-api';
import { useJavaContext } from '../components/hooks/useJavaContext';
import { useInstanceCreation } from '../components/hooks/useInstanceCreation';
import { useVersionState } from '../components/hooks/useVersionState';
import { useEnsureLatestInstance } from '../components/hooks/useEnsureLatestInstance';

export interface DataContextType extends OriginalDataContextType {
    loginMicrosoft: () => Promise<any>;
    logout: () => Promise<void>;
    userLoading: boolean;
    userError: string | null;
    selectedInstance: Instance | null;
    selectInstance: (path: string) => void;
    // Updated signatures
    addInstallation: (options: CreateInstanceOption) => void;
    updateInstallation: (options: EditInstanceOptions & { instancePath: string }) => void;
    addServer: (options: CreateInstanceOption) => void;
    updateServer: (options: EditInstanceOptions & { instancePath: string }) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. User State
    const { 
        users, 
        activeUser, 
        selectUser, 
        loginMicrosoft, 
        logout, 
        loading: userLoading, 
        error: userError 
    } = useUserState();

    // 2. Instance State (Raw Data & Actions)
    const {
        instances, 
        selectedInstance,
        addInstance: createInstanceRaw,
        editInstance,
        deleteInstance,
        selectInstance,
    } = useInstanceServiceState();

    // 3. Instance View Model (Derived UI Data)
    const { installations, servers } = useInstanceViewModel(instances);

    // 4. Version State
    const { 
        minecraftVersions, 
        versions,
        selectedVersion,
        setSelectedVersion
    } = useVersionState();

    // 5. Java State
    const { 
        all: javaVersions, 
        missing: javaIsMissing, 
        refresh: refreshJava 
    } = useJavaContext();

    // 6. Installation Services
    const { createVanillaInstance } = useInstanceCreation();

    // --- Business Logic: Ensure "Latest Version" instance exists ---
    useEnsureLatestInstance(instances, minecraftVersions, createVanillaInstance, editInstance);

    // --- Orchestration Actions ---

    const addInstallation = useCallback(async (options: CreateInstanceOption) => {
        const versionMeta = minecraftVersions.find(v => v.id === options.version);
        try {
            await createVanillaInstance(options, versionMeta);
        } catch (e) {
            console.error("Failed during instance creation:", e);
        }
    }, [createVanillaInstance, minecraftVersions]);

    const updateInstallation = useCallback((options: EditInstanceOptions & { instancePath: string }) => {
        editInstance(options);
    }, [editInstance]);

    const deleteInstallation = useCallback((id: string) => deleteInstance(id), [deleteInstance]);
    
    const addServer = useCallback((options: CreateInstanceOption) => {
        createInstanceRaw(options);
    }, [createInstanceRaw]);

    const updateServer = useCallback((options: EditInstanceOptions & { instancePath: string }) => {
        editInstance(options);
    }, [editInstance]);

    const deleteServer = useCallback((id: string) => deleteInstance(id), [deleteInstance]);

    const getInstallationDefaults = useCallback(
        () => ({ 
            ...defaultInstallationData, 
            // Default to the first release version found, or fallback
            version: minecraftVersions.find(v => v.type === 'release')?.id || defaultInstallationData.version,
            id: Date.now().toString(),
        }),
        [minecraftVersions],
    );

    const getServerDefaults = () => ({ ...defaultServerData, id: Date.now().toString() });
    
    const value: DataContextType = {
        accounts: users,
        activeAccount: activeUser,
        setActiveAccount: selectUser,
        loginMicrosoft,
        logout,
        userLoading,
        userError,
        installations,
        servers,
        selectedInstance,
        selectInstance,
        addInstallation,
        updateInstallation,
        deleteInstallation,
        addServer,
        updateServer,
        deleteServer,
        getInstallationDefaults,
        getServerDefaults,
        versions,
        minecraftVersions,
        selectedVersion,
        setSelectedVersion,
        javaVersions,
        javaIsMissing,
        refreshJava,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
