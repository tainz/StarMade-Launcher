import { useCallback, useMemo } from 'react';
import { LaunchOptions } from '@xmcl/runtime-api';
import { useUserDiagnose } from './useUserDiagnose';
import { useInstanceVersionInstall } from './useInstanceVersionInstall';
import { useInstanceVersionDiagnose } from './useInstanceVersionDiagnose';
import { useInstanceJava } from './useInstanceJava';
import { useInstanceJavaDiagnose } from './useInstanceJavaDiagnose';
import { useResolvedJavaForInstance } from './useResolvedJavaForInstance';
import { useInstanceFilesDiagnose } from './useInstanceFilesDiagnose';

/**
 * Phase 2.1: Launch button orchestration hook.
 * Mirrors Vue's launchButton.ts composable with full click sequence:
 * 1. Execute pre-launch flush (autosave, etc.)
 * 2. Check user diagnosis
 * 3. Check version diagnosis
 * 4. Check file diagnosis (NEW - matches Vue line 172)
 * 5. Check Java diagnosis
 * 6. Build LaunchOptions and call startLaunching
 * 
 * This hook owns ALL launch orchestration logic. AppContext.startLaunching
 * only receives pre-built LaunchOptions and calls launch.
 */
export function useLaunchButton(
  data: any,
  executePreLaunchFlush: () => Promise<void>,
  startLaunching: (options: LaunchOptions) => Promise<void>,
  setIsLaunchModalOpen: (open: boolean) => void,
  isLaunching: boolean,
  globalSettings: any,
  javaVersions: any[]
) {
  // Step 2: User diagnosis
  const { issue: userIssue, fixUser } = useUserDiagnose(
    data.user,
    data.selectedInstance
  );

  // Step 3: Version diagnosis
  const { instruction, install: fixVersion, loading: fixingVersion } = useInstanceVersionInstall(
    data.selectedInstance?.path ?? '',
    data.instances,
    javaVersions
  );
  const versionIssues = useInstanceVersionDiagnose(instruction);

  // Step 4: File diagnosis (NEW - Phase 2.1 critical finding)
  const { issue: fileIssue, fixFiles } = useInstanceFilesDiagnose(
    data.selectedInstance?.path
  );

  // Step 5: Java diagnosis
  const { status: javaStatus } = useInstanceJava(
    data.selectedInstance,
    javaVersions
  );
  const { issue: javaIssue } = useInstanceJavaDiagnose(javaStatus);

  // Get resolved Java for launch options
  const { resolved: resolvedJava } = useResolvedJavaForInstance(
    data.selectedInstance,
    undefined,
    javaVersions
  );

  /**
   * Full launch click sequence.
   * Mirrors Vue's launchButton.ts onClick (lines 147-179).
   */
  const onClick = useCallback(async () => {
    if (isLaunching || fixingVersion) {
      return;
    }

    try {
      // Step 1: Pre-launch flush (autosave, etc.)
      await executePreLaunchFlush();

      // Step 2: User diagnosis
      if (userIssue) {
        await fixUser();
        return;
      }

      // Step 3: Version diagnosis
      if (instruction) {
        await fixVersion();
        return;
      }

      // Step 4: File diagnosis (NEW - matches Vue line 172)
      if (fileIssue) {
        await fixFiles();
        return;
      }

      // Step 5: Java diagnosis
      if (javaIssue) {
        setIsLaunchModalOpen(true);
        return;
      }

      // Step 6: Build LaunchOptions and launch
      if (!data.selectedInstance) {
        console.error('useLaunchButton: No instance selected');
        return;
      }

      const instance = data.selectedInstance;

      // Build launch options from instance data
      const options: LaunchOptions = {
        instancePath: instance.path,
        version: instance.version || instance.runtime.minecraft,
        gameProfile: data.user?.selectedProfile ?? {
          id: '',
          name: 'Player',
        },
        java: resolvedJava?.javaPath ?? instance.java ?? '',
        minMemory: instance.minMemory ?? globalSettings?.globalMinMemory,
        maxMemory: instance.maxMemory ?? globalSettings?.globalMaxMemory,
        vmOptions: instance.vmOptions ?? globalSettings?.globalVmOptions ?? [],
        mcOptions: instance.mcOptions ?? globalSettings?.globalMcOptions ?? [],
        hideLauncher: instance.hideLauncher ?? globalSettings?.globalHideLauncher ?? false,
        showLog: instance.showLog ?? globalSettings?.globalShowLog ?? false,
        server: instance.server ?? undefined,
        fastLaunch: instance.fastLaunch ?? globalSettings?.globalFastLaunch ?? false,
        disableAuthlibInjector:
          instance.disableAuthlibInjector ??
          globalSettings?.globalDisableAuthlibInjector ??
          false,
        disableElybyAuthlib:
          instance.disableElyByAuthlib ??
          globalSettings?.globalDisableElyByAuthlib ??
          false,
      };

      // Delegate to AppContext.startLaunching
      await startLaunching(options);
    } catch (e) {
      console.error('useLaunchButton: Click sequence failed', e);
    }
  }, [
    isLaunching,
    fixingVersion,
    executePreLaunchFlush,
    userIssue,
    fixUser,
    instruction,
    fixVersion,
    fileIssue,
    fixFiles,
    javaIssue,
    setIsLaunchModalOpen,
    data.selectedInstance,
    data.user,
    resolvedJava,
    globalSettings,
    startLaunching,
  ]);

  // Button display state
  const text = useMemo(() => {
    if (isLaunching) return 'Launching...';
    if (fixingVersion) return 'Installing...';
    if (userIssue) return 'Login Required';
    if (versionIssues.length > 0) return 'Install Required';
    if (fileIssue) return 'Repair Required';
    if (javaIssue) return 'Java Issue';
    return 'Launch';
  }, [isLaunching, fixingVersion, userIssue, versionIssues, fileIssue, javaIssue]);

  const disabled = useMemo(() => {
    return isLaunching || fixingVersion || !data.selectedInstance;
  }, [isLaunching, fixingVersion, data.selectedInstance]);

  return {
    onClick,
    text,
    disabled,
    isLaunching,
    // Expose diagnosis state for UI rendering (not for orchestration)
    hasUserIssue: !!userIssue,
    hasVersionIssue: !!instruction,
    hasFileIssue: !!fileIssue,
    hasJavaIssue: !!javaIssue,
    versionIssues,
  };
}