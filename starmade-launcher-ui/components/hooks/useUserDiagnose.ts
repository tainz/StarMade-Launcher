import { useMemo } from 'react';
import { UserProfile } from '@xmcl/runtime-api';
import { useData } from '../../contexts/DataContext';

export interface UserIssue {
  type: 'missing' | 'expired';
  title: string;
  description: string;
}

/**
 * Hook to diagnose user account issues (missing or expired session).
 * 
 * REFACTORED: Now uses refreshUser from DataContext (which gets it from useLogin).
 * No longer directly imports useLogin to avoid duplicate subscriptions.
 */
export function useUserDiagnose() {
  const { activeAccount, refreshUser } = useData();
  
  const issue = useMemo<UserIssue | undefined>(() => {
    if (!activeAccount) {
      return {
        type: 'missing',
        title: 'No Account Selected',
        description: 'Please log in to a Minecraft account to play.',
      };
    }
    
    // Check if token is expired (buffer of 10 seconds)
    if (activeAccount.expiredAt && activeAccount.expiredAt < Date.now() + 10000) {
      return {
        type: 'expired',
        title: 'Session Expired',
        description: 'Your session has expired. Please log in again.',
      };
    }
    
    return undefined;
  }, [activeAccount]);
  
  const fix = async () => {
    if (!issue) return;
    
    if (issue.type === 'expired' && activeAccount) {
      await refreshUser();
    }
    // For 'missing' type, caller should handle login flow separately
  };
  
  return { issue, fix };
}
