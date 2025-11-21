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
  const { getMinecraftVersionList } = useVersionService();

  const [instruction, setInstruction] = useState<InstanceInstallInstruction | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const instance = instances.find((i) => i.path === instancePath);

  // --- Diagnosis Logic ---
  useEffect(() => {
    // Early return if no instance
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
          // Case 1: Version not installed at all. Full install needed.
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
          setInstruction(undefined); // Everything is healthy
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

    return () => {
      cancelled = true;
    };
  }, [
    instancePath,
    instance?.version,
    instance?.runtime, // Re-diagnose if runtime config changes
    diagnoseService,
    versionService,
  ]);

  // --- Fix / Install Logic ---
  const fix = useCallback(async () => {
    if (!instruction || !instance) return;

    setLoading(true);
    try {
      // Scenario A: Full Install (Version not resolved)
      if (!instruction.resolvedVersion) {
        console.log('Version not found, performing full install for:', instruction.version);
        const list = await getMinecraftVersionList();
        const meta = list.versions.find(v => v.id === instruction.version);
        
        if (meta) {
          await installService.installMinecraft(meta);
        } else {
          throw new Error(`Could not find metadata for version ${instruction.version}`);
        }
        
        // After full install, we clear instruction to trigger re-diagnosis
        setInstruction(undefined);
        return;
      }

      // Scenario B: Partial Repair (Jar, Libs, Assets)
      const promises: Promise<any>[] = [];

      // 1. Install Jar
      if (instruction.jar) {
        promises.push(installService.installMinecraftJar(
          instruction.resolvedVersion, 
          instruction.version, 
          instruction.runtime.minecraft, 
          'client'
        ));
      }

      // 2. Install Libraries
      if (instruction.libraries && instruction.libraries.length > 0) {
        promises.push(installService.installLibraries(
          instruction.libraries.map(l => l.library),
          instruction.runtime.minecraft
        ));
      }

      // 3. Install Asset Index (Crucial for vanilla)
      if (instruction.assetIndex) {
         // We need the version list to find the asset index URL
         const list = await getMinecraftVersionList();
         const versionMeta = list.versions.filter(v => v.id === instruction.runtime.minecraft);
         
         promises.push(installService.installAssetsForVersion(
            instruction.assetIndex.version,
            versionMeta
         ));
      } 
      // 4. Install Specific Assets (Only if index is fine but files are missing)
      else if (instruction.assets && instruction.assets.length > 0) {
        promises.push(installService.installAssets(
          instruction.assets.map(a => a.asset),
          instruction.runtime.minecraft
        ));
      }

      // 5. Install Profile (Installers)
      if (instruction.profile) {
          // For vanilla, this is rare, but for Forge/Fabric it handles the install profile
          // We need to resolve the java path for the installer
          // This is a simplified handling; full handling requires resolving Java logic
          const javaPath = instance.java || javas.find(j => j.valid)?.path;
          if (javaPath) {
             promises.push(installService.installByProfile({
                 profile: instruction.profile.installProfile,
                 side: 'client',
                 java: javaPath
             }));
          }
      }

      await Promise.all(promises);
      
      console.log('Successfully repaired instance:', instance.path);
      
      // Clear instruction to trigger re-diagnosis (which should now pass)
      setInstruction(undefined); 

    } catch (e) {
      console.error("Failed to fix instance:", e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [instruction, instance, installService, getMinecraftVersionList, javas]);

  return { instruction, fix, loading };
}
