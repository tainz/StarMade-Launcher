import { useMemo, useCallback } from 'react';
import { useInstanceFiles } from './useInstanceFiles';

export interface FileIssue {
  title: string;
  description: string;
}

/**
 * Hook to diagnose instance file installation issues.
 * Mirrors Vue's instanceFilesDiagnose.ts composable.
 * 
 * Phase 2.1: This is Step 4 in the launch button click sequence.
 * Checks for:
 * - Unzip file not found errors (modpack extraction failures)
 * - Pending file installations (mods, configs waiting to be installed)
 * 
 * Separate from useInstanceVersionInstall which checks global version files.
 */
export function useInstanceFilesDiagnose(instancePath: string | undefined) {
  const {
    instanceInstallStatus,
    resumeInstall,
    isResumingInstall,
    unzipFileNotFound,
  } = useInstanceFiles(instancePath);

  // Compute diagnosis issue
  const issue = useMemo<FileIssue | undefined>(() => {
    if (unzipFileNotFound) {
      return {
        title: 'Unzip File Not Found',
        description: `Cannot extract archive. File not found: ${unzipFileNotFound}`,
      };
    }

    const pendingCount = instanceInstallStatus?.pendingFileCount || 0;
    if (pendingCount > 0) {
      return {
        title: 'Pending File Installation',
        description: `${pendingCount} file(s) need to be installed to this instance.`,
      };
    }

    return undefined;
  }, [unzipFileNotFound, instanceInstallStatus]);

  // Fix function
  const fixFiles = useCallback(async () => {
    if (!instancePath) return;

    const pendingCount = instanceInstallStatus?.pendingFileCount || 0;
    if (pendingCount > 0) {
      await resumeInstall(instancePath).catch((e) => {
        // Don't throw empty name errors (handled elsewhere)
        if (e.name !== '') {
          throw e;
        }
      });
    }
  }, [instancePath, instanceInstallStatus, resumeInstall]);

  // Loading state
  const loading = useMemo(() => {
    return instanceInstallStatus?.instance
      ? isResumingInstall(instanceInstallStatus.instance)
      : false;
  }, [instanceInstallStatus, isResumingInstall]);

  return {
    issue,
    fixFiles,
    loading,
  };
}