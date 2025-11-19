import { useState, useEffect, useCallback } from 'react';
import { MinecraftVersion } from '@xmcl/runtime-api';
import { useVersionService } from './useVersionService';

export function useVersionState() {
    const { getMinecraftVersionList } = useVersionService();
    
    const [minecraftVersions, setMinecraftVersions] = useState<MinecraftVersion[]>([]);
    const [latestReleaseId, setLatestReleaseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const refreshVersions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await getMinecraftVersionList();
            
            setMinecraftVersions(list.versions);

            const latestId =
                (list.latest && (list.latest.release || list.latest.snapshot)) || null;

            setLatestReleaseId(latestId);
        } catch (e) {
            console.error('Failed to load Minecraft versions', e);
            setError(e);
            setMinecraftVersions([]);
            setLatestReleaseId(null);
        } finally {
            setLoading(false);
        }
    }, [getMinecraftVersionList]);

    // Initial load
    useEffect(() => {
        refreshVersions();
    }, [refreshVersions]);

    return {
        minecraftVersions,
        latestReleaseId,
        loading,
        error,
        refreshVersions
    };
}
