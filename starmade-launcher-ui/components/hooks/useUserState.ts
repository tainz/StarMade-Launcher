import { useState, useEffect, useCallback } from 'react';
import {
  UserServiceKey,
  UserProfile,
  UserState,
} from '@xmcl/runtime-api';
import { useService, useServiceMutation } from './useService';

/**
 * Interface for useUserState return type (state only)
 */
export interface UseUserStateReturn {
  users: UserProfile[];
  activeUser: UserProfile | null;
  loading: boolean;  // Initial state fetch only
  error: string | null;  // Initial state fetch only
  selectUser: (user: UserProfile) => void;
}

/**
 * A comprehensive hook for managing the user state of the application.
 * 
 * It fetches the initial user data, subscribes to real-time updates from the backend,
 * and provides selectUser for switching accounts (state operation, not auth).
 * 
 * REFACTORED: Authentication actions (login/logout/refresh) moved to useLogin hook.
 * This hook now focuses purely on state management.
 * 
 * @returns User state and selection action
 */
export function useUserState(): UseUserStateReturn {
  const userService = useService(UserServiceKey);

  // Raw reactive state object from the backend
  const [userState, setUserState] = useState<UserState | undefined>(undefined);

  // Derived state for UI consumption
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect to fetch the initial state once
  useEffect(() => {
    setLoading(true);
    userService.getUserState()
      .then((initialState) => {
        setUserState(initialState);
        const userProfiles = Object.values(initialState.users);
        setUsers(userProfiles);
        setActiveUser(initialState.users[initialState.selectedUser] || userProfiles[0] || null);
      })
      .catch((e) => {
        console.error('Failed to get initial user state', e);
        setError('Could not load user accounts.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userService]);

  // MUTATION SUBSCRIPTIONS
  // These hooks listen for changes pushed from the backend and keep React state in sync
  
  useServiceMutation<UserProfile>(userState, 'userProfile', (profile) => {
    setUsers((currentUsers) => {
      const index = currentUsers.findIndex((u) => u.id === profile.id);
      if (index !== -1) {
        const newUsers = [...currentUsers];
        newUsers[index] = profile;
        return newUsers;
      }
      return [...currentUsers, profile];
    });
  });

  useServiceMutation<string>(userState, 'userProfileRemove', (userId) => {
    setUsers((currentUsers) => currentUsers.filter((u) => u.id !== userId));
    setActiveUser((currentUser) => {
      if (currentUser?.id === userId) return null;
      return currentUser;
    });
  });

  useServiceMutation<string>(userState, 'userProfileSelect', (userId) => {
    setUsers((currentUsers) => {
      setActiveUser(currentUsers.find((u) => u.id === userId) || null);
      return currentUsers;
    });
  });

  // ACTIONS: State-only operations (no authentication side effects)
  
  /**
   * Selects a different user account (switches active user).
   * This is a STATE operation on the userState object, not an authentication action.
   */
  const selectUser = useCallback((user: UserProfile) => {
    if (!userState) {
      console.error('Cannot select user, userState is not ready');
      return;
    }
    
    // Optimistically update the UI
    setActiveUser(user);
    
    // The method to change the selected user is on the STATE object, not the service
    (userState as any).select(user.id).catch((e: any) => {
      console.error('Failed to select user', user.id, e);
      // Revert optimistic update on failure if necessary
    });
  }, [userState]);

  return {
    users,
    activeUser,
    loading,
    error,
    selectUser,
  };
}
