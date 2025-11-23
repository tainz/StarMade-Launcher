import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import type { DataContextType, ManagedItem } from '../types';
import { useUserState } from '../components/hooks/useUserState';
import { useLogin } from '../components/hooks/useLogin';
import { useInstanceServiceState } from '../components/hooks/useInstanceServiceState';
import { useInstanceViewModel } from '../components/hooks/useInstanceViewModel';
import { defaultInstallationData, defaultServerData } from '../data/mockData';
import {
  CreateInstanceOption,
  EditInstanceOptions,
  Instance,
  MinecraftVersion,
} from '@xmcl/runtime-api';
import { useJavaContext } from '../components/hooks/useJavaContext';
import { useInstanceCreation } from '../components/hooks/useInstanceCreation';
import { useVersionState } from '../components/hooks/useVersionState';
import { useEnsureLatestInstance } from '../components/hooks/useEnsureLatestInstance';

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. User State (state only)
  const { 
    users, 
    activeUser, 
    selectUser,
    loading: userLoading,
    error: userError 
  } = useUserState();
  
  // 2. User Actions (auth only, with dependency injection)
  const { 
    loginMicrosoft, 
    logout, 
    refreshUser,
    loading: authLoading,
    error: authError 
  } = useLogin({ activeUser, selectUser });
  
  // 3. Instance State (Raw Data + Actions)
  const {
    instances,
    selectedInstance,
    addInstance: createInstanceRaw,
    editInstance,
    deleteInstance,
    selectInstance,
    isInitialized,
  } = useInstanceServiceState();
  
  // 4. Instance View Model
  const { installations, servers } = useInstanceViewModel(instances);
  
  // 5. Version State
  const {
    minecraftVersions,
    versions,
    selectedVersion,
    setSelectedVersion
  } = useVersionState();
  
  // 6. Java State
  const {
    all: javaVersions,
    missing: javaIsMissing,
    refresh: refreshJava
  } = useJavaContext();
  
  // 7. Installation Services
  const { createVanillaInstance } = useInstanceCreation();
  
  // 8. Global Settings (stub for now)
  const globalSettings = {
    globalMaxMemory: 4096,
    globalMinMemory: 1024,
    globalVmOptions: [] as string[],
    globalMcOptions: [] as string[],
    globalAssignMemory: false,
    globalFastLaunch: false,
    globalHideLauncher: true,
    globalShowLog: false,
    globalDisableAuthlibInjector: false,
    globalDisableElyByAuthlib: false,
    globalPrependCommand: '',
    globalPreExecuteCommand: '',
    globalResolution: undefined as { width: number; height: number } | undefined,
  };
  
  // Ensure Latest Version instance exists
  useEnsureLatestInstance(
    instances,
    minecraftVersions,
    createVanillaInstance,
    editInstance,
    isInitialized,
  );
  
  const addInstallation = useCallback(async (options: CreateInstanceOption) => {
    const versionMeta = minecraftVersions.find((v) => v.id === options.version);
    try {
      await createVanillaInstance(options, versionMeta);
    } catch (e) {
      console.error('Failed during instance creation', e);
    }
  }, [createVanillaInstance, minecraftVersions]);
  
  const updateInstallation = useCallback((options: EditInstanceOptions & { instancePath: string }) => {
    editInstance(options);
  }, [editInstance]);
  
  const deleteInstallation = useCallback((id: string) => {
    deleteInstance(id);
  }, [deleteInstance]);
  
  const addServer = useCallback(async (options: CreateInstanceOption) => {
    const versionMeta = minecraftVersions.find((v) => v.id === options.version);
    try {
      await createVanillaInstance(options, versionMeta);
    } catch (e) {
      console.error('Failed during server creation', e);
    }
  }, [createVanillaInstance, minecraftVersions]);
  
  const updateServer = useCallback((options: EditInstanceOptions & { instancePath: string }) => {
    editInstance(options);
  }, [editInstance]);
  
  const deleteServer = useCallback((id: string) => {
    deleteInstance(id);
  }, [deleteInstance]);
  
  const getInstallationDefaults = useCallback((): ManagedItem => ({
    ...defaultInstallationData,
    version: minecraftVersions.find((v) => v.type === 'release')?.id || defaultInstallationData.version,
    id: Date.now().toString(),
  }), [minecraftVersions]);
  
  const getServerDefaults = useCallback((): ManagedItem => ({
    ...defaultServerData,
    version: minecraftVersions.find((v) => v.type === 'release')?.id || defaultServerData.version,
    id: Date.now().toString(),
  }), [minecraftVersions]);
  
  // Build value object conforming to DataContextType
  const value: DataContextType = {
    // User state (read)
    accounts: users,
    activeAccount: activeUser,
    setActiveAccount: selectUser,
    userLoading,
    userError,
    
    // User actions (write)
    loginMicrosoft,
    logout,
    refreshUser,
    authLoading,
    authError,
    
    // Instance state
    installations,
    servers,
    selectedInstance,
    instances,
    
    // Instance actions
    selectInstance,
    addInstallation,
    updateInstallation,
    deleteInstallation,
    addServer,
    updateServer,
    deleteServer,
    getInstallationDefaults,
    getServerDefaults,
    editInstance,
    
    // Version state
    versions,
    minecraftVersions,
    selectedVersion,
    setSelectedVersion,
    
    // Java state
    javaVersions,
    javaIsMissing,
    refreshJava,
    
    // Global settings
    globalSettings,
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
