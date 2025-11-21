import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    InstanceServiceKey,
    Instance,
    InstanceState,
    EditInstanceOptions,
    CreateInstanceOption,
} from '@xmcl/runtime-api';
import { useService, useServiceMutation } from './useService';

export function useInstanceServiceState() {
    const instanceService = useService(InstanceServiceKey);

    // 1. Backend Shared State (Required for subscriptions to work)
    const [backendState, setBackendState] = useState<InstanceState | undefined>(undefined);

    // 2. Local UI State (For rendering)
    // We keep 'all' for O(1) lookups and 'list' for ordered UI rendering
    const [data, setData] = useState<{ all: Record<string, Instance>; list: Instance[] }>({
        all: {},
        list: []
    });

    const [selectedInstancePath, setSelectedInstancePath] = useState<string>(
        () => localStorage.getItem('selectedInstancePath') || ''
    );

    // Initial Fetch
    useEffect(() => {
        instanceService.getSharedInstancesState().then(sharedState => {
            // Store the backend object so useServiceMutation can subscribe to it
            setBackendState(sharedState);
            
            // Initialize local data
            setData({
                all: { ...sharedState.all },
                list: [...sharedState.instances]
            });
        });
    }, [instanceService]);

    // --- Mutations ---
    // We pass 'backendState' here. Once it loads, the subscription activates.

    useServiceMutation(backendState, 'instanceAdd', (instance: Instance) => {
        setData(prev => {
            // Prevent duplicates: if path exists, update it instead of adding
            if (prev.all[instance.path]) {
                const newAll = { ...prev.all, [instance.path]: instance };
                // Update the item in the list without changing order/length
                const newList = prev.list.map(i => i.path === instance.path ? instance : i);
                return { all: newAll, list: newList };
            }
            // Add new instance
            const newAll = { ...prev.all, [instance.path]: instance };
            const newList = [...prev.list, instance];
            return { all: newAll, list: newList };
        });
    });

    useServiceMutation(backendState, 'instanceRemove', (path: string) => {
        setData(prev => {
            if (!prev.all[path]) return prev; // Nothing to remove
            
            const { [path]: removed, ...newAll } = prev.all;
            const newList = prev.list.filter(i => i.path !== path);
            
            return { all: newAll, list: newList };
        });
    });

    useServiceMutation(backendState, 'instanceEdit', (payload: EditInstanceOptions & { path: string }) => {
        setData(prev => {
            const existing = prev.all[payload.path];
            if (!existing) return prev;
            
            const updated = { ...existing, ...payload };
            const newAll = { ...prev.all, [payload.path]: updated };
            const newList = prev.list.map(i => i.path === payload.path ? updated : i);
            
            return { all: newAll, list: newList };
        });
    });

    // --- Selection Logic (Auto-Select Guard) ---
    
    useEffect(() => {
        const hasInstances = data.list.length > 0;
        
        // Check if selection is empty OR if the selected ID no longer exists in the loaded list
        // (e.g. deleted externally or stale localStorage)
        const isSelectionInvalid = !selectedInstancePath || !data.all[selectedInstancePath];

        if (hasInstances && isSelectionInvalid) {
            // Prefer "Latest Version" if it exists, otherwise first available
            const latest = data.list.find(i => i.name === 'Latest Version');
            const target = latest ? latest.path : data.list[0].path;
            
            console.log('Auto-selecting instance:', target);
            
            setSelectedInstancePath(target);
            localStorage.setItem('selectedInstancePath', target);
            
            // Notify backend to update "Last Played" / Access time
            instanceService.editInstance({ 
                instancePath: target, 
                lastAccessDate: Date.now() 
            });
        }
    }, [data.list, data.all, selectedInstancePath, instanceService]);

    const selectedInstance = useMemo(() => {
        return data.all[selectedInstancePath] || null;
    }, [data.all, selectedInstancePath]);

    // --- Actions ---

    const addInstance = useCallback(async (options: CreateInstanceOption) => {
        return await instanceService.createInstance(options);
    }, [instanceService]);

    const editInstance = useCallback(async (options: EditInstanceOptions & { instancePath: string }) => {
        await instanceService.editInstance(options);
    }, [instanceService]);

    const deleteInstance = useCallback(async (path: string) => {
        await instanceService.deleteInstance(path);
        // If we deleted the selected instance, clear selection
        // The Auto-Select Guard above will catch this and select a new one automatically
        if (path === selectedInstancePath) {
            setSelectedInstancePath('');
            localStorage.removeItem('selectedInstancePath');
        }
    }, [instanceService, selectedInstancePath]);
    
    const selectInstance = useCallback((path: string) => {
        localStorage.setItem('selectedInstancePath', path);
        setSelectedInstancePath(path);
        instanceService.editInstance({ instancePath: path, lastAccessDate: Date.now() });
    }, [instanceService]);

    return {
        instances: data.list,
        selectedInstancePath,
        selectedInstance,
        addInstance,
        editInstance,
        deleteInstance,
        selectInstance,
    };
}
