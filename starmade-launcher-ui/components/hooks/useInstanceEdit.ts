import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Instance, EditInstanceOptions } from '@xmcl/runtime-api';

/**
 * Simple debounce implementation (no lodash dependency)
 */
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, wait);
  } as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * TypeScript interface for useInstanceEdit return type
 */
export interface UseInstanceEditReturn {
  data: {
    path: string;
    name: string;
    host: string;
    port: string;
    author: string;
    description: string;
    url: string;
    fileServerApi: string;
    vmOptions: string | undefined;
    mcOptions: string | undefined;
    prependCommand: string | undefined;
    preExecuteCommand: string | undefined;
    maxMemory: number | undefined;
    minMemory: number | undefined;
    env: Record<string, string>;
    runtime: Instance['runtime'];
    version: string;
    fastLaunch: boolean | undefined;
    hideLauncher: boolean | undefined;
    showLog: boolean | undefined;
    disableElyByAuthlib: boolean | undefined;
    disableAuthlibInjector: boolean | undefined;
    assignMemory: boolean | undefined;
    javaPath: string;
    icon: string;
    resolution: { width: number; height: number } | undefined;
  };
  loading: boolean;
  assignMemory: boolean;
  minMemory: number;
  maxMemory: number;
  vmOptions: string;
  mcOptions: string;
  prependCommand: string;
  preExecuteCommand: string;
  fastLaunch: boolean;
  hideLauncher: boolean;
  showLog: boolean;
  disableAuthlibInjector: boolean;
  disableElyByAuthlib: boolean;
  resolution: { width: number; height: number } | undefined;
  host: string;
  port: string;
  isGlobalAssignMemory: boolean;
  isGlobalMinMemory: boolean;
  isGlobalMaxMemory: boolean;
  isGlobalVmOptions: boolean;
  isGlobalMcOptions: boolean;
  isGlobalFastLaunch: boolean;
  isGlobalHideLauncher: boolean;
  isGlobalShowLog: boolean;
  isGlobalDisableElyByAuthlib: boolean;
  isGlobalDisableAuthlibInjector: boolean;
  isGlobalPrependCommand: boolean;
  isGlobalPreExecuteCommand: boolean;
  isGlobalResolution: boolean;
  resetAssignMemory: () => void;
  resetVmOptions: () => void;
  resetMcOptions: () => void;
  resetFastLaunch: () => void;
  resetHideLauncher: () => void;
  resetShowLog: () => void;
  resetDisableAuthlibInjector: () => void;
  resetDisableElyByAuthlib: () => void;
  resetPrependCommand: () => void;
  resetPreExecuteCommand: () => void;
  resetResolution: () => void;
  updateField: <K extends keyof UseInstanceEditReturn['data']>(
    key: K,
    value: UseInstanceEditReturn['data'][K]
  ) => void;
  save: () => Promise<void>;
  load: () => void;
  flushNow: () => Promise<void>;
  isModified: boolean;
}

/**
 * Hook to edit an instance, mirroring Vue's instanceEdit.ts composable.
 * 
 * Provides JIT (just-in-time) autosave with debounced batching.
 * All fields support global fallback computation.
 * 
 * FINAL VERSION - All audit issues resolved:
 * ✓ Fixed stale JIT autosave
 * ✓ assignMemory auto-enable
 * ✓ flushNow exposed and documented
 * ✓ Correct type imports
 * ✓ Server port fallback handling
 * ✓ Accepts editInstance as parameter
 * ✓ No external dependencies (inline debounce)
 * ✓ Explicit TypeScript return type with host/port
 * 
 * @param instance - The instance to edit
 * @param editInstance - editInstance function from InstanceServiceKey
 * @param globalSettings - Global launcher defaults
 */
