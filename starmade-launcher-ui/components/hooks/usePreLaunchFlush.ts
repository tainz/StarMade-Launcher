import { useRef, useCallback } from 'react';

export interface UsePreLaunchFlushReturn {
  register: (listener: () => void | Promise<void>) => void;
  unregister: (listener: () => void | Promise<void>) => void;
  executeAll: () => Promise<void>;
}

export function usePreLaunchFlush(): UsePreLaunchFlushReturn {
  const listenersRef = useRef<Set<() => void | Promise<void>>>(new Set());

  const register = useCallback((listener: () => void | Promise<void>) => {
    listenersRef.current.add(listener);
  }, []);

  const unregister = useCallback((listener: () => void | Promise<void>) => {
    listenersRef.current.delete(listener);
  }, []);

  const executeAll = useCallback(async () => {
    // FIX: Explicitly type the array so .map knows 'listener' is a function
    const listeners = Array.from(listenersRef.current) as Array<() => void | Promise<void>>;
    
    await Promise.all(listeners.map((listener) => listener()));
  }, []);

  return { register, unregister, executeAll };
}