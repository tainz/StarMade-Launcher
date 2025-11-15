// starmade-launcher-ui/components/hooks/useService.ts
import { useMemo, useEffect, useRef } from 'react';
import { ServiceKey, SharedState } from '@xmcl/runtime-api';

// This is a global from the preload script, so we need to declare it for TypeScript
declare global {
  interface Window {
    serviceChannels: {
      open<T>(key: ServiceKey<T>): {
        call<M extends keyof T>(method: M, ...payload: T[M] extends (...args: any) => any ? Parameters<T[M]> : never): Promise<T[M] extends (...args: any) => any ? ReturnType<T[M]> : never>;
        on<E extends keyof T>(event: E, listener: T[E] extends (...args: any) => any ? Parameters<T[E]>[0] : never): void;
        once<E extends keyof T>(event: E, listener: T[E] extends (...args: any) => any ? Parameters<T[E]>[0] : never): void;
        removeListener<E extends keyof T>(event: E, listener: T[E] extends (...args: any) => any ? Parameters<T[E]>[0] : never): void;
      };
    };
  }
}

const serviceProxyCache = new Map<ServiceKey<any>, any>();

/**
 * A hook to get a proxy for a backend service.
 * This proxy is a singleton and will be created only once for the entire application.
 * @param serviceKey The key of the service to get.
 * @returns A proxy for the service.
 */
export function useService<T>(serviceKey: ServiceKey<T>): T {
  const serviceProxy = useMemo(() => {
    if (serviceProxyCache.has(serviceKey)) {
      return serviceProxyCache.get(serviceKey) as T;
    }

    if (typeof window === 'undefined' || !window.serviceChannels) {
      console.error(`[useService] window.serviceChannels is not available! This is a bug in the preload script setup. ServiceKey: ${String(serviceKey)}`);
      // Return a dummy proxy to prevent the app from crashing
      return new Proxy({} as T, {
        get(target, prop) {
          if (prop === 'on' || prop === 'once' || prop === 'removeListener') return () => {};
          return () => Promise.reject(new Error(`Service not available for key: ${String(serviceKey)}`));
        }
      });
    }

    const channel = window.serviceChannels.open(serviceKey);
    const proxy = new Proxy({} as T, {
      get(target, prop) {
        if (prop === 'on' || prop === 'once' || prop === 'removeListener') {
          return (channel as any)[prop];
        }
        // All other property access is assumed to be a method call
        return (...args: any[]) => (channel as any).call(prop, ...args);
      }
    });

    serviceProxyCache.set(serviceKey, proxy);
    return proxy;
  }, [serviceKey]);

  return serviceProxy;
}

/**
 * A React hook to subscribe to a specific mutation on a shared state object from the backend.
 * 
 * @param state The shared state object returned from a service call.
 * @param mutationName The name of the mutation to listen for.
 * @param callback The function to execute when the mutation occurs.
 */
export function useServiceMutation<T>(
  state: SharedState<any> | undefined,
  mutationName: string,
  callback: (payload: T) => void
) {
  const callbackRef = useRef(callback);

  // Keep the callback ref up to date without re-triggering the effect
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!state || typeof (state as any).subscribe !== 'function') {
      return;
    }

    const handler = (payload: T) => {
      callbackRef.current(payload);
    };

    (state as any).subscribe(mutationName, handler);

    return () => {
      if (state && typeof (state as any).unsubscribe === 'function') {
        (state as any).unsubscribe(mutationName, handler);
      }
    };
  }, [state, mutationName]);
}
