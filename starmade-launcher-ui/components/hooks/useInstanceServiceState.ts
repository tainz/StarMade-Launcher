import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    InstanceServiceKey,
    Instance,
    InstanceState,
    EditInstanceOptions,
    CreateInstanceOption,
} from '@xmcl/runtime-api';
import { useService, useServiceMutation } from './useService';
import { ManagedItem } from '../../types';

export function useInstanceServiceState() {
    const instanceService = useService(InstanceServiceKey);

    const [state, setState] = useState<InstanceState | undefined>(undefined);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [selectedInstancePath, setSelectedInstancePath] = useState<string>(
        () => localStorage.getItem('selectedInstancePath') || ''
    );

    // Effect to fetch the initial state
    useEffect(() => {
        instanceService.getSharedInstancesState().then(initialState => {
            setState(initialState);
            const allInstances = Object.values(initialState.all);
            setInstances(allInstances);
            
            // Ensure a selection exists
            if (!selectedInstancePath || !allInstances.some(i => i.path === selectedInstancePath)) {
                const newPath = allInstances[0]?.path || '';
                setSelectedInstancePath(newPath);
                localStorage.setItem('selectedInstancePath', newPath);
            }
        });
    }, [instanceService]);

    // Mutation subscriptions to keep state in sync
    useServiceMutation(state, 'instanceAdd', (instance: Instance) => {
        setInstances(current => [...current, instance]);
    });

    useServiceMutation(state, 'instanceRemove', (path: string) => {
        setInstances(current => current.filter(i => i.path !== path));
    });

    useServiceMutation(state, 'instanceEdit', (payload: EditInstanceOptions & { path: string }) => {
        setInstances(current => current.map(i => i.path === payload.path ? { ...i, ...payload } : i));
    });

    // --- View Model Logic (Moved from DataContext) ---

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

    // --- Actions ---

    const addInstance = useCallback(async (options: CreateInstanceOption) => {
        return await instanceService.createInstance(options);
    }, [instanceService]);

    const editInstance = useCallback(async (options: EditInstanceOptions & { instancePath: string }) => {
        await instanceService.editInstance(options);
    }, [instanceService]);

    const deleteInstance = useCallback(async (path: string) => {
        await instanceService.deleteInstance(path);
    }, [instanceService]);
    
    const selectInstance = useCallback((path: string) => {
        localStorage.setItem('selectedInstancePath', path);
        setSelectedInstancePath(path);
        instanceService.editInstance({ instancePath: path, lastAccessDate: Date.now() });
    }, [instanceService]);

    return {
        // Raw Data
        instances,
        selectedInstancePath,
        selectedInstance,
        
        // View Models
        installations,
        servers,

        // Actions
        addInstance,
        editInstance,
        deleteInstance,
        selectInstance,
    };
}
