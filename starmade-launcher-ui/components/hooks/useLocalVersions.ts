/**
 * useLocalVersions.ts
 * 
 * Domain-level hook for local version and server state.
 * Mirrors Vue's `versionLocal.ts` composable.
 * 
 * Provides the single source of truth for locally installed Minecraft versions
 * and local server versions, replacing ad-hoc inference from instance data or remote manifests.
 */

import { useState, useEffect } from 'react';
import { VersionServiceKey, VersionHeader, ServerVersionHeader } from '@xmcl/runtime-api';
import { useService } from './useService';

export interface UseLocalVersionsReturn {
  versions: VersionHeader[];
  servers: ServerVersionHeader[];
  loading: boolean;
  error: unknown | null;
}

/**
 * Hook to fetch and manage locally installed Minecraft versions and servers.
 * 
 * Should be used in settings and install UIs wherever Vue injects `kLocalVersions`,
 * instead of inferring local versions from instances or remote manifests.
 * 
 * @returns Local versions, servers, loading state, and error
 */
export function useLocalVersions(): UseLocalVersionsReturn {
  const versionService = useService(VersionServiceKey);

  const [versions, setVersions] = useState<VersionHeader[]>([]);
  const [servers, setServers] = useState<ServerVersionHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    versionService
      .getLocalVersions()
      .then((result) => {
        setVersions(result.versions ?? []);
        setServers(result.servers ?? []);
      })
      .catch((e) => {
        console.error('useLocalVersions: Failed to fetch local versions', e);
        setError(e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [versionService]);

  return { versions, servers, loading, error };
}

