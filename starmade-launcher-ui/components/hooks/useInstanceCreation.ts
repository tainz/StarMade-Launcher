import { useState, useCallback } from 'react';
import { 
  CreateInstanceOption, 
  InstanceServiceKey, 
  InstallServiceKey, 
  MinecraftVersion 
} from '@xmcl/runtime-api';
import { useService } from './useService';
import { ManagedItem } from '../../types';

export function useInstanceCreation() {
  const instanceService = useService(InstanceServiceKey);
  const installService = useService(InstallServiceKey);
  const [isCreating, setIsCreating] = useState(false);

  const createVanillaInstance = useCallback(async (
    item: ManagedItem, 
    versionMeta: MinecraftVersion | undefined
  ) => {
    setIsCreating(true);
    try {
      // 1. Construct Options
      // We map the UI "ManagedItem" to the backend "CreateInstanceOption"
      const options: CreateInstanceOption = {
        name: item.name,
        version: item.version,
        runtime: {
          minecraft: item.version,
          forge: '',
          fabricLoader: '',
          quiltLoader: '',
          // Add other loaders here if supported in the future
        },
        java: item.java,
        maxMemory: item.maxMemory,
        minMemory: item.minMemory,
        vmOptions: item.vmOptions?.split(' ').filter(v => v.length > 0),
        mcOptions: item.mcOptions?.split(' ').filter(v => v.length > 0),
      };

      // 2. Create Instance (Backend generates path and returns it)
      const newPath = await instanceService.createInstance(options);

      // 3. Trigger Version Install (Metadata only)
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
