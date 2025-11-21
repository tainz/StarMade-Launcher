// components/hooks/useInstanceJavaDiagnose.ts
import { useMemo } from 'react';
import { JavaCompatibleState } from '@xmcl/runtime-api';
import { InstanceJavaStatus } from './useInstanceJava';

export type JavaIssueType = 'invalid' | 'incompatible';

export interface JavaIssue {
  type: JavaIssueType;
  title: string;
  description: string;
}

/**
 * Given an InstanceJavaStatus, determine whether there is a user‑visible Java issue.
 * This mirrors the logic of the Vue instanceJavaDiagnose composable in a React‑friendly form.
 */
export function useInstanceJavaDiagnose(status: InstanceJavaStatus | undefined) {
  const issue = useMemo<JavaIssue | undefined>(() => {
    if (!status) return undefined;

    const { java, javaPath, compatible, preferredJava } = status;

    // No Java at all or invalid path → Invalid Java
    if ((!javaPath && !java) || (java && !java.valid)) {
      return {
        type: 'invalid',
        title: 'Invalid Java',
        description:
          'The selected Java path is invalid or missing. Please choose a valid Java installation in the launcher settings.',
      };
    }

    // Any non-matched compatibility → Incompatible Java
    // FIX: Allow Matched AND Recommended states.
    if (compatible !== JavaCompatibleState.Matched && compatible !== JavaCompatibleState.Recommended) {
      const currentVersion = java?.version ?? 'unknown';
      const preferredVersion = preferredJava?.version ?? 'a different version';
      return {
        type: 'incompatible',
        title: 'Incompatible Java',
        description: `The selected Java version (${currentVersion}) may be incompatible with this instance. The recommended version is ${preferredVersion}.`,
      };
    }

    return undefined;
  }, [status]);

  return { issue };
}
