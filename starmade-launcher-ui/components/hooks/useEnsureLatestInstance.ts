import { useEffect, useRef } from 'react';
import { Instance, MinecraftVersion, CreateInstanceOption, EditInstanceOptions } from '@xmcl/runtime-api';

/**
 * Automatically ensures an instance named "Latest Version" exists
 * and is always updated to the latest release ID found in the manifest.
 */
export function useEnsureLatestInstance(
    instances: Instance[],
    minecraftVersions: MinecraftVersion[],
    createInstance: (options: CreateInstanceOption, versionMeta: MinecraftVersion | undefined) => Promise<string>,
    editInstance: (options: EditInstanceOptions & { instancePath: string }) => Promise<void>,
    isInitialized: boolean
) {
    const creatingRef = useRef(false);

    useEffect(() => {
        // 0. Wait for initialization to avoid creating duplicates of existing instances
        if (!isInitialized) return;

        // 1. Wait for version manifest to load
        if (minecraftVersions.length === 0) return;

        // 2. Identify the latest release
        const latestRelease = minecraftVersions.find(v => v.type === 'release');
        if (!latestRelease) return;

        // 3. Check if our specific instance exists
        const latestInstance = instances.find(i => i.name === 'Latest Version');

        if (!latestInstance) {
            // Case A: Create it if missing
            // Use ref to prevent double-creation race conditions
            if (creatingRef.current) return;
            
            console.log('Creating default "Latest Version" instance...');
            creatingRef.current = true;
            
            createInstance({
                name: 'Latest Version',
                version: latestRelease.id,
                icon: 'rocket', // Default icon
            }, latestRelease)
            .catch(e => console.error("Failed to create Latest Version instance", e))
            .finally(() => {
                creatingRef.current = false;
            });
        } else {
            // Case B: Update it if out of date
            const currentVersion = latestInstance.version || latestInstance.runtime.minecraft;
            
            if (currentVersion !== latestRelease.id) {
                console.log(`Updating "Latest Version" instance from ${currentVersion} to ${latestRelease.id}`);
                editInstance({
                    instancePath: latestInstance.path,
                    version: latestRelease.id,
                    runtime: { 
                        ...latestInstance.runtime, 
                        minecraft: latestRelease.id 
                    }
                }).catch(e => console.error("Failed to update Latest Version instance", e));
            }
        }
    }, [instances, minecraftVersions, createInstance, editInstance, isInitialized]);
}
