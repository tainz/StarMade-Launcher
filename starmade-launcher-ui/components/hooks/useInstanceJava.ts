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
  allJava: JavaRecord[]
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

    // Flag to prevent state updates after unmount
    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;
      
      setRefreshing(true);
      try {
        const detected = getAutoSelectedJava(
          allJava,
          instance.runtime.minecraft,
          instance.runtime.forge,
          undefined // version
        );

        const result = await getAutoOrManuallJava(
          detected,
          javaService,
          instance.java
        );

        // Only update state if component is still mounted
        if (!cancelled) {
          setStatus({
            instance: instance.path,
            javaPath: instance.java,
            java: result.java ?? result.auto.java,
            compatible: result.quality,
            preferredJava: result.auto.java,
          });
        }
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

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [
    instance?.path,           // Only re-run if instance path changes
    instance?.version,        // Or if version changes
    instance?.java,           // Or if Java path changes
    allJava.length,           // Or if the number of Java installations changes
    javaService,
  ]);

  return { status, refreshing };
}
