// starmade-launcher-ui/contexts/DataContext.tsx

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import type { DataContextType as OriginalDataContextType, ManagedItem, Version } from '../types';
import { useUserState } from '../components/hooks/useUserState';
import { useInstanceServiceState } from '../components/hooks/useInstanceServiceState';
import { versionsData, defaultInstallationData, defaultServerData } from '../data/mockData';
import { CreateInstanceOption, EditInstanceOptions, Instance } from '@xmcl/runtime-api';

export interface DataContextType extends OriginalDataContextType {
    loginMicrosoft: () => Promise<any>;
    logout: () => Promise<void>;
    userLoading: boolean;
    userError: string | null;
    selectedInstance: Instance | null;
    selectInstance: (path: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- User State (Live Data from Backend) ---
    const { 
        users, 
        activeUser, 
        selectUser, 
        loginMicrosoft, 
        logout, 
        loading: userLoading, 
        error: userError 
    } = useUserState();

    // --- Instance State (Live Data from Backend) ---
    const {
        instances,
        selectedInstancePath,
        addInstance: createInstance,
        editInstance,
        deleteInstance,
        selectInstance,
    } = useInstanceServiceState();

    const selectedInstance = useMemo(() => {
        return instances.find(i => i.path === selectedInstancePath) || null;
    }, [instances, selectedInstancePath]);

    // --- Mapped Instances for UI ---
    const installations = useMemo(() => instances.filter(i => !i.server), [instances]);
    const servers = useMemo(() => instances.filter(i => !!i.server), [instances]);
    
    // --- Other State (Still Mocked) ---
    const [versions, setVersions] = useState<Version[]>(versionsData);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(versionsData[0] || null);

    // --- Data Actions ---
    const addInstallation = (item: ManagedItem) => {
        const options: CreateInstanceOption = {
            name: item.name,
            runtime: {
                minecraft: item.version,
                forge: '',
                fabricLoader: '',
                quiltLoader: '',
            },
            path: item.path,
            icon: item.icon,
        };
        createInstance(options);
    };
    const updateInstallation = (item: ManagedItem) => {
        const options: EditInstanceOptions & { instancePath: string } = {
            instancePath: item.id, // Assuming item.id is the instance path
            name: item.name,
            runtime: {
                minecraft: item.version,
                forge: '',
                fabricLoader: '',
                quiltLoader: '',
            },
            icon: item.icon,
        };
        editInstance(options);
    };
    const deleteInstallation = (id: string) => deleteInstance(id);
    
    const addServer = (item: ManagedItem) => {
        const options: CreateInstanceOption = {
            name: item.name,
            runtime: {
                minecraft: item.version,
                forge: '',
                fabricLoader: '',
                quiltLoader: '',
            },
            path: item.path,
            server: {
                host: item.port || '127.0.0.1',
            },
            icon: item.icon,
        };
        createInstance(options);
    };
    const updateServer = (item: ManagedItem) => {
        const options: EditInstanceOptions & { instancePath: string } = {
            instancePath: item.id,
            name: item.name,
            runtime: {
                minecraft: item.version,
                forge: '',
                fabricLoader: '',
                quiltLoader: '',
            },
            server: {
                host: item.port || '127.0.0.1',
            },
            icon: item.icon,
        };
        editInstance(options);
    };
    const deleteServer = (id: string) => deleteInstance(id);

    const getInstallationDefaults = () => ({ ...defaultInstallationData, id: Date.now().toString() });
    const getServerDefaults = () => ({ ...defaultServerData, id: Date.now().toString() });

    // --- Combined Context Value ---
    const value: DataContextType = {
        // Live User Data
        accounts: users,
        activeAccount: activeUser,
        setActiveAccount: selectUser,
        loginMicrosoft,
        logout,
        userLoading,
        userError,

        // Live Instance Data
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

        // Mocked Data
        versions,
        selectedVersion,
        setSelectedVersion,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
