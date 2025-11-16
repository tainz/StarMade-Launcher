import { useState, useEffect, useCallback } from 'react';
import {
  InstallServiceKey,
  DiagnoseServiceKey,
  InstanceServiceKey,
  VersionServiceKey,
  JavaServiceKey,
} from '@xmcl/runtime-api';
import { Instance, RuntimeVersions } from '@xmcl/instance';
import { useService } from './useService';

export interface InstanceInstallInstruction {
  instance: string;
  runtime: RuntimeVersions;
  version: string;
  resolvedVersion?: string;
  jar?: any;
  profile?: any;
  libraries?: any[];
  assets?: any[];
  assetIndex?: any;
  optifine?: any;
  forge?: any;
  java?: any;
}

export function useInstanceVersionInstall(
  instancePath: string,
  instances: Instance[],
  javas: JavaRecord[]
) {
  const diagnoseService = useService(DiagnoseServiceKey);
  const installService = useService(InstallServiceKey);
  const versionService = useService(VersionServiceKey);
  const javaService = useService(JavaServiceKey);

  const [instruction, setInstruction] = useState<InstanceInstallInstruction | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const instance = instances.find((i) => i.path === instancePath);

  useEffect(() => {
    if (!instance) return;

    const diagnose = async () => {
      setLoading(true);
      try {
        const resolved = await versionService.resolveLocalVersion(instance.version);
        if (!resolved) {
          // Version not installed, need to install
          setInstruction({
            instance: instancePath,
            runtime: instance.runtime,
            version: instance.version,
          });
          return;
        }

        // Diagnose what's missing
        const jarIssue = await diagnoseService.diagnoseJar(resolved, 'client');
        const libIssues = await diagnoseService.diagnoseLibraries(resolved);
        const assetIssues = await diagnoseService.diagnoseAssets(resolved);

        if (jarIssue || libIssues.length > 0 || assetIssues.assets.length > 0) {
          setInstruction({
            instance: instancePath,
            runtime: instance.runtime,
            version: instance.version,
            resolvedVersion: resolved.id,
            jar: jarIssue,
            libraries: libIssues,
            assets: assetIssues.assets,
            assetIndex: assetIssues.assetIndex,
          });
        } else {
          setInstruction(undefined); // Everything is installed
        }
      } finally {
        setLoading(false);
      }
    };

    diagnose();
  }, [instance, diagnoseService, versionService, instancePath]);

  const fix = useCallback(async () => {
    if (!instruction || !instance) return;

    setLoading(true);
    try {
      // Install missing components based on instruction
      if (instruction.jar) {
        await installService.installMinecraftJar(
          instruction.resolvedVersion!,
          instruction.version,
          instruction.runtime.minecraft,
          'client'
        );
      }

      if (instruction.libraries && instruction.libraries.length > 0) {
        await installService.installLibraries(
          instruction.libraries.map((l) => l.library),
          instruction.runtime.minecraft
        );
      }

      if (instruction.assets && instruction.assets.length > 0) {
        await installService.installAssets(
          instruction.assets.map((a) => a.asset),
          instruction.runtime.minecraft
        );
      }

      // Refresh diagnosis
      setInstruction(undefined);
    } finally {
      setLoading(false);
    }
  }, [instruction, instance, installService]);

  return { instruction, fix, loading };
}
