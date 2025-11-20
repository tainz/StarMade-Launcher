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

export interface CreationFormState {
  name: string;
  version: string;
  javaPath: string;
  memory: number;
  vmOptions: string;
  mcOptions: string;
}

export function useInstanceCreation() {
  const instanceService = useService(InstanceServiceKey);
  const installService = useService(InstallServiceKey);
  const instanceInstallService = useService(InstanceInstallServiceKey);
  
  // --- State Management (Vue Parity) ---
  const [formState, setFormState] = useState<CreationFormState>({
    name: '',
    version: '',
    javaPath: '',
    memory: 4096,
    vmOptions: '',
    mcOptions: '',
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Helper to update form fields
  const updateField = useCallback(<K extends keyof CreationFormState>(key: K, value: CreationFormState[K]) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState({
      name: '',
      version: '',
      javaPath: '',
      memory: 4096,
      vmOptions: '',
      mcOptions: '',
    });
    setError(null);
  }, []);

  // --- Core Logic ---

  /**
   * Stateless creation (Legacy support for DataContext)
   */
  const createVanillaInstance = useCallback(async (
    options: CreateInstanceOption, 
    versionMeta: MinecraftVersion | undefined,
    files: InstanceFile[] = []
  ) => {
    setIsCreating(true);
    setError(null);
    try {
      const newPath = await instanceService.createInstance(options);

      if (versionMeta) {
        await installService.installMinecraft(versionMeta);
      }

      if (files.length > 0) {
        await instanceInstallService.installInstanceFiles({
          path: newPath,
          files: files,
          upstream: options.upstream
        });
      }

      return newPath;
    } catch (e) {
      console.error("Failed to create instance", e);
      setError(e);
      throw e;
    } finally {
      setIsCreating(false);
    }
  }, [instanceService, installService, instanceInstallService]);

  /**
   * Stateful creation (New Pattern for Forms)
   * Uses the internal formState
   */
  const create = useCallback(async (
    versionMeta: MinecraftVersion | undefined,
    files: InstanceFile[] = []
  ) => {
    const options: CreateInstanceOption = {
      name: formState.name,
      version: formState.version,
      java: formState.javaPath || undefined,
      maxMemory: formState.memory,
      vmOptions: formState.vmOptions.split(' ').filter(x => x.length > 0),
      mcOptions: formState.mcOptions.split(' ').filter(x => x.length > 0),
      runtime: {
          minecraft: formState.version,
          forge: '',
          fabricLoader: '',
          quiltLoader: '',
      }
    };
    return createVanillaInstance(options, versionMeta, files);
  }, [formState, createVanillaInstance]);

  return { 
    // State
    formState, 
    isCreating, 
    error,
    
    // Actions
    updateField, 
    resetForm,
    create,              // Use this in InstallationForm
    createVanillaInstance // Use this in DataContext (Legacy)
  };
}
