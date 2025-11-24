/**
 * useResolvedJavaForInstance.ts
 * 
 * Centralized hook for resolving runtime Java for an instance.
 * Mirrors Vue's `instanceJava.ts` composable.
 * 
 * Focuses solely on per-instance runtime Java resolution (InstanceJavaStatus / ResolvedJavaForInstance),
 * equivalent to Vue's instanceJava.ts.
 * 
 * REFACTOR NOTE (Phase 1.1):
 * - Removed `getJavaPathForInstallProfile` (moved to `useInstanceVersionInstall.ts`).
 * - Now uses shared helpers from `javaResolutionUtils.ts`.
 * 
 * BUG FIX:
 * - Fixed `finalJavaPath` construction to extract `.path` from `result.java` object.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  JavaRecord,
  JavaServiceKey,
  JavaCompatibleState,
  ResolvedVersion,
} from '@xmcl/runtime-api';
import { Instance } from '@xmcl/instance';
import { useService } from './useService';
import { getAutoSelectedJava, getAutoOrManuallJava } from './javaResolutionUtils';

export interface ResolvedJavaForInstance {
  instance: string;
  javaPath?: string;
  java?: JavaRecord;
  compatible: JavaCompatibleState;
  preferredJava?: JavaRecord;
  finalJavaPath?: string;
  requirement?: ResolvedVersion['javaVersion'];
}

/**
 * Hook to resolve runtime Java for an instance.
 * 
 * @param instance - The instance to resolve Java for
 * @param resolvedVersion - Optional resolved version (for major version requirement)
 * @param allJava - All detected Java installations
 * @returns Java resolution status and refreshing state
 */
export function useResolvedJavaForInstance(
  instance: Instance | null,
  resolvedVersion: ResolvedVersion | undefined,
  allJava: JavaRecord[],
): {
  status: ResolvedJavaForInstance | undefined;
  refreshing: boolean;
} {
  const { resolveJava } = useService(JavaServiceKey);
  const [status, setStatus] = useState<ResolvedJavaForInstance | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  // Generate stable key for effect dependency
  const javaKey = useMemo(
    () => JSON.stringify(allJava.map((j) => j.path)),
    [allJava],
  );

  useEffect(() => {
    if (!instance) {
      setStatus(undefined);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      if (cancelled) return;
      setRefreshing(true);

      try {
        // Step 1: Auto-detect best Java (mirrors Vue's getComputedJava)
        const detected = getAutoSelectedJava(
          allJava,
          instance.runtime.minecraft,
          instance.runtime.forge,
          resolvedVersion,
        );

        // Step 2: Resolve manual vs automatic (mirrors Vue's getAutoOrManuallJava)
        const result = await getAutoOrManuallJava(
          detected,
          resolveJava,
          instance.java,
        );

        if (cancelled) return;

        // Step 3: Build final status object
        // FIXED: Extract .path from result.java object (it's a JavaRecord, not a string)
        const finalStatus: ResolvedJavaForInstance = {
          instance: instance.path,
          javaPath: instance.java,
          java: result.java ?? result.auto.java,
          compatible: result.quality,
          preferredJava: result.auto.java,
          finalJavaPath: result.java?.path ?? result.auto.java?.path, // FIXED: Added ?.path
          requirement: resolvedVersion?.javaVersion,
        };

        setStatus(finalStatus);
      } catch (error) {
        console.error('useResolvedJavaForInstance: Error resolving Java', error);
        if (!cancelled) {
          setStatus(undefined);
        }
      } finally {
        if (!cancelled) {
          setRefreshing(false);
        }
      }
    };

    resolve();

    return () => {
      cancelled = true;
    };
    // FIXED: Removed `resolveJava` from dependencies to prevent infinite loop
    // Service functions are not stable references and shouldn't be in dependency arrays
  }, [
    instance?.path,
    instance?.version,
    instance?.java,
    instance?.runtime.minecraft,
    instance?.runtime.forge,
    resolvedVersion?.id,
    javaKey,
    // resolveJava removed - it's a service function, not a reactive value
  ]);

  return { status, refreshing };
}

