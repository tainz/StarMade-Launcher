// starmade-launcher-ui/contexts/DataContext.tsx

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import type { DataContextType as OriginalDataContextType, ManagedItem, Version } from '../types';
import { useUserState } from '../components/hooks/useUserState';
import { useInstanceServiceState } from '../components/hooks/useInstanceServiceState';
import { versionsData, defaultInstallationData, defaultServerData } from '../data/mockData';
import { CreateInstanceOption, EditInstanceOptions, Instance, MinecraftVersion } from '@xmcl/runtime-api';
import { useVersionService } from '../components/hooks/useVersionService';
import { useInstallService } from '../components/hooks/useInstallService';

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
        addInstance: createInstance,
        editInstance,
        deleteInstance,
        selectInstance,
    } = useInstanceServiceState();

    const { getMinecraftVersionList } = useVersionService();
    const { installMinecraft } = useInstallService();
    const [minecraftVersions, setMinecraftVersions] = useState<MinecraftVersion[]>([]);
    const [latestReleaseId, setLatestReleaseId] = useState<string | null>(null);

    useEffect(() => {
        getMinecraftVersionList().then((list) => {
            setMinecraftVersions(list.versions);
            setLatestReleaseId(list.latest.release);
        }).catch(err => {
            console.error("Failed to fetch Minecraft versions:", err);
        });
    }, [getMinecraftVersionList]);

    const selectedInstance = useMemo(() => {
        return instances.find(i => i.path === selectedInstancePath) || null;
    }, [instances, selectedInstancePath]);

    const mapInstanceToManagedItem = useCallback((i: Instance): ManagedItem => ({
      id: i.path, // CRITICAL: Use path as id
      name: i.name,
      version: i.runtime.minecraft,
      type: 'release', // This is a simplification
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

    const installations = useMemo(() => instances.filter(i => !i.server).map(mapInstanceToManagedItem), [instances, mapInstanceToManagedItem]);
    const servers = useMemo(() => instances.filter(i => !!i.server).map(mapInstanceToManagedItem), [instances, mapInstanceToManagedItem]);
    
    const [versions, setVersions] = useState<Version[]>(versionsData);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(versionsData[0] || null);

    const addInstallation = useCallback(async (item: ManagedItem) => {
        const options: CreateInstanceOption = {
            name: item.name,
            runtime: {
                minecraft: item.version,
                forge: '',
                fabricLoader: '',
                quiltLoader: '',
            },
            icon: item.icon,
            java: item.java,
            maxMemory: item.maxMemory,
            minMemory: item.minMemory,
            vmOptions: item.vmOptions?.split(' ').filter(v => v),
        };

        try {
            // 1. Create the instance record. The backend will generate the path.
            const newInstancePath = await createInstance(options);
            if (!newInstancePath) {
                throw new Error("Failed to create instance: No path returned.");
            }

            // 2. Find the version metadata for the selected version.
            const versionMeta = minecraftVersions.find(v => v.id === item.version);
            if (!versionMeta) {
                console.error(`Could not find Minecraft version metadata for ${item.version}`);
                return;
            }

            // 3. Trigger the installation of the Minecraft version to the shared versions directory.
            await installMinecraft(versionMeta);

            // 4. Edit the instance to ensure the version is set. This is somewhat redundant
            //    as we set it in createInstance, but it's good practice to confirm after install.
            await editInstance({
                instancePath: newInstancePath,
                runtime: {
                    minecraft: item.version,
                },
            });

        } catch (e) {
            console.error("Failed during instance creation and installation:", e);
            // Optionally, show a notification to the user
        }
    }, [createInstance, minecraftVersions, installMinecraft, editInstance]);

    const updateInstallation = useCallback((item: ManagedItem) => {
        const options: EditInstanceOptions & { instancePath: string } = {
            instancePath: item.id, // This is now correct (it's the path)
            name: item.name,
            runtime: {
                minecraft: item.version,
                forge: '',
                fabricLoader: '',
                quiltLoader: '',
            },
            icon: item.icon,
            java: item.java,
            maxMemory: item.maxMemory,
            minMemory: item.minMemory,
            vmOptions: item.vmOptions?.split(' ').filter(v => v),
        };
        editInstance(options);
    }, [editInstance]);

    const deleteInstallation = useCallback((id: string) => deleteInstance(id), [deleteInstance]);
    
    const addServer = useCallback((item: ManagedItem) => {
        const options: CreateInstanceOption = {
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
            java: item.java,
            maxMemory: item.maxMemory,
            minMemory: item.minMemory,
            vmOptions: item.vmOptions?.split(' ').filter(v => v),
        };
        createInstance(options);
    }, [createInstance]);

    const updateServer = useCallback((item: ManagedItem) => {
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
            java: item.java,
            maxMemory: item.maxMemory,
            minMemory: item.minMemory,
            vmOptions: item.vmOptions?.split(' ').filter(v => v),
        };
        editInstance(options);
    }, [editInstance]);

    const deleteServer = useCallback((id: string) => deleteInstance(id), [deleteInstance]);

    const getInstallationDefaults = useCallback(() => ({ 
        ...defaultInstallationData, 
        version: latestReleaseId || defaultInstallationData.version,
        id: Date.now().toString() 
    }), [latestReleaseId]);

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
