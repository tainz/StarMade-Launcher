import { useState, useEffect } from 'react';
import { JavaRecord, JavaServiceKey, JavaState } from '@xmcl/runtime-api';
import { useService, useServiceMutation } from './useService';

export function useJavaContext() {
  const javaService = useService(JavaServiceKey);
  
  const [javaState, setJavaState] = useState<JavaState | undefined>(undefined);
  const [all, setAll] = useState<JavaRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    javaService.getJavaState().then((state) => {
      setJavaState(state);
      setAll(state.all);
    });
  }, [javaService]);

  useServiceMutation(javaState, 'javaUpdate', (java: JavaRecord) => {
    setAll((current) => {
      const index = current.findIndex((j) => j.path === java.path);
      if (index !== -1) {
        const newAll = [...current];
        newAll[index] = java;
        return newAll;
      }
      return [...current, java];
    });
  });

  useServiceMutation(javaState, 'javaRemove', (path: string) => {
    setAll((current) => current.filter((j) => j.path !== path));
  });

  const refresh = async () => {
    setRefreshing(true);
    try {
      await javaService.refreshLocalJava();
    } finally {
      setRefreshing(false);
    }
  };

  const remove = (java: JavaRecord) => {
    javaService.removeJava(java.path);
  };

  const missing = all.length === 0;

  return { all, missing, refresh, refreshing, remove };
}
