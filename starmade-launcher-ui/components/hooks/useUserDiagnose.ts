import { useMemo } from 'react';
import { UserProfile } from '@xmcl/runtime-api';
import { useData } from '../../contexts/DataContext';

export interface UserIssue {
  type: 'missing' | 'expired';
  title: string;
  description: string;
}

export function useUserDiagnose() {
  const { activeAccount, loginMicrosoft } = useData();

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
    if (issue) {
      await loginMicrosoft();
    }
  };

  return { issue, fix };
}
