import { useState, useCallback, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useData } from '../../contexts/DataContext';
import { useUserDiagnose } from './useUserDiagnose';
import { useInstanceVersionInstall } from './useInstanceVersionInstall';
import { useInstanceVersionDiagnose } from './useInstanceVersionDiagnose';
import { useInstanceJava } from './useInstanceJava';
import { useInstanceJavaDiagnose } from './useInstanceJavaDiagnose';
import { useResolvedJavaForInstance } from './useResolvedJavaForInstance';
import { LaunchOptions } from '@xmcl/runtime-api';

export interface LaunchButtonState {
  text: string;
  color: 'primary' | 'secondary' | 'danger' | 'warning';
  disabled: boolean;
  onClick: () => Promise<void>;
  isLoading: boolean;
}

export function useLaunchButton(): LaunchButtonState {
  const {
    isLaunching,
    startLaunching,
    setIsLaunchModalOpen,
    executePreLaunchFlush, // Phase 2.1: NEW
  } = useApp();

  // FIX: useData returns the context directly, do not destructure { data }
  const data = useData();

  // Phase 2.1: Move diagnosis hooks FROM AppContext TO here
  // User diagnosis
  const { issue: userIssue, fix: fixUser } = useUserDiagnose();

  // Version diagnosis
  const selectedInstanceArray = useMemo(
    () => (data.selectedInstance ? [data.selectedInstance] : []),
    [data.selectedInstance]
  );
  const javaVersions = data.javaVersions ?? [];
  
  const {
    instruction,
    fix: fixVersion,
    loading: fixingVersion,
  } = useInstanceVersionInstall(
    data.selectedInstance?.path ?? '',
    selectedInstanceArray,
    javaVersions
  );

  const versionIssues = useInstanceVersionDiagnose(instruction);

  // Java diagnosis
  const { status: javaStatus } = useInstanceJava(data.selectedInstance, javaVersions);
  const { issue: javaIssue } = useInstanceJavaDiagnose(javaStatus);

  // Resolved Java (for LaunchOptions building)
  const { status: resolvedJava } = useResolvedJavaForInstance(
    data.selectedInstance,
    undefined,
    javaVersions
  );

  // Phase 2.1: Full click sequence ownership
  const onClick = useCallback(async () => {
    // Guard: already launching or fixing
    if (isLaunching || fixingVersion) return;

    try {
      // Step 1: Execute pre-launch flush (autosave, etc.)
      // Phase 2.1: NEW - was missing in original implementation
      await executePreLaunchFlush();

      // Step 2: User diagnosis
      if (userIssue) {
        await fixUser();
        return;
      }

      // Step 3: Version/asset diagnosis
      if (instruction) {
        await fixVersion();
        // After fix, launch with corrected version
        // Fall through to Step 5 (build options and launch)
      }

      // Step 4: Java diagnosis
      if (javaIssue) {
        // Show modal for user to select Java
        setIsLaunchModalOpen(true);
        return;
      }

      // Step 5: All checks passed - build LaunchOptions and launch
      // Phase 2.1: Build options HERE, not in AppContext
      if (!data.selectedInstance) {
        console.error('useLaunchButton: No instance selected');
        return;
      }

      if (!data.activeAccount) {
        console.error('useLaunchButton: No active account');
        return;
      }

      if (!resolvedJava?.finalJavaPath) {
        console.error('useLaunchButton: No Java path resolved');
        setIsLaunchModalOpen(true);
        return;
      }

      const versionToLaunch =
        data.selectedInstance.version ?? data.selectedInstance.runtime?.minecraft;

      if (!versionToLaunch) {
        console.error('useLaunchButton: No version to launch');
        return;
      }

      const options: LaunchOptions = {
        version: versionToLaunch,
        gameDirectory: data.selectedInstance.path,
        user: data.activeAccount,
        java: resolvedJava.finalJavaPath,
        maxMemory: data.selectedInstance.maxMemory,
        minMemory: data.selectedInstance.minMemory,
        vmOptions: data.selectedInstance.vmOptions,
        mcOptions: data.selectedInstance.mcOptions,
      };

      // Phase 2.1 / 5.1: Call AppContext with PRE-BUILT options
      await startLaunching(options);
    } catch (e) {
      console.error('useLaunchButton: Click sequence failed', e);
    }
  }, [
    isLaunching,
    fixingVersion,
    executePreLaunchFlush, // Phase 2.1: NEW dependency
    userIssue,
    fixUser,
    instruction,
    fixVersion,
    javaIssue,
    setIsLaunchModalOpen,
    data.selectedInstance,
    data.activeAccount,
    resolvedJava,
    startLaunching,
  ]);

  // Button facade (UI state)
  const disabled = useMemo(() => {
    return (
      !data.selectedInstance ||
      !data.activeAccount ||
      isLaunching ||
      fixingVersion
    );
  }, [data.selectedInstance, data.activeAccount, isLaunching, fixingVersion]);

  const text = useMemo(() => {
    if (isLaunching) return 'Launching...';
    if (fixingVersion) return 'Installing...';
    if (userIssue) return 'Login Required';
    if (instruction) return 'Install Required';
    if (javaIssue) return 'Java Issue';
    return 'Launch';
  }, [isLaunching, fixingVersion, userIssue, instruction, javaIssue]);

  const color = useMemo<'primary' | 'secondary' | 'danger' | 'warning'>(() => {
    if (javaIssue) return 'danger';
    if (instruction || userIssue) return 'warning';
    return 'primary';
  }, [javaIssue, instruction, userIssue]);

  return {
    text,
    color,
    disabled,
    onClick,
    isLoading: isLaunching || fixingVersion,
  };
}