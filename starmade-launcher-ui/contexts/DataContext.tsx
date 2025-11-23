import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import type { DataContextType as OriginalDataContextType, ManagedItem } from '../types';
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

/**
 * Extended DataContext type with separated user state + auth actions
 */
export interface DataContextType extends OriginalDataContextType {
  // User state (read-only)
  userLoading: boolean;
  userError: string | null;
  
  // Auth actions + loading (from useLogin)
  loginMicrosoft: () => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;  // NEW: exposed for useUserDiagnose
  authLoading: boolean;  // NEW: separate from initial state load
  authError: string | null;  // NEW: separate from initial state load
  
  selectedInstance: Instance | null;
  selectInstance: (path: string) => void;
  
  // Updated signatures
  addInstallation: (options: CreateInstanceOption) => void;
  updateInstallation: (options: EditInstanceOptions & { instancePath: string }) => void;
  addServer: (options: CreateInstanceOption) => void;
  updateServer: (options: EditInstanceOptions & { instancePath: string }) => void;
  
  // NEW: raw instances list for edit flows
  instances: Instance[];
  
  // NEW: expose editInstance and globalSettings for useInstanceEdit
  editInstance: (options: EditInstanceOptions & { instancePath: string }) => Promise<void>;
  globalSettings: {
    globalMaxMemory: number;
    globalMinMemory: number;
    globalVmOptions: string[];
    globalMcOptions: string[];
    globalAssignMemory: boolean;
    globalFastLaunch: boolean;
    globalHideLauncher: boolean;
    globalShowLog: boolean;
    globalDisableAuthlibInjector: boolean;
    globalDisableElyByAuthlib: boolean;
    globalPrependCommand: string;
    globalPreExecuteCommand: string;
    globalResolution: { width: number; height: number } | undefined;
  };
}

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
    refreshUser,  // NEW: exposed for useUserDiagnose
    authLoading,  // NEW: separate from initial load
    authError,    // NEW: separate from initial load
    
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
    
    // NEW: raw instances, edit function, and global settings
    instances,
    editInstance,
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
