import { useState, useEffect, useMemo } from 'react';
import {
  JavaRecord,
  JavaServiceKey,
  JavaCompatibleState,
  getAutoSelectedJava,
  getAutoOrManuallJava,
  ResolvedVersion,
} from '@xmcl/runtime-api';
import { Instance } from '@xmcl/instance';
import { useService } from './useService';

/**
 * Represents the resolved Java status for a specific instance.
 * Extended to match Vue's InstanceJavaStatus more closely.
 */
export interface ResolvedJavaForInstance {
  instance: string;
  javaPath: string | undefined;
  java: JavaRecord | undefined;
  compatible: JavaCompatibleState;
  preferredJava: JavaRecord | undefined;
  /** The final Java path to use for launch/install */
  finalJavaPath: string | undefined;
  /** Java version requirement from resolved version (for better diagnosis) */
  requirement?: { majorVersion: number };
}

/**
 * Centralized Java resolution hook mirroring Vue's instanceJava.ts.
 * 
 * This hook consolidates Java selection for launch, install, and diagnosis.
 * 
 * @param instance - The instance to resolve Java for
 * @param resolvedVersion - Optional resolved version (for version-specific requirements)
 * @param allJava - All detected Java installations
 * @returns Resolved Java status with finalJavaPath, or undefined if resolution fails
 */
export function useResolvedJavaForInstance(
  instance: Instance | null,
  resolvedVersion: ResolvedVersion | undefined,
  allJava: JavaRecord[]
): { status: ResolvedJavaForInstance | undefined; refreshing: boolean } {
  const { resolveJava } = useService(JavaServiceKey);
  const [status, setStatus] = useState<ResolvedJavaForInstance | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  // Stable key for allJava to detect actual content changes
  const javaKey = useMemo(
    () => allJava.map((j) => `${j.path}:${j.version}:${j.valid}`).join('|'),
    [allJava]
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
          resolvedVersion
        );

        // Step 2: Resolve manual vs automatic (mirrors Vue's getAutoOrManuallJava)
        const result = await getAutoOrManuallJava(
          detected,
          resolveJava,
          instance.java
        );

        if (cancelled) return;

        // Step 3: Build final status object
        const finalStatus: ResolvedJavaForInstance = {
          instance: instance.path,
          javaPath: instance.java,
          java: result.java ?? result.auto.java,
          compatible: result.quality,
          preferredJava: result.auto.java,
          finalJavaPath: (result.java ?? result.auto.java)?.path,
          requirement: resolvedVersion?.javaVersion,
        };

        setStatus(finalStatus);
      } catch (error) {
        console.error('[useResolvedJavaForInstance] Error resolving Java:', error);
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
    // FIXED: Removed resolveJava from dependencies to prevent infinite loop
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

/**
 * Pure helper function for install profile Java selection.
 * Mirrors Vue's getJavaPathOrInstall from instanceVersionInstall.ts.
 * 
 * @param instance - The instance requiring Java
 * @param javas - All detected Java installations
 * @param resolved - The resolved version object (contains javaVersion requirement)
 * @returns Java path string, or JavaVersion object (to signal install needed)
 */
export function getJavaPathForInstallProfile(
  instance: Instance | undefined,
  javas: JavaRecord[],
  resolved: ResolvedVersion
): string | { majorVersion: number } {
  // Priority 1: Use instance's configured Java
  if (instance?.java) {
    return instance.java;
  }

  // Priority 2: Find valid Java matching required major version
  const validJava = javas.find(
    (v) => v.majorVersion === resolved.javaVersion.majorVersion && v.valid
  );

  // Priority 3: Return JavaVersion object (signals auto-install needed)
  return validJava ? validJava.path : resolved.javaVersion;
}

