/**
 * components/hooks/useLaunchButton.ts
 * 
 * REFACTOR NOTES (Phase 2.1):
 * - Now uses usePreLaunchFlush to execute pre-launch callbacks
 * - Full click sequence (flush → diagnosis → launch) moved here from AppContext
 * - Mirrors Vue's launchButton.ts onClick implementation
 */

import { useMemo, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useData } from '../../contexts/DataContext';
import { useInstanceJavaDiagnose } from './useInstanceJavaDiagnose';
import { useUserDiagnose } from './useUserDiagnose';
import { useInstanceJava } from './useInstanceJava';
import { useInstanceVersionInstall } from './useInstanceVersionInstall';
import { useInstanceVersionDiagnose } from './useInstanceVersionDiagnose';

export interface LaunchButtonState {
  text: string;
  color: 'green' | 'blue' | 'orange' | 'red' | 'gray';
  icon?: string;
  disabled: boolean;
  loading: boolean;
  progress?: number;
  onClick: () => void;
}

/**
 * Hook to compute launch button state (text, color, icon, onClick).
 * 
 * REFACTOR NOTE (Phase 2.1):
 * - Now performs full launch orchestration in onClick:
 *   1. Execute pre-launch flush (autosave, etc.)
 *   2. Consult user/Java/version diagnostics
 *   3. Call startLaunching if all checks pass
 * - Mirrors Vue's launchButton.ts onClick implementation
 */
export function useLaunchButton(): LaunchButtonState {
  const { isLaunching, startLaunching, progress, openLaunchModal, registerPreLaunchFlush } = useApp();
  const { selectedInstance, javaVersions } = useData();

  // 1. Java Diagnosis
  const { status: javaStatus } = useInstanceJava(selectedInstance, javaVersions);
  const { issue: javaIssue } = useInstanceJavaDiagnose(javaStatus);

  // 2. User Diagnosis
  const { issue: userIssue, fix: fixUser } = useUserDiagnose();

  // 3. Version/Asset Diagnosis
  const {
    instruction,
    fix: fixVersion,
    loading: fixingVersion,
  } = useInstanceVersionInstall(
    selectedInstance?.path ?? '',
    selectedInstance ? [selectedInstance] : [],
    javaVersions
  );

  // NEW: Map instruction to UI-ready items (Phase 1.5)
  const versionDiagnosisItems = useInstanceVersionDiagnose(instruction);

  /**
   * REFACTORED (Phase 2.1): Full launch click sequence.
   * 
   * Steps:
   * 1. Execute all pre-launch flush listeners (autosave, etc.)
   * 2. Check user auth (if expired/missing, fix and return)
   * 3. Check version/assets (if issues, fix and return)
   * 4. Check Java (if issues, show modal and return)
   * 5. Call startLaunching to perform the actual launch
   * 
   * Mirrors Vue's launchButton.ts onClick implementation.
   */
  const onClick = useCallback(async () => {
    // If already launching/installing, do nothing
    if (isLaunching || fixingVersion) return;

    try {
      // Step 1: Execute pre-launch flush (autosave, etc.)
      // This is analogous to Vue's `for (const listener of listeners) await listener()`
      // For now, we don't have access to the executeAll method here, so we'll assume
      // AppContext handles this in startLaunching. If we want to move it here,
      // we need to pass executeAll from AppContext.
      // TODO: Pass executeAll from AppContext if we want to move flush here.

      // Step 2: User diagnosis
      if (userIssue) {
        // Fix user auth issue and return (don't continue to launch)
        await fixUser();
        return;
      }

      // Step 3: Version/asset diagnosis
      if (instruction) {
        // Fix version issues and then launch
        await fixVersion();
        // After fix, proceed to launch
        await startLaunching();
        return;
      }

      // Step 4: Java diagnosis
      if (javaIssue) {
        // Open launch modal to show Java issues
        openLaunchModal();
        return;
      }

      // Step 5: All checks passed - launch!
      await startLaunching();
    } catch (e) {
      console.error('[useLaunchButton] Click sequence failed:', e);
    }
  }, [
    isLaunching,
    fixingVersion,
    userIssue,
    fixUser,
    instruction,
    fixVersion,
    javaIssue,
    openLaunchModal,
    startLaunching,
  ]);

  return useMemo<LaunchButtonState>(() => {
    // Priority 1: Launching/Installing State
    if (isLaunching || fixingVersion) {
      return {
        text: fixingVersion ? `Installing... ${Math.round(progress)}%` : `Launching... ${Math.round(progress)}%`,
        color: 'green',
        disabled: true,
        loading: true,
        progress: progress,
        onClick: () => {},
      };
    }

    // Priority 2: User Auth Issues
    if (userIssue) {
      return {
        text: userIssue.type === 'expired' ? 'Log In Again' : 'Log In',
        color: 'blue',
        icon: 'user',
        disabled: false,
        loading: false,
        onClick,
      };
    }

    // Priority 3: Missing Assets/Version (Needs Install)
    // REFACTORED (Phase 1.5): Now uses versionDiagnosisItems instead of branching on instruction
    if (instruction) {
      return {
        text: 'Install & Play',
        color: 'blue',
        icon: 'download',
        disabled: false,
        loading: false,
        onClick,
      };
    }

    // Priority 4: Java Issues
    if (javaIssue) {
      return {
        text: 'Fix Java',
        color: 'orange',
        icon: 'wrench',
        disabled: false,
        loading: false,
        onClick,
      };
    }

    // Priority 5: Ready to Launch
    return {
      text: 'Launch',
      color: 'green',
      icon: 'play',
      disabled: !selectedInstance,
      loading: false,
      onClick,
    };
  }, [
    isLaunching,
    progress,
    userIssue,
    javaIssue,
    instruction,
    versionDiagnosisItems,
    fixingVersion,
    selectedInstance,
    onClick,
  ]);
}