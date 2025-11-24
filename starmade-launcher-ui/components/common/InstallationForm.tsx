import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  FolderIcon,
  MonitorIcon,
  ChevronDownIcon,
  CloseIcon,
  PencilIcon,
  ServerIcon,
} from './icons';
import type { ManagedItem, ItemType } from '../../types';
import { getIconComponent } from '../../utils/getIconComponent';
import CustomDropdown from './CustomDropdown';
import MemorySlider from './MemorySlider';
import { useData } from '../../contexts/DataContext';
import { useApp } from '../../contexts/AppContext';
import { useInstanceCreation } from '../hooks/useInstanceCreation';
import { useInstanceEdit } from '../hooks/useInstanceEdit';
import { useLocalVersions } from '../hooks/useLocalVersions'; // NEW (Phase 1.4)
import { CreateInstanceOption, EditInstanceOptions } from '@xmcl/runtime-api';

// Discriminated union types for save data
type CreateSaveData = CreateInstanceOption & { instancePath: string };
type EditSaveData = { instancePath: string };
type SaveData = CreateSaveData | EditSaveData;

interface InstallationFormProps {
  item: ManagedItem;
  isNew: boolean;
  onSave: (data: SaveData) => void;
  onCancel: () => void;
  itemTypeName: string;
  isServerMode?: boolean;
}

const FormField: React.FC<{
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, htmlFor, children, className }) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <label
      htmlFor={htmlFor}
      className="text-sm font-semibold text-gray-300 uppercase tracking-wider"
    >
      {label}
    </label>
    {children}
  </div>
);

const branches: { value: ItemType; label: string }[] = [
  { value: 'release', label: 'Release' },
  { value: 'dev', label: 'Dev / Snapshot' },
  { value: 'archive', label: 'Archive (Old Beta/Alpha)' },
];

const resolutions = ['1280x720', '1920x1080', '2560x1440', '3840x2160'];

const availableIcons: { icon: string; name: string }[] = [
  { icon: 'release', name: 'Release' },
  { icon: 'dev', name: 'Dev Build' },
  { icon: 'pre', name: 'Pre-release' },
  { icon: 'archive', name: 'Archive' },
  { icon: 'rocket', name: 'Rocket' },
  { icon: 'planet', name: 'Planet' },
  { icon: 'star', name: 'Star' },
  { icon: 'server', name: 'Server' },
  { icon: 'code', name: 'Code' },
  { icon: 'bolt', name: 'Bolt' },
  { icon: 'beaker', name: 'Beaker' },
  { icon: 'cube', name: 'Cube' },
];

interface IconPickerModalProps {
  onSelect: (icon: string) => void;
  onClose: () => void;
}

