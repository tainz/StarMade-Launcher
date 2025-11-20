import { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useData } from '../../contexts/DataContext';
import { useInstanceJavaDiagnose } from './useInstanceJavaDiagnose';
import { useUserDiagnose } from './useUserDiagnose';
import { useInstanceJava } from './useInstanceJava';

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
 * Determines the state, appearance, and action of the main launch button.
 * Mirrors logic from xmcl-keystone-ui/src/composables/launchButton.ts
 */
export function useLaunchButton(): LaunchButtonState {
  const { 
    isLaunching, 
    startLaunching, 
    progress, 
    needsInstall, // Exposed from AppContext
    openLaunchModal 
  } = useApp();
  
  const { selectedInstance, javaVersions } = useData();
  
  // 1. Java Diagnosis
  const { status: javaStatus } = useInstanceJava(selectedInstance, javaVersions);
  const { issue: javaIssue } = useInstanceJavaDiagnose(javaStatus);

  // 2. User Diagnosis
  const { issue: userIssue, fix: fixUser } = useUserDiagnose();

  return useMemo(() => {
    // Priority 1: Launching State (Highest Priority)
    if (isLaunching) {
      return {
        text: `Launching... ${Math.round(progress)}%`,
        color: 'green',
        disabled: true,
        loading: true,
        progress: progress,
        onClick: () => {}, // No-op while launching
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
        onClick: fixUser, // Triggers login flow
      };
    }

    // Priority 3: Java Issues
    if (javaIssue) {
      return {
        text: 'Fix Java',
        color: 'orange',
        icon: 'wrench',
        disabled: false,
        loading: false,
        onClick: openLaunchModal, // Open modal to show specific Java error
      };
    }

    // Priority 4: Missing Assets/Version (Needs Install)
    if (needsInstall) {
      return {
        text: 'Install & Play',
        color: 'blue',
        icon: 'download',
        disabled: false,
        loading: false,
        onClick: startLaunching, // startLaunching handles installation internally
      };
    }

    // Priority 5: Ready to Launch (Default)
    return {
      text: 'Launch',
      color: 'green',
      icon: 'play',
      disabled: !selectedInstance, // Disable if no instance selected
      loading: false,
      onClick: startLaunching,
    };
  }, [
    isLaunching, 
    progress, 
    userIssue, 
    javaIssue, 
    needsInstall, 
    selectedInstance, 
    startLaunching, 
    fixUser, 
    openLaunchModal
  ]);
}
