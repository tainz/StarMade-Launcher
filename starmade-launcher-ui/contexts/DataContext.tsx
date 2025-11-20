// starmade-launcher-ui/contexts/DataContext.tsx
import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import type { DataContextType as OriginalDataContextType, ManagedItem } from '../types';
import { useUserState } from '../components/hooks/useUserState';
import { useInstanceServiceState } from '../components/hooks/useInstanceServiceState';
import { defaultInstallationData, defaultServerData } from '../data/mockData';
import { CreateInstanceOption, EditInstanceOptions, Instance, MinecraftVersion } from '@xmcl/runtime-api';
import { useInstallService } from '../components/hooks/useInstallService';
import { useJavaContext } from '../components/hooks/useJavaContext';
import { useInstanceCreation } from '../components/hooks/useInstanceCreation';
import { useVersionState } from '../components/hooks/useVersionState';

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

    // 2. Instance State (Now handles View Model mapping internally)
    const {
        instances, // Raw instances if needed
        selectedInstance,
        installations, // Mapped ManagedItems
        servers,       // Mapped ManagedItems
        addInstance: createInstanceRaw,
        editInstance,
        deleteInstance,
        selectInstance,
    } = useInstanceServiceState();

    // 3. Version State
    const { 
        minecraftVersions, 
        latestReleaseId,
        versions,
        selectedVersion,
        setSelectedVersion
    } = useVersionState();

    // 4. Java State
    const { 
        all: javaVersions, 
        missing: javaIsMissing, 
        refresh: refreshJava 
    } = useJavaContext();

    // 5. Installation Services
    const { createVanillaInstance } = useInstanceCreation();

    // --- Orchestration Actions ---
    // These combine data from multiple hooks (e.g. creating instance + using version meta)

    const addInstallation = useCallback(async (options: CreateInstanceOption) => {
        const versionMeta = minecraftVersions.find(v => v.id === options.version);
        try {
            // Uses the specialized hook that handles version JSON installation
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
        // Servers don't need the complex version JSON install logic usually, 
        // but we use the raw create for simplicity here
        createInstanceRaw(options);
    }, [createInstanceRaw]);

    const updateServer = useCallback((options: EditInstanceOptions & { instancePath: string }) => {
        editInstance(options);
    }, [editInstance]);

    const deleteServer = useCallback((id: string) => deleteInstance(id), [deleteInstance]);

    const getInstallationDefaults = useCallback(
        () => ({ 
            ...defaultInstallationData, 
            version: latestReleaseId || defaultInstallationData.version,
            id: Date.now().toString(),
        }),
        [latestReleaseId],
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
