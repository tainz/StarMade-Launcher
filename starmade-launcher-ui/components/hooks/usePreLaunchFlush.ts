/**
 * components/hooks/usePreLaunchFlush.ts
 * 
 * Hook to manage pre-launch flush listeners.
 * Mirrors Vue's launchButton.ts pre-click listener pattern.
 * 
 * Responsibilities:
 * - Owns a Set of flush callbacks (e.g., autosave from useInstanceEdit)
 * - Provides register/unregister methods for hooks to subscribe
 * - Provides executeAll to run all listeners before launch
 */

import { useRef, useCallback } from 'react';

export interface UsePreLaunchFlushReturn {
  register: (listener: () => void | Promise<void>) => void;
  unregister: (listener: () => void | Promise<void>) => void;
  executeAll: () => Promise<void>;
}

/**
 * Hook to manage pre-launch flush listeners.
 * 
 * Hooks like useInstanceEdit can register callbacks (e.g., autosave) that must
 * execute before launching the game. This ensures all pending changes are persisted.
 * 
 * @returns Registration methods and executeAll to run all listeners
 */
export function usePreLaunchFlush(): UsePreLaunchFlushReturn {
  const listenersRef = useRef<Set<() => void | Promise<void>>>(new Set());

  const register = useCallback((listener: () => void | Promise<void>) => {
    listenersRef.current.add(listener);
  }, []);

  const unregister = useCallback((listener: () => void | Promise<void>) => {
    listenersRef.current.delete(listener);
  }, []);

  const executeAll = useCallback(async () => {
    const listeners = Array.from(listenersRef.current);
    await Promise.all(listeners.map((listener) => listener()));
  }, []);

  return { register, unregister, executeAll };
}