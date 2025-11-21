import { useMemo, useCallback } from 'react';
import { Instance } from '@xmcl/runtime-api';
import { ManagedItem } from '../../types';

/**
 * View Model hook to transform raw backend Instance data into UI-ready ManagedItems.
 * Separates presentation logic from state management.
 */
export function useInstanceViewModel(instances: Instance[]) {
    const mapInstanceToManagedItem = useCallback((i: Instance): ManagedItem => ({
      id: i.path,
      name: i.name,
      version: i.runtime.minecraft,
      type: 'release', // Default to release, logic can be expanded if needed
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

    return {
        installations,
        servers,
    };
}
