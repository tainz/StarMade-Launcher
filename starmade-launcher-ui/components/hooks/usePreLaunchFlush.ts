import { useRef, useCallback } from 'react';

export interface UsePreLaunchFlushReturn {
  register: (listener: () => void | Promise<void>) => void;
  unregister: (listener: () => void | Promise<void>) => void;
  executeAll: () => Promise<void>;
}

// Phase 2.1: Pre-launch listener registry
// Mirrors Vue's launchButton.ts pre-click listener pattern
export function usePreLaunchFlush(): UsePreLaunchFlushReturn {
  const listenersRef = useRef<Set<() => void | Promise<void>>>(new Set());

  const register = useCallback((listener: () => void | Promise<void>) => {
    listenersRef.current.add(listener);
  }, []);

  const unregister = useCallback((listener: () => void | Promise<void>) => {
    listenersRef.current.delete(listener);
  }, []);

  const executeAll = useCallback(async () => {
    const listeners = Array.from(listenersRef.current) as Array<
      () => void | Promise<void>
    >;
    await Promise.all(listeners.map((listener) => listener()));
  }, []);

  return {
    register,
    unregister,
    executeAll,
  };
}