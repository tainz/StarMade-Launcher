import { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useData } from '../../contexts/DataContext';
import { useInstanceJavaDiagnose } from './useInstanceJavaDiagnose';
import { useUserDiagnose } from './useUserDiagnose';
import { useInstanceJava } from './useInstanceJava';
import { useInstanceVersionInstall } from './useInstanceVersionInstall';

export interface LaunchButtonState {
  text: string;
  color: 'green' | 'blue' | 'orange' | 'red' | 'gray';
  icon?: string;
  disabled: boolean;
  loading: boolean;
  progress?: number;
  onClick: () => void;
}

export function useLaunchButton(): LaunchButtonState {
  const { 
    isLaunching, 
    startLaunching, 
    progress, 
    openLaunchModal 
  } = useApp();
  
  const { selectedInstance, javaVersions } = useData();
  
  // 1. Java Diagnosis
  const { status: javaStatus } = useInstanceJava(selectedInstance, javaVersions);
  const { issue: javaIssue } = useInstanceJavaDiagnose(javaStatus);

  // 2. User Diagnosis
  const { issue: userIssue, fix: fixUser } = useUserDiagnose();

  // 3. Version/Asset Diagnosis (The missing link)
  const { instruction, fix: fixVersion, loading: fixingVersion } = useInstanceVersionInstall(
    selectedInstance?.path || '',
    selectedInstance ? [selectedInstance] : [],
    javaVersions
  );

  return useMemo(() => {
    // Priority 1: Launching/Installing State
    if (isLaunching || fixingVersion) {
      return {
        text: fixingVersion ? 'Installing...' : `Launching... ${Math.round(progress)}%`,
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
        onClick: fixUser,
      };
    }

    // Priority 3: Missing Assets/Version (Needs Install)
    if (instruction) {
      return {
        text: 'Install & Play',
        color: 'blue',
        icon: 'download',
        disabled: false,
        loading: false,
        onClick: async () => {
            await fixVersion();
            startLaunching();
        },
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
        onClick: openLaunchModal,
      };
    }

    // Priority 5: Ready to Launch
    return {
      text: 'Launch',
      color: 'green',
      icon: 'play',
      disabled: !selectedInstance,
      loading: false,
      onClick: startLaunching,
    };
  }, [
    isLaunching, 
    progress, 
    userIssue, 
    javaIssue, 
    instruction, 
    fixingVersion,
    selectedInstance, 
    startLaunching, 
    fixUser, 
    openLaunchModal,
    fixVersion
  ]);
}
