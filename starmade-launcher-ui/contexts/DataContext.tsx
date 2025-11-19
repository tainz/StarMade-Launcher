import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import type { DataContextType as OriginalDataContextType, ManagedItem, Version } from '../types';
import { useUserState } from '../components/hooks/useUserState';
import { useInstanceServiceState } from '../components/hooks/useInstanceServiceState';
import { versionsData, defaultInstallationData, defaultServerData } from '../data/mockData';
import { CreateInstanceOption, EditInstanceOptions, Instance, MinecraftVersion } from '@xmcl/runtime-api';
import { useVersionService } from '../components/hooks/useVersionService';
import { useInstallService } from '../components/hooks/useInstallService';
import { useJavaContext } from '../components/hooks/useJavaContext';
import { useInstanceCreation } from '../components/hooks/useInstanceCreation';

export interface DataContextType extends OriginalDataContextType {
    loginMicrosoft: () => Promise<any>;
    logout: () => Promise<void>;
    userLoading: boolean;
    userError: string | null;
    selectedInstance: Instance | null;
    selectInstance: (path: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helpers to map between UI types and Backend types
const toRuntimeFromManaged = (item: ManagedItem) => ({
    minecraft: item.version,
    forge: '',
    fabricLoader: '',
    quiltLoader: '',
});

const toCreateOptionsFromItem = (item: ManagedItem): CreateInstanceOption => ({
    name: item.name,
    runtime: toRuntimeFromManaged(item),
    version: item.version,
    icon: item.icon,
    java: item.java,
    maxMemory: item.maxMemory,
    minMemory: item.minMemory,
    vmOptions: item.vmOptions?.split(' ').filter(v => v),
    mcOptions: item.mcOptions?.split(' ').filter(v => v),
});

const toEditOptionsFromItem = (item: ManagedItem): EditInstanceOptions & { instancePath: string } => ({
    instancePath: item.id, // In this app, id == instance path
    name: item.name,
    runtime: toRuntimeFromManaged(item),
    version: item.version,
    icon: item.icon,
    java: item.java,
    maxMemory: item.maxMemory,
    minMemory: item.minMemory,
    vmOptions: item.vmOptions?.split(' ').filter(v => v),
    mcOptions: item.mcOptions?.split(' ').filter(v => v),
});

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { 
        users, 
        activeUser, 
        selectUser, 
        loginMicrosoft, 
        logout, 
        loading: userLoading, 
        error: userError 
    } = useUserState();

    const {
        instances,
        selectedInstancePath,
        addInstance: createInstance, // Used for servers
        editInstance,
        deleteInstance,
        selectInstance,
    } = useInstanceServiceState();

    const { getMinecraftVersionList } = useVersionService();
    // We still keep installMinecraft here if needed for other direct calls, 
    // but addInstallation now uses the hook.
    const { installMinecraft } = useInstallService(); 
    const [minecraftVersions, setMinecraftVersions] = useState<MinecraftVersion[]>([]);
    const [latestReleaseId, setLatestReleaseId] = useState<string | null>(null);

    // Import the new creation hook
    const { createVanillaInstance } = useInstanceCreation();

    // Load Minecraft Versions
    useEffect(() => {
        let cancelled = false;

        const loadVersions = async () => {
            try {
                const list = await getMinecraftVersionList();
                if (cancelled) return;

                setMinecraftVersions(list.versions);

                const latestId =
                    (list.latest && (list.latest.release || list.latest.snapshot)) || null;

                setLatestReleaseId(latestId);
            } catch (e) {
                console.error('Failed to load Minecraft versions', e);
                if (cancelled) return;
                setMinecraftVersions([]);
                setLatestReleaseId(null);
            }
        };

        loadVersions();

        return () => {
            cancelled = true;
        };
    }, [getMinecraftVersionList]);

    const selectedInstance = useMemo(() => {
        return instances.find(i => i.path === selectedInstancePath) || null;
    }, [instances, selectedInstancePath]);

    const mapInstanceToManagedItem = useCallback((i: Instance): ManagedItem => ({
      id: i.path,
      name: i.name,
      version: i.runtime.minecraft,
      type: 'release',
      icon: i.icon ?? 'release',
      path: i.path,
      lastPlayed: i.lastPlayedDate ? new Date(i.lastPlayedDate).toLocaleString() : 'Never',
      java: i.java,
      minMemory: i.minMemory,
      maxMemory: i.maxMemory,
      vmOptions: i.vmOptions?.join(' '),
      mcOptions: i.mcOptions?.join(' '),
      port: i.server?.host,
    }), []);

    const installations = useMemo(
        () => instances.filter(i => !i.server).map(mapInstanceToManagedItem),
        [instances, mapInstanceToManagedItem],
    );
    const servers = useMemo(
        () => instances.filter(i => !!i.server).map(mapInstanceToManagedItem),
        [instances, mapInstanceToManagedItem],
    );
    
    const [versions, setVersions] = useState<Version[]>(versionsData);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(versionsData[0] || null);

    // REFACTORED: Uses the new hook
    const addInstallation = useCallback(async (item: ManagedItem) => {
        const versionMeta = minecraftVersions.find(v => v.id === item.version);
        try {
            await createVanillaInstance(item, versionMeta);
        } catch (e) {
            console.error("Failed during instance creation:", e);
        }
    }, [createVanillaInstance, minecraftVersions]);

    const updateInstallation = useCallback((item: ManagedItem) => {
        const options: EditInstanceOptions & { instancePath: string } = toEditOptionsFromItem(item);
        editInstance(options);
    }, [editInstance]);

    const deleteInstallation = useCallback((id: string) => deleteInstance(id), [deleteInstance]);
    
    const addServer = useCallback((item: ManagedItem) => {
        const baseOptions = toCreateOptionsFromItem(item);
        const options: CreateInstanceOption = {
            ...baseOptions,
            server: {
                host: item.port || '127.0.0.1',
            },
        };
        createInstance(options);
    }, [createInstance]);

    const updateServer = useCallback((item: ManagedItem) => {
        const baseOptions: EditInstanceOptions & { instancePath: string } = toEditOptionsFromItem(item);
        const options: EditInstanceOptions & { instancePath: string } = {
            ...baseOptions,
            server: {
                host: item.port || '127.0.0.1',
            },
        };
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
    
    const { all: javaVersions, missing: javaIsMissing, refresh: refreshJava } = useJavaContext();

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
