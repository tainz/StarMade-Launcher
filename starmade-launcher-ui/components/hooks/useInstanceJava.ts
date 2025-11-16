import { useState, useEffect, useMemo } from 'react';
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
    if (!instance) return;

    const refresh = async () => {
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

        setStatus({
          instance: instance.path,
          javaPath: instance.java,
          java: result.java ?? result.auto.java,
          compatible: result.quality,
          preferredJava: result.auto.java,
        });
      } finally {
        setRefreshing(false);
      }
    };

    refresh();
  }, [instance, allJava, javaService]);

  return { status, refreshing };
}
