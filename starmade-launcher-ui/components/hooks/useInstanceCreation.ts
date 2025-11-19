import { useState, useCallback } from 'react';
import { 
  CreateInstanceOption, 
  InstanceServiceKey, 
  InstallServiceKey, 
  MinecraftVersion 
} from '@xmcl/runtime-api';
import { useService } from './useService';

export function useInstanceCreation() {
  const instanceService = useService(InstanceServiceKey);
  const installService = useService(InstallServiceKey);
  const [isCreating, setIsCreating] = useState(false);

  const createVanillaInstance = useCallback(async (
    options: CreateInstanceOption, 
    versionMeta: MinecraftVersion | undefined
  ) => {
    setIsCreating(true);
    try {
      // 1. Create Instance (Backend generates path and returns it)
      const newPath = await instanceService.createInstance(options);

      // 2. Trigger Version Install (Metadata only)
      // This ensures the version JSON is present. The actual assets/jars 
      // are diagnosed and installed by the Launch process (useInstanceVersionInstall).
      if (versionMeta) {
        await installService.installMinecraft(versionMeta);
      }

      return newPath;
    } catch (error) {
      console.error("Failed to create instance", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [instanceService, installService]);

  return { createVanillaInstance, isCreating };
}
