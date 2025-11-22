import { useState, useEffect, useCallback } from 'react';
import {
  InstallServiceKey,
  DiagnoseServiceKey,
  VersionServiceKey,
  JavaRecord,
} from '@xmcl/runtime-api';
import { Instance, RuntimeVersions } from '@xmcl/instance';
import { useService } from './useService';
import { useVersionService } from './useVersionService';
import { getJavaPathForInstallProfile } from './useResolvedJavaForInstance';

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

/**
 * Hook to diagnose and repair instance versions/assets.
 * 
 * REFACTOR NOTE: Now uses getJavaPathForInstallProfile from useResolvedJavaForInstance
 * instead of inline Java selection, matching Vue's instanceVersionInstall.ts.
 */
export function useInstanceVersionInstall(
  instancePath: string,
  instances: Instance[],
  javas: JavaRecord[]
) {
  const diagnoseService = useService(DiagnoseServiceKey);
  const installService = useService(InstallServiceKey);
  const versionService = useService(VersionServiceKey);
  const { getMinecraftVersionList } = useVersionService();

  const [instruction, setInstruction] = useState<InstanceInstallInstruction | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const instance = instances.find((i) => i.path === instancePath);

  // --- Diagnosis Logic ---
  useEffect(() => {
    if (!instance) {
      setInstruction(undefined);
      return;
    }

    let cancelled = false;

    const diagnose = async () => {
      if (cancelled) return;
      setLoading(true);

      try {
        const resolved = await versionService.resolveLocalVersion(instance.version);

        if (cancelled) return;

        if (!resolved) {
          // Case 1: Version not installed at all
          if (!cancelled) {
            setInstruction({
              instance: instancePath,
              runtime: instance.runtime,
              version: instance.version,
            });
          }
          return;
        }

        // Case 2: Version exists, check for corruption/missing files
        const [jarIssue, libIssues, assetIssues, profileIssue] = await Promise.all([
          diagnoseService.diagnoseJar(resolved, 'client'),
          diagnoseService.diagnoseLibraries(resolved),
          diagnoseService.diagnoseAssets(resolved),
          diagnoseService.diagnoseProfile(resolved.id, 'client', instancePath),
        ]);

        if (cancelled) return;

        const hasIssues =
          jarIssue ||
          libIssues.length > 0 ||
          assetIssues.assets.length > 0 ||
          assetIssues.assetIndex ||
          profileIssue;

        if (hasIssues) {
          setInstruction({
            instance: instancePath,
            runtime: instance.runtime,
            version: instance.version,
            resolvedVersion: resolved.id,
            jar: jarIssue,
            libraries: libIssues,
            assets: assetIssues.assets,
            assetIndex: assetIssues.assetIndex,
            profile: profileIssue,
          });
        } else {
          setInstruction(undefined);
        }
      } catch (error) {
        console.error('[useInstanceVersionInstall] Diagnosis error:', error);
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

    return () => {
      cancelled = true;
    };
  }, [instancePath, instance?.version, instance?.runtime, diagnoseService, versionService]);

  // --- Fix / Install Logic ---
  const fix = useCallback(async () => {
    if (!instruction || !instance) return;

    setLoading(true);

    try {
      // Scenario A: Full Install (Version not resolved)
      if (!instruction.resolvedVersion) {
        console.log('[useInstanceVersionInstall] Full install for:', instruction.version);
        const list = await getMinecraftVersionList();
        const meta = list.versions.find((v) => v.id === instruction.version);

        if (meta) {
          await installService.installMinecraft(meta);
        } else {
          throw new Error(`Could not find metadata for version ${instruction.version}`);
        }

        setInstruction(undefined);
        return;
      }

      // Scenario B: Partial Repair (Jar, Libs, Assets, Profile)
      const promises: Promise<any>[] = [];

      if (instruction.jar) {
        promises.push(
          installService.installMinecraftJar(
            instruction.resolvedVersion,
            instruction.version,
            instruction.runtime.minecraft,
            'client'
          )
        );
      }

      if (instruction.libraries && instruction.libraries.length > 0) {
        promises.push(
          installService.installLibraries(
            instruction.libraries.map((l) => l.library),
            instruction.runtime.minecraft
          )
        );
      }

      if (instruction.assetIndex) {
        const list = await getMinecraftVersionList();
        const versionMeta = list.versions.filter((v) => v.id === instruction.runtime.minecraft);
        promises.push(
          installService.installAssetsForVersion(instruction.assetIndex.version, versionMeta)
        );
      } else if (instruction.assets && instruction.assets.length > 0) {
        promises.push(
          installService.installAssets(
            instruction.assets.map((a) => a.asset),
            instruction.runtime.minecraft
          )
        );
      }

      // Profile Install (Forge/Fabric installers)
      if (instruction.profile) {
        // NOTE: We resolve again here to get the JavaVersion requirement for the helper.
        // This is only for metadata extraction, not a second diagnosis pass.
        const resolved = await versionService.resolveLocalVersion(instruction.resolvedVersion);
        if (resolved) {
          const javaPath = getJavaPathForInstallProfile(instance, javas, resolved);

          // Only proceed if we got a string path (not a JavaVersion object)
          if (typeof javaPath === 'string') {
            promises.push(
              installService.installByProfile({
                profile: instruction.profile.installProfile,
                side: 'client',
                java: javaPath,
              })
            );
          } else {
            // FUTURE WORK: Trigger Java installation here when javaPath is a JavaVersion object
            console.warn(
              '[useInstanceVersionInstall] No valid Java found for profile install. ' +
              `Required major version: ${javaPath.majorVersion}. Skipping installer.`
            );
          }
        }
      }

      await Promise.all(promises);
      console.log('[useInstanceVersionInstall] Repair complete:', instance.path);

      setInstruction(undefined);
    } catch (e) {
      console.error('[useInstanceVersionInstall] Repair failed:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [instruction, instance, installService, getMinecraftVersionList, javas, versionService]);

  return { instruction, fix, loading };
}
