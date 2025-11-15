import { useState, useEffect, useCallback } from 'react';
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

    // Actions
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
        instances,
        selectedInstancePath,
        addInstance,
        editInstance,
        deleteInstance,
        selectInstance,
    };
}
