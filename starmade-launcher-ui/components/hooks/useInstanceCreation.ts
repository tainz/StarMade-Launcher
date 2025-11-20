import { useState, useCallback } from 'react';
import { 
  CreateInstanceOption, 
  InstanceServiceKey, 
  InstallServiceKey, 
  InstanceInstallServiceKey,
  MinecraftVersion 
} from '@xmcl/runtime-api';
import { InstanceFile } from '@xmcl/instance';
import { useService } from './useService';

export function useInstanceCreation() {
  const instanceService = useService(InstanceServiceKey);
  const installService = useService(InstallServiceKey);
  const instanceInstallService = useService(InstanceInstallServiceKey);
  
  const [isCreating, setIsCreating] = useState(false);

  const createVanillaInstance = useCallback(async (
    options: CreateInstanceOption, 
    versionMeta: MinecraftVersion | undefined,
    files: InstanceFile[] = []
  ) => {
    setIsCreating(true);
    try {
      // 1. Create Instance (Backend generates path and returns it)
      const newPath = await instanceService.createInstance(options);

      // 2. Trigger Version Install (Metadata only)
      // This ensures the version JSON is present immediately. 
      // The actual assets/jars are diagnosed and installed by the Launch process 
      // (useInstanceVersionInstall) later, but the JSON is needed for diagnosis.
      if (versionMeta) {
        await installService.installMinecraft(versionMeta);
      }

      // 3. Install Instance Files (Mirroring Vue logic)
      // If there are specific files (like resource packs, configs, or modpack overrides)
      // passed during creation, install them now.
      if (files.length > 0) {
        await instanceInstallService.installInstanceFiles({
          path: newPath,
          files: files,
          upstream: options.upstream
        });
      }

      return newPath;
    } catch (error) {
      console.error("Failed to create instance", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [instanceService, installService, instanceInstallService]);

  return { createVanillaInstance, isCreating };
}
