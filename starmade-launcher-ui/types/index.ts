import type { MinecraftVersion, CreateInstanceOption, EditInstanceOptions, Instance, UserProfile, JavaRecord, LaunchOptions } from '@xmcl/runtime-api';
import type { TaskItem } from '../components/hooks/useTaskManager';

export type ItemType = 'latest' | 'release' | 'dev' | 'archive' | 'pre';

export interface ManagedItem {
  id: string;
  name: string;
  version: string;
  type: ItemType;
  icon: string;
  path: string;
  lastPlayed: string;
  port?: string;
  java?: string;
  minMemory?: number;
  maxMemory?: number;
  vmOptions?: string;
  mcOptions?: string;
}

export type Page = 'Play' | 'Installations' | 'News' | 'Settings';
export type SettingsSection = 'launcher' | 'accounts' | 'about' | 'defaults';
export type InstallationsTab = 'installations' | 'servers';

export interface PageProps {
  initialSection?: SettingsSection;
  initialTab?: InstallationsTab;
}

/**
 * AppContextType - Updated for Phase 2 Launch Orchestration Refactor
 * 
 * CHANGES:
 * - startLaunching now accepts LaunchOptions (diagnosis moved to useLaunchButton)
 * - Added Phase 2.1 pre-launch flush methods
 * - Added Phase 2.2 launch exception state
 * - Added UI state flags (needsInstall, fixingVersion)
 */
export interface AppContextType {
  // Navigation
  activePage: Page;
  pageProps: PageProps;
  navigate: (page: Page, props?: PageProps) => void;

  // Modals
  isLaunchModalOpen: boolean;
  openLaunchModal: () => void;
  closeLaunchModal: () => void;

  // Progress
  progress: number;

  // Launch orchestration (Phase 2 refactored)
  startLaunching: (options: LaunchOptions) => Promise<void>; // CHANGED: now accepts LaunchOptions
  completeLaunching: () => void;
  isLaunching: boolean;
  
  // Phase 2.2: Launch exception state
  launchError: any;
  clearLaunchError: () => void;
  
  // Game exit errors
  gameExitError: { 
    code: number; 
    crashReport?: string; 
    crashReportLocation?: string; 
    errorLog?: string;
  } | null;
  clearGameExitError: () => void;

  // Phase 2.1: Pre-launch flush registry
  registerPreLaunchFlush: (listener: () => void | Promise<void>) => void;
  unregisterPreLaunchFlush: (listener: () => void | Promise<void>) => void;
  executePreLaunchFlush: () => Promise<void>;

  // UI state flags (for display only, not orchestration)
  needsInstall: boolean;
  fixingVersion: boolean;

  // Task manager
  tasks: TaskItem[];
  pauseTask: (task: TaskItem) => void;
  resumeTask: (task: TaskItem) => void;
  cancelTask: (task: TaskItem) => void;
}

/**
 * DataContext type - aligned with actual implementation in DataContext.tsx
 * 
 * REFACTORED for Step 3: Split user state from auth actions
 */
export interface DataContextType {
  // User state (from useUserState)
  accounts: UserProfile[];
  activeAccount: UserProfile | null;
  setActiveAccount: (account: UserProfile) => void;
  userLoading: boolean;  // Initial state fetch
  userError: string | null;  // Initial state fetch error
  
  // User actions (from useLogin)
  loginMicrosoft: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  authLoading: boolean;  // Auth action in progress
  authError: string | null;  // Auth action error
  
  // Instance state
  installations: ManagedItem[];
  servers: ManagedItem[];
  selectedInstance: Instance | null;
  instances: Instance[];  // Raw instances for edit flows
  
  // Instance actions (use CreateInstanceOption, not ManagedItem)
  selectInstance: (path: string) => void;
  addInstallation: (options: CreateInstanceOption) => void;
  updateInstallation: (options: EditInstanceOptions & { instancePath: string }) => void;
  deleteInstallation: (id: string) => void;
  addServer: (options: CreateInstanceOption) => void;
  updateServer: (options: EditInstanceOptions & { instancePath: string }) => void;
  deleteServer: (id: string) => void;
  getInstallationDefaults: () => ManagedItem;
  getServerDefaults: () => ManagedItem;
  editInstance: (options: EditInstanceOptions & { instancePath: string }) => Promise<void>;
  
  // Version state
  versions: { id: string; name: string; type: ItemType }[];
  minecraftVersions: MinecraftVersion[];
  selectedVersion: { id: string; name: string; type: ItemType } | null;
  setSelectedVersion: (version: { id: string; name: string; type: ItemType }) => void;
  
  // Java state
  javaVersions: JavaRecord[];
  javaIsMissing: boolean;
  refreshJava: () => void;
  
  // Global settings (for useInstanceEdit)
  globalSettings: {
    globalMaxMemory: number;
    globalMinMemory: number;
    globalVmOptions: string[];
    globalMcOptions: string[];
    globalAssignMemory: boolean;
    globalFastLaunch: boolean;
    globalHideLauncher: boolean;
    globalShowLog: boolean;
    globalDisableAuthlibInjector: boolean;
    globalDisableElyByAuthlib: boolean;
    globalPrependCommand: string;
    globalPreExecuteCommand: string;
    globalResolution: { width: number; height: number } | undefined;
  };
}