const IconPickerModal: React.FC<IconPickerModalProps> = ({ onSelect, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-slate-900/90 border border-slate-700 rounded-lg shadow-xl p-6 w-full max-w-2xl relative animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-2xl font-bold uppercase text-white tracking-wider">
            Choose an Icon
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-starmade-danger/20 transition-colors"
          >
            <CloseIcon className="w-5 h-5 text-gray-400 hover:text-starmade-danger-light" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {availableIcons.map(({ icon, name }) => (
            <button
              key={icon}
              onClick={() => {
                onSelect(icon);
                onClose();
              }}
              className="flex flex-col items-center justify-center gap-3 p-4 bg-black/20 rounded-lg border border-white/10 hover:border-starmade-accent hover:bg-starmade-accent/10 transition-all group"
            >
              <div className="w-20 h-20 flex items-center justify-center">
                {getIconComponent(icon, 'large')}
              </div>
              <span className="text-sm font-semibold text-gray-300 group-hover:text-white">
                {name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const CUSTOM_JAVA_VALUE = '__custom__';

const InstallationForm: React.FC<InstallationFormProps> = ({
  item,
  isNew,
  onSave,
  onCancel,
  itemTypeName,
  isServerMode = false,
}) => {
  const {
    minecraftVersions,
    javaVersions,
    instances,
    editInstance,
    globalSettings,
  } = useData();
  const { registerPreLaunchFlush, unregisterPreLaunchFlush } = useApp();

  // NEW (Phase 1.4): Fetch local versions using dedicated hook
  const {
    versions: localVersions,
    servers: localServers,
    loading: loadingLocal,
    error: localError,
  } = useLocalVersions();

  const instance = useMemo(
    () => (!isNew ? instances.find((i) => i.path === item.path) ?? null : null),
    [isNew, instances, item.path],
  );

  // Create-mode hook
  const { formState, updateField, create, isCreating } = useInstanceCreation();

  // Edit-mode hook
  const editHook = useInstanceEdit(instance, editInstance, globalSettings);
  const {
    data: editData,
    updateField: updateEditField,
    save: saveEdit,
    maxMemory: editMaxMemory,
    vmOptions: editVmOptions,
    host: editHost,
    port: editPort,
    flushNow,
  } = editHook;

  // Local UI state
  const [icon, setIcon] = useState(item.icon);
  const [type, setType] = useState<ItemType>(
    (item.type === 'latest' ? 'release' : item.type) || 'release',
  );
  const [resolution, setResolution] = useState('1920x1080');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isIconPickerOpen, setIconPickerOpen] = useState(false);
  const [javaSelection, setJavaSelection] = useState<string>('');
  const [customJavaPath, setCustomJavaPath] = useState('');

  const lastMemoryRef = useRef<number | undefined>(undefined);
  const isInitializedRef = useRef(false);

  // Initialize form state for create + edit
  useEffect(() => {
    if (isNew) {
      updateField('name', item.name);
      updateField('version', item.version);
      updateField('memory', item.maxMemory ?? 4096);
      updateField('vmOptions', item.vmOptions ?? '');
      updateField('javaPath', item.java ?? '');

      updateField('isServer', isServerMode);
      if (isServerMode) {
        updateField('host', item.port || '');
        updateField('port', '25565');
      }
    } else if (instance) {
      setIcon(instance.icon);
    }

    // Java UI helpers
    if (!item.java) {
      setJavaSelection('');
      setCustomJavaPath('');
    } else {
      const known = javaVersions.find((j) => j.path === item.java);
      if (known) {
        setJavaSelection(known.path);
        setCustomJavaPath('');
      } else {
        setJavaSelection(CUSTOM_JAVA_VALUE);
        setCustomJavaPath(item.java);
      }
    }
  }, [isNew, item, instance, javaVersions, updateField, isServerMode]);

  // Java sync (mode-aware)
  useEffect(() => {
    const value = javaSelection === CUSTOM_JAVA_VALUE ? customJavaPath : javaSelection;
    if (isNew) {
      updateField('javaPath', value);
    } else if (instance) {
      updateEditField('javaPath', value);
    }
  }, [javaSelection, customJavaPath, isNew, instance, updateField, updateEditField]);

  // Memory sync with infinite loop prevention
  // FIXED: Track initialization to prevent syncing on load
  useEffect(() => {
    const effectiveMemory = isNew
      ? formState.memory
      : editMaxMemory ?? globalSettings.globalMaxMemory;

    // Skip on initial load - only sync when user changes memory
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      lastMemoryRef.current = effectiveMemory;
      return;
    }

    // Only update if memory actually changed
    if (lastMemoryRef.current === effectiveMemory) return;
    lastMemoryRef.current = effectiveMemory;

    const currentArgs = isNew ? formState.vmOptions : editVmOptions;
    const memoryInGB = effectiveMemory / 1024;

    const otherArgs = currentArgs
      .split(' ')
      .filter((arg) => !arg.startsWith('-Xm'))
      .join(' ');
    const newArgs = `-Xms${memoryInGB}G -Xmx${memoryInGB}G ${otherArgs}`.trim();

    if (newArgs !== currentArgs) {
      if (isNew) {
        updateField('vmOptions', newArgs);
      } else {
        updateEditField('vmOptions', newArgs);
      }
    }
  }, [
    isNew,
    formState.memory,
    editMaxMemory,
    globalSettings.globalMaxMemory,
    updateField,
    updateEditField,
  ]);

  // Pre-launch flush registration (edit mode only)
  useEffect(() => {
    if (!isNew && flushNow) {
      registerPreLaunchFlush(flushNow);
      return () => unregisterPreLaunchFlush();
    }
  }, [isNew, flushNow, registerPreLaunchFlush, unregisterPreLaunchFlush]);

  // NEW (Phase 1.4): Build version options with local version indicator
  const versionOptions = useMemo(() => {
    const localVersionIds = new Set(localVersions.map((v) => v.id));

    return minecraftVersions
      .filter((v) => {
        switch (type) {
          case 'release':
            return v.type === 'release';
          case 'dev':
          case 'pre':
            return v.type === 'snapshot';
          case 'archive':
            return v.type === 'old_beta' || v.type === 'old_alpha';
          default:
            return v.type === 'release';
        }
      })
      .map((v) => {
        const isLocal = localVersionIds.has(v.id);
        return {
          value: v.id,
          label: isLocal ? `${v.id} (installed)` : v.id,
        };
      });
  }, [minecraftVersions, localVersions, type]);

  const javaOptions = useMemo(
    () => [
      { value: '', label: 'Auto (recommended)' },
      ...javaVersions
        .filter((j) => !!j.path)
        .map((j) => ({
          value: j.path!,
          label: `${j.version || 'Unknown version'} (${j.path})`,
        })),
      { value: CUSTOM_JAVA_VALUE, label: 'Custom Path...' },
    ],
    [javaVersions],
  );

  const handleSaveClick = async () => {
    if (isNew) {
      const versionMeta = minecraftVersions.find((v) => v.id === formState.version);
      try {
        const newPath = await create(versionMeta);

        const createOptions: CreateSaveData = {
          name: formState.name,
          version: formState.version,
          icon,
          java: formState.javaPath || undefined,
          maxMemory: formState.memory,
          vmOptions: formState.vmOptions.split(' ').filter((v) => v.length > 0),
          mcOptions: formState.mcOptions?.split(' ').filter((v) => v.length > 0) || [],
          runtime: {
            minecraft: formState.version,
            forge: '',
            fabricLoader: '',
            quiltLoader: '',
          },
          instancePath: newPath,
        };

        if (isServerMode) {
          createOptions.server = {
            host: formState.host,
            port: parseInt(formState.port, 10) || 25565,
          };
        }

        onSave(createOptions);
      } catch (e) {
        console.error('Creation failed', e);
      }
    } else if (instance) {
      try {
        await saveEdit();
        const editSaveData: EditSaveData = { instancePath: instance.path };
        onSave(editSaveData);
      } catch (e) {
        console.error('Edit save failed', e);
      }
    }
  };

  const handleIconSelect = (newIcon: string) => {
    setIcon(newIcon);
    if (!isNew && instance) {
      updateEditField('icon', newIcon);
    }
  };

  // Derived values for unified JSX
  const name = isNew ? formState.name : editData.name;
  const version = isNew ? formState.version : editData.version;
  const memory = isNew
    ? formState.memory
    : editMaxMemory ?? globalSettings.globalMaxMemory;
  const host = isNew ? formState.host : editHost ?? '';
  const port = isNew ? formState.port : editPort ?? '25565';

  const title = isNew ? `New ${itemTypeName}` : `Edit ${itemTypeName}`;
  const saveButtonText = isCreating ? 'Creating...' : isNew ? 'Create' : 'Save';

  return (
    <div className="h-full flex flex-col text-white">
      {isIconPickerOpen && (
        <IconPickerModal
          onSelect={handleIconSelect}
          onClose={() => setIconPickerOpen(false)}
        />
      )}
      <div className="flex justify-between items-center mb-6 flex-shrink-0 pr-4">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wider">
          {title}
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md hover:bg-white/10 transition-colors text-sm font-semibold uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveClick}
            disabled={isNew && isCreating}
            className="px-6 py-2 rounded-md bg-starmade-accent hover:bg-starmade-accent-hover transition-colors text-sm font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {saveButtonText}
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-4 space-y-8">
        {/* NEW (Phase 1.4): Local versions loading/error feedback */}
        {loadingLocal && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500/10 border border-blue-500/30">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-blue-300">Loading local versions...</span>
          </div>
        )}
        {localError && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-500/10 border border-red-500/30">
            <span className="text-sm text-red-300">
              Failed to load local versions. Using remote manifest only.
            </span>
          </div>
        )}

        <div className="flex gap-8 items-start">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setIconPickerOpen(true)}
              className="w-32 h-32 bg-black/30 rounded-lg flex items-center justify-center border border-white/10 hover:border-starmade-accent/80 hover:shadow-[0_0_15px_0px_#227b8644] transition-all group cursor-pointer relative"
            >
              {getIconComponent(icon, 'large')}
              <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                <PencilIcon className="w-8 h-8" />
                <span className="text-xs uppercase font-bold tracking-wider">
                  Change Icon
                </span>
              </div>
            </button>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4">
            <FormField label="Name" htmlFor="itemName" className="col-span-2">
              <input
                id="itemName"
                type="text"
                value={name}
                onChange={(e) =>
                  isNew
                    ? updateField('name', e.target.value)
                    : updateEditField('name', e.target.value)
                }
                className="bg-slate-900/80 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-starmade-accent"
              />
            </FormField>

            {isServerMode && (
              <>
                <FormField label="Server Host" htmlFor="serverHost" className="col-span-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <ServerIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      id="serverHost"
                      type="text"
                      value={host}
                      onChange={(e) =>
                        isNew
                          ? updateField('host', e.target.value)
                          : updateEditField('host', e.target.value)
                      }
                      placeholder="mc.example.com"
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-md py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-starmade-accent"
                    />
                  </div>
                </FormField>
                <FormField label="Port" htmlFor="serverPort" className="col-span-1">
                  <input
                    id="serverPort"
                    type="number"
                    value={port}
                    onChange={(e) =>
                      isNew
                        ? updateField('port', e.target.value)
                        : updateEditField('port', e.target.value)
                    }
                    placeholder="25565"
                    className="bg-slate-900/80 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-starmade-accent"
                  />
                </FormField>
              </>
            )}

            <FormField label="Branch" htmlFor="itemBranch">
              <CustomDropdown
                options={branches}
                value={type}
                onChange={(v) => setType(v as ItemType)}
              />
            </FormField>
            <FormField label="Version" htmlFor="itemVersion">
              <CustomDropdown
                options={versionOptions}
                value={version}
                onChange={(v) =>
                  isNew
                    ? updateField('version', v)
                    : updateEditField('version', v)
                }
              />
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          {!isServerMode && (
            <FormField label="Resolution" htmlFor="resolution">
              <CustomDropdown
                options={resolutions.map((r) => ({ value: r, label: r }))}
                value={resolution}
                onChange={setResolution}
                icon={<MonitorIcon className="w-5 h-5 text-gray-400" />}
              />
            </FormField>
          )}

          <div className="col-span-2">
            <hr className="border-slate-800 my-2" />
            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="w-full flex justify-between items-center p-2 rounded-md hover:bg-white/5 transition-colors"
            >
              <span className="text-base font-semibold text-gray-300 uppercase tracking-wider">
                More Options
              </span>
              <ChevronDownIcon
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  showMoreOptions ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showMoreOptions && (
              <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 animate-fade-in-scale">
                <FormField
                  label="Java Memory Allocation"
                  htmlFor="javaMemory"
                  className="col-span-2"
                >
                  <MemorySlider
                    value={memory}
                    onChange={(v) =>
                      isNew
                        ? updateField('memory', v)
                        : updateEditField('maxMemory', v)
                    }
                  />
                </FormField>

                <FormField label="Java Executable" htmlFor="javaPath">
                  <div className="flex flex-col gap-2">
                    <CustomDropdown
                      options={javaOptions}
                      value={javaSelection}
                      onChange={setJavaSelection}
                      className="w-full"
                      dropUp
                    />

                    {javaSelection === CUSTOM_JAVA_VALUE && (
                      <div className="flex">
                        <input
                          id="javaPath"
                          type="text"
                          value={customJavaPath}
                          onChange={(e) => setCustomJavaPath(e.target.value)}
                          className="flex-1 bg-slate-900/80 border border-slate-700 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-starmade-accent"
                          placeholder="Custom Java executable path"
                        />
                        <button className="bg-slate-800/80 border-t border-b border-r border-slate-700 px-4 rounded-r-md hover:bg-slate-700/80">
                          <FolderIcon className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </FormField>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallationForm;

