import { useState, useEffect, useCallback, useMemo } from 'react';
import { MinecraftVersion } from '@xmcl/runtime-api';
import { useVersionService } from './useVersionService';
import { Version } from '../../types';
import { versionsData } from '../../data/mockData'; // Fallback/Mock data

export function useVersionState() {
    const { getMinecraftVersionList } = useVersionService();
    
    const [minecraftVersions, setMinecraftVersions] = useState<MinecraftVersion[]>([]);
    const [latestReleaseId, setLatestReleaseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    // UI Specific State (formerly in DataContext)
    // We keep the mock 'versions' for the UI dropdowns that aren't fully connected to backend yet
    const [versions, setVersions] = useState<Version[]>(versionsData);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(versionsData[0] || null);

    const refreshVersions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await getMinecraftVersionList();
            
            setMinecraftVersions(list.versions);

            const latestId = (list.latest && (list.latest.release || list.latest.snapshot)) || null;
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
        refreshVersions,
        // UI specific exports
        versions,
        selectedVersion,
        setSelectedVersion
    };
}
