import { InstallServiceKey, MinecraftVersion } from '@xmcl/runtime-api';
import { useService } from './useService';
import { useCallback } from 'react';

/**
 * A React hook to interact with the backend's InstallService.
 * This provides functions to trigger installations of Minecraft, Forge, etc.
 */
export function useInstallService() {
    const installService = useService(InstallServiceKey);

    /**
     * Triggers the installation of a specific vanilla Minecraft version.
     * This installs the version to the shared versions directory, not a specific instance.
     */
    const installMinecraft = useCallback(async (versionMetadata: MinecraftVersion): Promise<void> => {
        await installService.installMinecraft(versionMetadata);
    }, [installService]);

    return {
        installMinecraft,
    };
}
