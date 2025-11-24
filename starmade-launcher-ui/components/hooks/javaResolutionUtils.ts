/**
 * javaResolutionUtils.ts
 * 
 * Neutral utility for shared Java resolution logic.
 * Mirrors Vue's pattern where both `instanceJava.ts` and `instanceVersionInstall.ts`
 * call `getAutoSelectedJava` / `getAutoOrManuallJava` from the runtime API,
 * but neither depends on the other composable.
 * 
 * Used by:
 * - useResolvedJavaForInstance (runtime Java resolution)
 * - useInstanceVersionInstall (install-profile Java resolution)
 */

import {
  JavaRecord,
  getAutoSelectedJava as runtimeGetAutoSelectedJava,
  getAutoOrManuallJava as runtimeGetAutoOrManuallJava,
  JavaServiceKey,
  JavaCompatibleState,
  AutoDetectedJava,
  ResolvedVersion,
} from '@xmcl/runtime-api';

/**
 * Auto-select the best Java for an instance based on Minecraft/Forge versions.
 * Wrapper around runtime API helper to maintain consistency.
 */
export function getAutoSelectedJava(
  allJava: JavaRecord[],
  minecraftVersion: string,
  forgeVersion: string,
  resolvedVersion?: ResolvedVersion,
): AutoDetectedJava {
  return runtimeGetAutoSelectedJava(
    allJava,
    minecraftVersion,
    forgeVersion,
    resolvedVersion,
  );
}

/**
 * Resolve manual vs automatic Java selection for an instance.
 * If manualJavaPath is set, validates it; otherwise uses auto-detected Java.
 * Wrapper around runtime API helper.
 */
export async function getAutoOrManuallJava(
  autoDetected: AutoDetectedJava,
  resolveJava: (path: string) => Promise<JavaRecord | undefined>,
  manualJavaPath?: string,
): Promise<{
  java: JavaRecord | undefined;
  auto: AutoDetectedJava;
  quality: JavaCompatibleState;
}> {
  return await runtimeGetAutoOrManuallJava(
    autoDetected,
    resolveJava,
    manualJavaPath,
  );
}
