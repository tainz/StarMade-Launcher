import { useMemo } from 'react';
import { JavaRecord, JavaCompatibleState } from '@xmcl/runtime-api';
import { Instance } from '@xmcl/instance';
import { useResolvedJavaForInstance, ResolvedJavaForInstance } from './useResolvedJavaForInstance';

/**
 * Legacy-compatible interface for useInstanceJava.
 * Matches the existing React implementation's API surface.
 */
export interface InstanceJavaStatus {
  instance: string;
  javaPath: string | undefined;
  java?: JavaRecord;
  compatible: JavaCompatibleState;
  preferredJava?: JavaRecord;
}

/**
 * Hook to get Java compatibility status for an instance.
 * 
 * REFACTOR NOTE: Now delegates to useResolvedJavaForInstance to centralize
 * Java resolution logic across launch, install, and diagnosis.
 * 
 * @param instance - The instance to check
 * @param allJava - All detected Java installations
 * @returns Java status and refreshing state
 */
export function useInstanceJava(
  instance: Instance | null,
  allJava: JavaRecord[]
): {
  status: InstanceJavaStatus | undefined;
  refreshing: boolean;
} {
  // Delegate to centralized resolver
  const { status: resolved, refreshing } = useResolvedJavaForInstance(
    instance,
    undefined,  // No resolved version for basic compatibility check
    allJava
  );

  // Map to legacy InstanceJavaStatus interface
  const status = useMemo<InstanceJavaStatus | undefined>(() => {
    if (!resolved) return undefined;

    return {
      instance: resolved.instance,
      javaPath: resolved.javaPath,
      java: resolved.java,
      compatible: resolved.compatible,
      preferredJava: resolved.preferredJava,
    };
  }, [resolved]);

  // FIXED: Return actual refreshing state from resolver
  return { status, refreshing };
}
