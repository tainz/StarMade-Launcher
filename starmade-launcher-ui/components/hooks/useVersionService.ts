import { MinecraftVersionList } from '@xmcl-runtime-api';
import { useCallback } from 'react';

/**
 * A React hook to interact with Minecraft's version manifest.
 * This provides functions to fetch Minecraft version lists directly from Mojang's servers.
 */
export function useVersionService() {
    /**
     * Fetches the full list of available Minecraft versions from Mojang's version manifest.
     * It includes a fallback to a popular proxy for robustness.
     */
    const getMinecraftVersionList = useCallback(async (): Promise<MinecraftVersionList> => {
        const mojangUrl = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
        const bmclapiUrl = 'https://bmclapi2.bangbang93.com/mc/game/version_manifest.json';

        try {
            // Promise.any will return the first successful promise.
            const response = await Promise.any([
                fetch(mojangUrl),
                fetch(bmclapiUrl),
            ]);

            if (!response.ok) {
                // This will be caught by the catch block if all fetches fail.
                throw new Error(`Failed to fetch version manifest, status: ${response.status}`);
            }

            const data: MinecraftVersionList = await response.json();
            return data;
        } catch (e) {
            console.error("Could not fetch Minecraft version list from any source.", e);
            // Re-throw to be caught by the calling component/context
            throw new Error('Failed to fetch Minecraft version list.');
        }
    }, []);

    return {
        getMinecraftVersionList,
    };
}
