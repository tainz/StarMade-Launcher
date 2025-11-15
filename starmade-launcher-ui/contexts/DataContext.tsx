import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { DataContextType as OriginalDataContextType, ManagedItem, Version } from '../types';
import { useUserState } from '../components/hooks/useUserState';
import { 
    versionsData, 
    initialInstallationsData, 
    initialServersData,
    defaultInstallationData,
    defaultServerData
} from '../data/mockData';

// Extend the original DataContextType to include new user actions and state
export interface DataContextType extends OriginalDataContextType {
    loginMicrosoft: () => Promise<any>;
    logout: () => Promise<void>;
    userLoading: boolean;
    userError: string | null;
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
    
    // --- Other State (Still Mocked) ---
    const [installations, setInstallations] = useState<ManagedItem[]>(initialInstallationsData);
    const [servers, setServers] = useState<ManagedItem[]>(initialServersData);
    const [versions, setVersions] = useState<Version[]>(versionsData);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(versionsData[0] || null);

    // --- Mock Data Actions ---
    const addInstallation = (item: ManagedItem) => setInstallations(prev => [item, ...prev]);
    const updateInstallation = (item: ManagedItem) => setInstallations(prev => prev.map(i => i.id === item.id ? item : i));
    const deleteInstallation = (id: string) => setInstallations(prev => prev.filter(i => i.id !== id));
    
    const addServer = (item: ManagedItem) => setServers(prev => [item, ...prev]);
    const updateServer = (item: ManagedItem) => setServers(prev => prev.map(s => s.id === item.id ? item : s));
    const deleteServer = (id: string) => setServers(prev => prev.filter(s => s.id !== id));

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

        // Mocked Data
        installations,
        servers,
        versions,
        selectedVersion,
        setSelectedVersion,
        addInstallation,
        updateInstallation,
        deleteInstallation,
        addServer,
        updateServer,
        deleteServer,
        getInstallationDefaults,
        getServerDefaults,
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
