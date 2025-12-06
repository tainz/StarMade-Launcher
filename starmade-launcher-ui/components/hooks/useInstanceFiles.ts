import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { InstanceInstallServiceKey, InstanceInstallStatus } from '@xmcl/runtime-api';
import { useService } from './useService';
import { InstanceFile } from '@xmcl/instance';

export interface ChecksumErrorFile {
  file: InstanceFile;
  expect: string;
  actual: string;
}

/**
 * Hook to monitor instance file installation status.
 * Mirrors Vue's instanceFiles.ts composable.
 */
export function useInstanceFiles(instancePath: string | undefined) {
  const { watchInstanceInstall, resumeInstanceInstall } = useService(InstanceInstallServiceKey);

  const [instanceFileStatus, setInstanceFileStatus] = useState<InstanceInstallStatus | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<any>(null);

  const [checksumErrorCount, setChecksumErrorCount] = useState<{
    key: string;
    count: number;
    files: ChecksumErrorFile[];
  } | undefined>(undefined);

  const [unzipFileNotFound, setUnzipFileNotFound] = useState<string | undefined>(undefined);
  const resumingInstallRef = useRef<Record<string, boolean>>({});

  // Subscribe to instance install status
  useEffect(() => {
    if (!instancePath) {
      setInstanceFileStatus(null);
      return;
    }

    let mounted = true;
    setIsValidating(true);

    // watchInstanceInstall returns a Promise<SharedState>
    watchInstanceInstall(instancePath)
      .then((sharedState) => {
        if (!mounted) return;
        
        // Access the current value from shared state
        setInstanceFileStatus(sharedState as any);
        setIsValidating(false);

        // TODO: Subscribe to updates if SharedState supports it
        // For now, just set initial value
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err);
        setIsValidating(false);
      });

    return () => {
      mounted = false;
    };
  }, [instancePath, watchInstanceInstall]);

  const shouldHintUserSkipChecksum = useMemo(
    () => checksumErrorCount?.count,
    [checksumErrorCount]
  );

  const blockingFiles = useMemo(
    () => checksumErrorCount?.files,
    [checksumErrorCount]
  );

  const unresolvedFiles = useMemo(
    () => (instanceFileStatus as any)?.unresolvedFiles,
    [instanceFileStatus]
  );

  const countUpChecksumError = useCallback(
    (key: string, files: ChecksumErrorFile[]) => {
      setChecksumErrorCount((prev) => {
        if (prev?.key === key) {
          return { ...prev, count: prev.count + 1 };
        } else {
          return { key, count: 1, files: files.filter((f) => !!f.file) };
        }
      });
    },
    []
  );

  const resumeInstall = useCallback(
    async (instancePath: string, bypass?: InstanceFile[]) => {
      if (resumingInstallRef.current[instancePath]) {
        return;
      }

      resumingInstallRef.current[instancePath] = true;

      try {
        const errors = await resumeInstanceInstall(instancePath, bypass);

        if (errors) {
          const checksumErrors = errors.filter(
            (e: any) => e.name === 'ChecksumNotMatchError'
          ) as ChecksumErrorFile[];

          if (checksumErrors.length > 0) {
            countUpChecksumError(
              checksumErrors.map((e) => e.expect).join(),
              checksumErrors.map((e) => ({
                file: e.file,
                expect: e.expect,
                actual: e.actual,
              }))
            );
          }

          const unzipErrors = errors
            .filter((e: any) => e.name === 'UnpackZipFileNotFoundError')
            .map((e: any) => e as { file: string });

          if (unzipErrors[0]?.file) {
            setUnzipFileNotFound(unzipErrors[0].file);
          }
        }
      } finally {
        resumingInstallRef.current[instancePath] = false;
      }
    },
    [resumeInstanceInstall, countUpChecksumError]
  );

  const resetChecksumError = useCallback(() => {
    setChecksumErrorCount(undefined);
  }, []);

  const isResumingInstall = useCallback((instancePath: string) => {
    return resumingInstallRef.current[instancePath] || false;
  }, []);

  return {
    instanceInstallStatus: instanceFileStatus,
    shouldHintUserSkipChecksum,
    isResumingInstall,
    unresolvedFiles,
    unzipFileNotFound,
    resumeInstall,
    resetChecksumError,
    blockingFiles,
    isValidating,
    error,
  };
}