import { useState, useEffect } from 'react';
import {
  JavaRecord,
  JavaServiceKey,
  JavaCompatibleState,
  getAutoSelectedJava,
  getAutoOrManuallJava,
} from '@xmcl/runtime-api';
import { Instance } from '@xmcl/instance';
import { useService } from './useService';

export interface InstanceJavaStatus {
  instance: string;
  javaPath: string | undefined;
  java?: JavaRecord;
  compatible: JavaCompatibleState;
  preferredJava?: JavaRecord;
}

export function useInstanceJava(
  instance: Instance | null,
  allJava: JavaRecord[],
) {
  const javaService = useService(JavaServiceKey);
  const [status, setStatus] = useState<InstanceJavaStatus | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Early return if no instance
    if (!instance) {
      setStatus(undefined);
      return;
    }

    // If resolveJava is not available (e.g., in a pure browser context), skip compatibility checks
    const resolveJavaFn = (javaService as any)?.resolveJava as
      | ((path: string) => Promise<JavaRecord | undefined>)
      | undefined;

    if (!resolveJavaFn) {
      console.warn(
        'JavaService.resolveJava is not available; skipping Java compatibility check.',
      );
      setStatus(undefined);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;
      setRefreshing(true);

      try {
        // Auto-detect Java based on instance runtime (minecraft/forge)
        const detected = getAutoSelectedJava(
          allJava,
          instance.runtime.minecraft,
          instance.runtime.forge,
          undefined, // no resolved version object in this simplified hook
        );

        // IMPORTANT: pass resolveJava *function*, not the whole service object
        const result = await getAutoOrManuallJava(
          detected,
          resolveJavaFn,
          instance.java,
        );

        if (cancelled) return;

        setStatus({
          instance: instance.path,
          javaPath: instance.java,
          java: result.java ?? result.auto.java,
          compatible: result.quality,
          preferredJava: result.auto.java,
        });
      } catch (error) {
        console.error('Error checking Java compatibility:', error);
        if (!cancelled) {
          setStatus(undefined);
        }
      } finally {
        if (!cancelled) {
          setRefreshing(false);
        }
      }
    };

    refresh();

    return () => {
      cancelled = true;
    };
    // Re-run when instance identity, version, Java path, or count of known Javas changes
  }, [
    instance?.path,
    instance?.version,
    instance?.java,
    allJava.length,
    javaService,
  ]);

  return { status, refreshing };
}