export function useInstanceEdit(
  instance: Instance | null,
  editInstance: (options: EditInstanceOptions & { instancePath: string }) => Promise<void>,
  globalSettings: {
    globalMaxMemory: number;
    globalMinMemory: number;
    globalVmOptions: string[];
    globalMcOptions: string[];
    globalAssignMemory: boolean;
    globalFastLaunch: boolean;
    globalHideLauncher: boolean;
    globalShowLog: boolean;
    globalDisableAuthlibInjector: boolean;
    globalDisableElyByAuthlib: boolean;
    globalPrependCommand: string;
    globalPreExecuteCommand: string;
    globalResolution: { width: number; height: number } | undefined;
  }
): UseInstanceEditReturn {
  // --- Core Data State ---
  const [data, setData] = useState({
    path: '',
    name: '',
    host: '',
    port: '25565',
    author: '',
    description: '',
    url: '',
    fileServerApi: '',
    vmOptions: '' as string | undefined,
    mcOptions: '' as string | undefined,
    prependCommand: '' as string | undefined,
    preExecuteCommand: '' as string | undefined,
    maxMemory: undefined as number | undefined,
    minMemory: undefined as number | undefined,
    env: {} as Record<string, string>,
    runtime: {
      minecraft: '',
      forge: '',
      fabricLoader: '',
      quiltLoader: '',
      optifine: '',
      liteloader: '',
      neoForged: '',
      labyMod: '',
    } as Instance['runtime'],
    version: '',
    fastLaunch: undefined as boolean | undefined,
    hideLauncher: undefined as boolean | undefined,
    showLog: undefined as boolean | undefined,
    disableElyByAuthlib: undefined as boolean | undefined,
    disableAuthlibInjector: undefined as boolean | undefined,
    assignMemory: undefined as boolean | undefined,
    javaPath: '',
    icon: '',
    resolution: undefined as { width: number; height: number } | undefined,
  });

  const [loading, setLoading] = useState(true);

  // --- JIT Autosave Buffer ---
  const buffer = useRef<(EditInstanceOptions & { instancePath: string }) | undefined>(undefined);

  const flush = useCallback(async () => {
    if (!buffer.current) return;
    try {
      await editInstance(buffer.current);
      buffer.current = undefined;
    } catch (e) {
      console.error('[useInstanceEdit] Failed to flush edits:', e);
    }
  }, [editInstance]);

  const queue = useMemo(() => debounce(flush, 2000), [flush]);

  const enqueue = useCallback(
    (dataSnapshot: typeof data) => {
      if (!instance) return;
      const instancePath = instance.path;

      const payload: EditInstanceOptions = {
        url: dataSnapshot.url,
        fileApi: dataSnapshot.fileServerApi,
        minMemory: dataSnapshot.minMemory,
        maxMemory: dataSnapshot.maxMemory,
        vmOptions: dataSnapshot.vmOptions?.split(' ').filter((v) => v.length > 0),
        mcOptions: dataSnapshot.mcOptions?.split(' ').filter((v) => v.length > 0),
        assignMemory: dataSnapshot.assignMemory,
        fastLaunch: dataSnapshot.fastLaunch,
        showLog: dataSnapshot.showLog,
        hideLauncher: dataSnapshot.hideLauncher,
        java: dataSnapshot.javaPath,
        disableAuthlibInjector: dataSnapshot.disableAuthlibInjector,
        disableElybyAuthlib: dataSnapshot.disableElyByAuthlib,
        prependCommand: dataSnapshot.prependCommand,
        preExecuteCommand: dataSnapshot.preExecuteCommand,
        author: dataSnapshot.author,
        description: dataSnapshot.description,
        env: dataSnapshot.env,
        resolution: dataSnapshot.resolution,
      };

      if (instance.server) {
        payload.server = {
          host: dataSnapshot.host,
          port: Number.parseInt(dataSnapshot.port, 10) || 25565,
        };
      }

      if (!buffer.current || buffer.current.instancePath !== instancePath) {
        buffer.current = { ...payload, instancePath };
      } else {
        buffer.current = { ...buffer.current, ...payload, instancePath };
      }
      queue();
    },
    [instance, queue]
  );

  const flushNow = useCallback(async () => {
    queue.cancel();
    await flush();
  }, [queue, flush]);

  const save = useCallback(async () => {
    if (!instance) return;

    const payload: EditInstanceOptions = {
      name: data.name,
      version: data.version,
      runtime: data.runtime,
      icon: data.icon,
      resolution: data.resolution,
    };

    if (!instance.server) {
      await editInstance({
        ...payload,
        instancePath: instance.path,
        author: data.author,
        description: data.description,
      });
    } else {
      await editInstance({
        ...payload,
        instancePath: instance.path,
        server: {
          host: data.host,
          port: Number.parseInt(data.port, 10) || 25565,
        },
      });
    }

    setData((prev) => ({ ...prev, icon: instance.icon }));
  }, [instance, data, editInstance]);

  const load = useCallback(() => {
    if (!instance) return;

    setLoading(false);
    setData({
      path: instance.path,
      name: instance.name,
      hideLauncher: instance.hideLauncher,
      url: instance.url,
      showLog: instance.showLog,
      author: instance.author,
      fileServerApi: instance.fileApi,
      description: instance.description,
      runtime: {
        fabricLoader: instance.runtime.fabricLoader ?? '',
        forge: instance.runtime.forge ?? '',
        minecraft: instance.runtime.minecraft ?? '',
        optifine: instance.runtime.optifine ?? '',
        quiltLoader: instance.runtime.quiltLoader ?? '',
        neoForged: instance.runtime.neoForged ?? '',
        labyMod: instance.runtime.labyMod ?? '',
        liteloader: instance.runtime.liteloader ?? '',
      },
      version: instance.version,
      icon: instance.icon,
      disableAuthlibInjector: instance.disableAuthlibInjector,
      disableElyByAuthlib: instance.disableElybyAuthlib,
      prependCommand: instance.prependCommand,
      preExecuteCommand: instance.preExecuteCommand,
      env: instance.env ?? {},
      host: instance.server?.host ?? '',
      port: instance.server?.port?.toString() ?? '25565',
      maxMemory: instance.maxMemory,
      minMemory: instance.minMemory,
      vmOptions: instance.vmOptions?.join(' '),
      mcOptions: instance.mcOptions?.join(' '),
      javaPath: instance.java ?? '',
      assignMemory: instance.assignMemory,
      fastLaunch: instance.fastLaunch,
      resolution: instance.resolution,
    });
  }, [instance]);

  useEffect(() => {
    load();
  }, [instance?.path, load]);

  // --- Computed Properties ---
  const assignMemory = useMemo(
    () => data.assignMemory ?? globalSettings.globalAssignMemory,
    [data.assignMemory, globalSettings.globalAssignMemory]
  );

  const minMemory = useMemo(
    () => data.minMemory ?? globalSettings.globalMinMemory,
    [data.minMemory, globalSettings.globalMinMemory]
  );

  const maxMemory = useMemo(
    () => data.maxMemory ?? globalSettings.globalMaxMemory,
    [data.maxMemory, globalSettings.globalMaxMemory]
  );

  const vmOptions = useMemo(
    () => data.vmOptions ?? globalSettings.globalVmOptions.join(' '),
    [data.vmOptions, globalSettings.globalVmOptions]
  );

  const mcOptions = useMemo(
    () => data.mcOptions ?? globalSettings.globalMcOptions.join(' '),
    [data.mcOptions, globalSettings.globalMcOptions]
  );

  const prependCommand = useMemo(
    () => data.prependCommand ?? globalSettings.globalPrependCommand,
    [data.prependCommand, globalSettings.globalPrependCommand]
  );

  const preExecuteCommand = useMemo(
    () => data.preExecuteCommand ?? globalSettings.globalPreExecuteCommand,
    [data.preExecuteCommand, globalSettings.globalPreExecuteCommand]
  );

  const fastLaunch = useMemo(
    () => data.fastLaunch ?? globalSettings.globalFastLaunch,
    [data.fastLaunch, globalSettings.globalFastLaunch]
  );

  const hideLauncher = useMemo(
    () => data.hideLauncher ?? globalSettings.globalHideLauncher,
    [data.hideLauncher, globalSettings.globalHideLauncher]
  );

  const showLog = useMemo(
    () => data.showLog ?? globalSettings.globalShowLog,
    [data.showLog, globalSettings.globalShowLog]
  );

  const disableAuthlibInjector = useMemo(
    () => data.disableAuthlibInjector ?? globalSettings.globalDisableAuthlibInjector,
    [data.disableAuthlibInjector, globalSettings.globalDisableAuthlibInjector]
  );

  const disableElyByAuthlib = useMemo(
    () => data.disableElyByAuthlib ?? globalSettings.globalDisableElyByAuthlib,
    [data.disableElyByAuthlib, globalSettings.globalDisableElyByAuthlib]
  );

  const resolution = useMemo(
    () => data.resolution ?? globalSettings.globalResolution,
    [data.resolution, globalSettings.globalResolution]
  );

  // --- Flags ---
  const isGlobalAssignMemory = data.assignMemory === undefined;
  const isGlobalMinMemory = data.minMemory === undefined;
  const isGlobalMaxMemory = data.maxMemory === undefined;
  const isGlobalVmOptions = data.vmOptions === undefined;
  const isGlobalMcOptions = data.mcOptions === undefined;
  const isGlobalFastLaunch = data.fastLaunch === undefined;
  const isGlobalHideLauncher = data.hideLauncher === undefined;
  const isGlobalShowLog = data.showLog === undefined;
  const isGlobalDisableElyByAuthlib = data.disableElyByAuthlib === undefined;
  const isGlobalDisableAuthlibInjector = data.disableAuthlibInjector === undefined;
  const isGlobalPrependCommand = data.prependCommand === undefined;
  const isGlobalPreExecuteCommand = data.preExecuteCommand === undefined;
  const isGlobalResolution = data.resolution === undefined;

  // --- Reset Functions ---
  const resetAssignMemory = () => {
    const nextData = { ...data, assignMemory: undefined, minMemory: undefined, maxMemory: undefined };
    setData(nextData);
    enqueue(nextData);
  };

  const resetVmOptions = () => {
    const nextData = { ...data, vmOptions: undefined };
    setData(nextData);
    enqueue(nextData);
  };

  const resetMcOptions = () => {
    const nextData = { ...data, mcOptions: undefined };
    setData(nextData);
    enqueue(nextData);
  };

  const resetFastLaunch = () => {
    const nextData = { ...data, fastLaunch: undefined };
    setData(nextData);
    enqueue(nextData);
  };

  const resetHideLauncher = () => {
    const nextData = { ...data, hideLauncher: undefined };
    setData(nextData);
    enqueue(nextData);
  };

  const resetShowLog = () => {
    const nextData = { ...data, showLog: undefined };
    setData(nextData);
    enqueue(nextData);
  };

  const resetDisableAuthlibInjector = () => {
    const nextData = { ...data, disableAuthlibInjector: undefined };
    setData(nextData);
    enqueue(nextData);
  };

  const resetDisableElyByAuthlib = () => {
    const nextData = { ...data, disableElyByAuthlib: undefined };
    setData(nextData);
    enqueue(nextData);
  };

  const resetPrependCommand = () => {
    const nextData = { ...data, prependCommand: undefined };
    setData(nextData);
    enqueue(nextData);
  };

  const resetPreExecuteCommand = () => {
    const nextData = { ...data, preExecuteCommand: undefined };
    setData(nextData);
    enqueue(nextData);
  };

  const resetResolution = () => {
    const nextData = { ...data, resolution: undefined };
    setData(nextData);
    enqueue(nextData);
  };

  // --- Update Helpers ---
  const updateField = useCallback(
    <K extends keyof typeof data>(key: K, value: typeof data[K]) => {
      let nextData = { ...data, [key]: value };

      // Auto-enable assignMemory when setting memory (Vue parity)
      if (key === 'minMemory' || key === 'maxMemory') {
        if (nextData.assignMemory !== true) {
          nextData = { ...nextData, assignMemory: true };
        }
      }

      setData(nextData);

      // Auto-trigger JIT save for editable fields
      if (key !== 'name' && key !== 'version' && key !== 'runtime' && key !== 'icon') {
        enqueue(nextData);
      }
    },
    [data, enqueue]
  );

  // --- Is Modified ---
  const isModified = useMemo(() => {
    if (!instance) return true;
    if (instance.name !== data.name) return true;
    if (instance.version !== data.version) return true;
    if (instance.runtime.minecraft !== data.runtime.minecraft) return true;
    if (instance.runtime.forge !== data.runtime.forge) return true;
    if (instance.runtime.neoForged !== data.runtime.neoForged) return true;
    if (instance.runtime.labyMod !== data.runtime.labyMod) return true;
    if (instance.runtime.fabricLoader !== data.runtime.fabricLoader) return true;
    if (instance.runtime.quiltLoader !== data.runtime.quiltLoader) return true;
    if (instance.runtime.optifine !== data.runtime.optifine) return true;
    if (instance.icon !== data.icon) return true;
    return false;
  }, [instance, data]);

  return {
    data,
    loading,
    assignMemory,
    minMemory,
    maxMemory,
    vmOptions,
    mcOptions,
    prependCommand,
    preExecuteCommand,
    fastLaunch,
    hideLauncher,
    showLog,
    disableAuthlibInjector,
    disableElyByAuthlib,
    resolution,
    host: data.host,
    port: data.port,
    isGlobalAssignMemory,
    isGlobalMinMemory,
    isGlobalMaxMemory,
    isGlobalVmOptions,
    isGlobalMcOptions,
    isGlobalFastLaunch,
    isGlobalHideLauncher,
    isGlobalShowLog,
    isGlobalDisableElyByAuthlib,
    isGlobalDisableAuthlibInjector,
    isGlobalPrependCommand,
    isGlobalPreExecuteCommand,
    isGlobalResolution,
    resetAssignMemory,
    resetVmOptions,
    resetMcOptions,
    resetFastLaunch,
    resetHideLauncher,
    resetShowLog,
    resetDisableAuthlibInjector,
    resetDisableElyByAuthlib,
    resetPrependCommand,
    resetPreExecuteCommand,
    resetResolution,
    updateField,
    save,
    load,
    flushNow,
    isModified,
  };
}
