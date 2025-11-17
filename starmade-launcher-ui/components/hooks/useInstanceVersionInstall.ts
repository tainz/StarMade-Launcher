import { useState, useEffect, useCallback } from 'react';
import {
  InstallServiceKey,
  DiagnoseServiceKey,
  VersionServiceKey,
  JavaRecord,
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

  const [instruction, setInstruction] = useState<InstanceInstallInstruction | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const instance = instances.find((i) => i.path === instancePath);

  useEffect(() => {
    // Early return if no instance
    if (!instance) {
      setInstruction(undefined);
      return;
    }

    // Flag to prevent state updates after unmount
    let cancelled = false;

    const diagnose = async () => {
      if (cancelled) return;

      setLoading(true);
      try {
        const resolved = await versionService.resolveLocalVersion(instance.version);
        
        if (cancelled) return;

        if (!resolved) {
          // Version not installed, need to install
          if (!cancelled) {
            setInstruction({
              instance: instancePath,
              runtime: instance.runtime,
              version: instance.version,
            });
          }
          return;
        }

        // Diagnose what's missing
        const [jarIssue, libIssues, assetIssues] = await Promise.all([
          diagnoseService.diagnoseJar(resolved, 'client'),
          diagnoseService.diagnoseLibraries(resolved),
          diagnoseService.diagnoseAssets(resolved),
        ]);

        if (cancelled) return;

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
      } catch (error) {
        console.error('Error diagnosing instance version:', error);
        if (!cancelled) {
          setInstruction(undefined);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    diagnose();

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [
    instancePath,           // Only re-run if instance path changes
    instance?.version,      // Or if version changes
    diagnoseService,
    versionService,
  ]);

  const fix = useCallback(async () => {
    if (!instruction || !instance) return;

    setLoading(true);
    try {
      // Install missing components based on instruction
      const installPromises: Promise<any>[] = [];

      if (instruction.jar) {
        installPromises.push(
          installService.installMinecraftJar(
            instruction.resolvedVersion!,
            instruction.version,
            instruction.runtime.minecraft,
            'client'
          )
        );
      }

      if (instruction.libraries && instruction.libraries.length > 0) {
        installPromises.push(
          installService.installLibraries(
            instruction.libraries.map((l) => l.library),
            instruction.runtime.minecraft
          )
        );
      }

      if (instruction.assets && instruction.assets.length > 0) {
        installPromises.push(
          installService.installAssets(
            instruction.assets.map((a) => a.asset),
            instruction.runtime.minecraft
          )
        );
      }

      // Install all components in parallel
      await Promise.all(installPromises);

      // Clear instruction after successful installation
      setInstruction(undefined);
      
      console.log('Successfully installed missing components for instance:', instance.path);
    } catch (error) {
      console.error('Error installing missing components:', error);
      throw error; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  }, [instruction, instance, installService]);

  return { instruction, fix, loading };
}
