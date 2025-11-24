/**
 * useInstanceVersionDiagnose.ts
 * 
 * Hook to map version install instructions to UI-ready diagnosis items.
 * Mirrors Vue's `instanceVersionDiagnose.ts` composable.
 * 
 * Consumes `instruction` from `useInstanceVersionInstall` and returns
 * an array of `LaunchMenuItem`-like objects describing version issues
 * (missing version, missing/corrupted jar/libs/assets/profile, missing Java).
 * 
 * Keeps the same "raw diagnosis vs UI mapping" separation as Vue.
 */

import { useMemo } from 'react';
import { InstanceInstallInstruction } from './useInstanceVersionInstall';

export interface LaunchMenuItem {
  title: string;
  description: string;
  noDisplay?: boolean;
  icon?: string;
  rightIcon?: string;
  color?: string;
  onClick?: () => void;
}

/**
 * Hook to generate UI-ready version diagnosis items.
 * 
 * @param instruction - The install instruction from `useInstanceVersionInstall`
 * @returns Array of diagnosis items for display in launch button menu or dialogs
 */
export function useInstanceVersionDiagnose(
  instruction: InstanceInstallInstruction | undefined,
): LaunchMenuItem[] {
  return useMemo(() => {
    const items: LaunchMenuItem[] = [];

    if (!instruction) {
      return items;
    }

    // Missing Version (not resolved)
    if (!instruction.resolvedVersion) {
      items.push({
        title: 'Missing Version',
        description: `Version ${instruction.version} is not installed. Install to continue.`,
        noDisplay: true, // Hidden in some UI contexts, shown in others
      });
    }

    // Missing Java
    if (instruction.java) {
      items.push({
        title: 'Missing Java',
        description: `Java ${instruction.java.majorVersion} is required but not found. Install Java to continue.`,
      });
    }

    // Bad Install Profile
    if (instruction.profile) {
      items.push({
        title: 'Bad Install Profile',
        description: `Install profile for ${instruction.resolvedVersion} is corrupted or missing. Repair to continue.`,
      });
    }

    // Jar Issue (corrupted or missing)
    if (instruction.jar) {
      if (instruction.jar.type === 'corrupted') {
        items.push({
          title: 'Corrupted Version Jar',
          description: `Minecraft jar for ${instruction.jar.version} is corrupted. Repair to continue.`,
        });
      } else {
        items.push({
          title: 'Missing Version Jar',
          description: `Minecraft jar for ${instruction.jar.version} is missing. Repair to continue.`,
        });
      }
    }

    // Library Issues (corrupted or missing)
    if (instruction.libraries) {
      const libs = instruction.libraries;
      const count = libs.length;
      const name = libs[0]?.library?.path ?? 'unknown';

      if (libs.some((v: any) => v.type === 'corrupted')) {
        items.push({
          title: 'Corrupted Libraries',
          description: `${count} corrupted libraries detected (e.g., ${name}). Repair to continue.`,
        });
      } else {
        items.push({
          title: 'Missing Libraries',
          description: `${count} missing libraries detected (e.g., ${name}). Repair to continue.`,
        });
      }
    }

    // Asset Issues (corrupted or missing)
    if (instruction.assets) {
      const assets = instruction.assets;
      const count = assets.length;
      const name = assets[0]?.asset?.name ?? 'unknown';

      if (assets.some((v: any) => v.type === 'corrupted')) {
        items.push({
          title: 'Corrupted Assets',
          description: `${count} corrupted assets detected (e.g., ${name}). Repair to continue.`,
        });
      } else {
        items.push({
          title: 'Missing Assets',
          description: `${count} missing assets detected (e.g., ${name}). Repair to continue.`,
        });
      }
    }

    // Asset Index Issue (corrupted or missing)
    if (instruction.assetIndex) {
      if (instruction.assetIndex.type === 'corrupted') {
        items.push({
          title: 'Corrupted Assets Index',
          description: `Assets index for ${instruction.assetIndex.version} is corrupted. Repair to continue.`,
        });
      } else {
        items.push({
          title: 'Missing Assets Index',
          description: `Assets index for ${instruction.assetIndex.version} is missing. Repair to continue.`,
        });
      }
    }

    // Forge Issue
    if (instruction.forge) {
      items.push({
        title: 'Bad Forge Install',
        description: `Forge installation for ${instruction.forge.version} is corrupted or missing. Repair to continue.`,
      });
    }

    // Optifine Issue
    if (instruction.optifine) {
      items.push({
        title: 'Bad Optifine Install',
        description: `Optifine installation for ${instruction.optifine.type} ${instruction.optifine.patch} is corrupted or missing. Repair to continue.`,
      });
    }

    return items;
  }, [instruction]);
}

