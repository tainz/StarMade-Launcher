import { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';

export interface UserIssue {
  type: 'missing' | 'expired';
  title: string;
  description: string;
}

/**
 * Hook to diagnose user account issues (missing or expired session).
 * 
 * REFACTORED: Now uses refreshUser + loginMicrosoft from DataContext.
 * Handles both missing accounts and expired sessions correctly.
 */
export function useUserDiagnose() {
  const { activeAccount, loginMicrosoft, refreshUser } = useData();
  
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
  
  /**
   * Fixes the detected user issue:
   * - missing: triggers login flow
   * - expired: attempts refresh, falls back to login if refresh fails
   */
  const fix = async () => {
    if (!issue) return;
    
    if (issue.type === 'missing') {
      // No account at all - trigger login
      await loginMicrosoft();
      return;
    }
    
    if (issue.type === 'expired' && activeAccount) {
      // Account exists but token expired - try refresh first
      try {
        await refreshUser();
      } catch (e) {
        console.error('[useUserDiagnose] Refresh failed, falling back to login:', e);
        // Refresh failed - fall back to full re-login
        await loginMicrosoft();
      }
    }
  };
  
  return { issue, fix };
}
