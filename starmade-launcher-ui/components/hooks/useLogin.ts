import { useState, useCallback } from 'react';
import { 
  UserServiceKey, 
  UserProfile, 
  LoginOptions,
  AUTHORITY_MICROSOFT,
  AUTHORITY_MOJANG,
  AUTHORITY_OFFLINE,
  UserException,
  isException
} from '@xmcl/runtime-api';
import { useService } from './useService';

/**
 * Interface for useLogin parameters (dependency injection)
 */
export interface UseLoginParams {
  activeUser: UserProfile | null;
  selectUser: (user: UserProfile) => void;
}

/**
 * Interface for useLogin return type
 */
export interface UseLoginReturn {
  // High-level convenience methods
  loginMicrosoft: () => Promise<UserProfile>;
  loginMojang: (username: string, password: string) => Promise<UserProfile>;
  loginOffline: (username: string) => Promise<UserProfile>;
  
  // Low-level generic login
  loginCustom: (options: LoginOptions) => Promise<UserProfile>;
  
  // Session management
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // Authority history (Vue parity)
  lastAuthority: string;
  setLastAuthority: (authority: string) => void;
  
  // Loading states (action-specific, not initial state load)
  loading: boolean;
  error: string | null;
}

/**
 * Authentication actions hook (separated from state).
 * 
 * Uses dependency injection to avoid duplicate calls to useUserState.
 * Mirrors Vue's login.ts composable.
 * 
 * @param params - Dependencies from useUserState
 * @returns Authentication actions and loading states
 */
export function useLogin({ activeUser, selectUser }: UseLoginParams): UseLoginReturn {
  const userService = useService(UserServiceKey);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Authority history (localStorage backed)
  const [lastAuthority, setLastAuthorityState] = useState<string>(() => 
    localStorage.getItem('lastAuthority') || AUTHORITY_MICROSOFT
  );
  
  const setLastAuthority = useCallback((authority: string) => {
    setLastAuthorityState(authority);
    localStorage.setItem('lastAuthority', authority);
  }, []);
  
  // Low-level login (generic)
  const loginCustom = useCallback(async (options: LoginOptions): Promise<UserProfile> => {
    setError(null);
    setLoading(true);
    try {
      const newUser = await userService.login(options);
      selectUser(newUser);
      setLastAuthority(options.authority || AUTHORITY_MICROSOFT);
      return newUser;
    } catch (e: any) {
      console.error('[useLogin] Login failed:', e);
      if (isException(UserException, e)) {
        setError(e.exception.type);
      } else {
        setError('Login failed');
      }
      throw e;
    } finally {
      setLoading(false);
    }
  }, [userService, selectUser, setLastAuthority]);
  
  // High-level convenience methods
  const loginMicrosoft = useCallback(() => loginCustom({
    username: '',
    authority: AUTHORITY_MICROSOFT,
    properties: { mode: 'popup' },
  }), [loginCustom]);
  
  const loginMojang = useCallback((username: string, password: string) => loginCustom({
    username,
    password,
    authority: AUTHORITY_MOJANG,
  }), [loginCustom]);
  
  const loginOffline = useCallback((username: string) => loginCustom({
    username,
    authority: AUTHORITY_OFFLINE,
  }), [loginCustom]);
  
  const logout = useCallback(async () => {
    if (!activeUser) {
      console.warn('[useLogin] No active user to log out');
      return;
    }
    setLoading(true);
    try {
      await userService.removeUser(activeUser);
    } catch (e) {
      console.error('[useLogin] Logout failed:', e);
      setError('Logout failed');
    } finally {
      setLoading(false);
    }
  }, [userService, activeUser]);
  
  const refreshUser = useCallback(async () => {
    if (!activeUser) {
      throw new Error('No active user to refresh');
    }
    setLoading(true);
    try {
      await userService.refreshUser(activeUser.id);
    } catch (e) {
      console.error('[useLogin] Refresh failed:', e);
      setError('Session refresh failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [userService, activeUser]);
  
  return {
    loginMicrosoft,
    loginMojang,
    loginOffline,
    loginCustom,
    logout,
    refreshUser,
    lastAuthority,
    setLastAuthority,
    loading,
    error,
  };
}
