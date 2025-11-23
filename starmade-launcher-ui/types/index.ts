import type { MinecraftVersion, CreateInstanceOption, EditInstanceOptions, Instance, UserProfile, JavaRecord } from '@xmcl/runtime-api';
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

// Context Types
export interface AppContextType {
  activePage: Page;
  pageProps: PageProps;
  isLaunchModalOpen: boolean;
  isLaunching: boolean;
  progress: number;
  navigate: (page: Page, props?: PageProps) => void;
  openLaunchModal: () => void;
  closeLaunchModal: () => void;
  startLaunching: () => void;
  completeLaunching: () => void;
  gameExitError: { code: number; crashReport?: string; crashReportLocation?: string; errorLog?: string } | null;
  clearGameExitError: () => void;
  
  // Task manager properties
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
  javaVersions: JavaRecord[];  // Changed from any[]
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
