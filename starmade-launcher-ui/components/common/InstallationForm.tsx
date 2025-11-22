import React, { useEffect, useState, useMemo } from 'react';
import { FolderIcon, MonitorIcon, ChevronDownIcon, CloseIcon, ServerIcon } from './icons';
import type { ManagedItem } from '../../types';
import { getIconComponent } from '../../utils/getIconComponent';
import CustomDropdown from './CustomDropdown';
import MemorySlider from './MemorySlider';
import { useData } from '../../contexts/DataContext';
import { useApp } from '../../contexts/AppContext';
import { useInstanceCreation } from '../hooks/useInstanceCreation';
import { useInstanceEdit } from '../hooks/useInstanceEdit';
import { CreateInstanceOption, EditInstanceOptions } from '@xmcl/runtime-api';

interface InstallationFormProps {
  item: ManagedItem;
  isNew: boolean;
  onSave: (data: CreateInstanceOption | EditInstanceOptions & { instancePath: string }) => void;
  onCancel: () => void;
  itemTypeName: string;
  isServerMode?: boolean;
}

const availableIcons = [
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

const InstallationForm: React.FC<InstallationFormProps> = ({
  item,
  isNew,
  onSave,
  onCancel,
  itemTypeName,
  isServerMode = false,
}) => {
  // FIXED: Get editInstance and globalSettings from DataContext
  const { minecraftVersions, javaVersions, instances, editInstance, globalSettings } = useData();
  const { registerPreLaunchFlush, unregisterPreLaunchFlush } = useApp();

  const instance = useMemo(
    () => (!isNew ? instances.find((i) => i.path === item.path) ?? null : null),
    [isNew, instances, item.path]
  );

  // --- HOOKS ---
  const creationHook = useInstanceCreation();
  // FIXED: Pass editInstance and globalSettings to useInstanceEdit
  const editHook = useInstanceEdit(instance, editInstance, globalSettings);

  const { formState: createFormState, updateField: updateCreateField, isCreating } = creationHook;
  const {
    data: editData,
    updateField: updateEditField,
    save: saveEdit,
    maxMemory: editMaxMemory,
    isModified,
    flushNow,
  } = editHook;

  // --- LOCAL UI STATE ---
  const [icon, setIcon] = useState(item.icon);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isIconPickerOpen, setIconPickerOpen] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (isNew) {
      updateCreateField('name', item.name);
      updateCreateField('version', item.version);
      updateCreateField('memory', item.maxMemory ?? 4096);
      updateCreateField('vmOptions', item.vmOptions ?? '');
      updateCreateField('javaPath', item.java ?? '');

      if (isServerMode) {
        updateCreateField('isServer', true);
        updateCreateField('host', item.port ?? '');
        updateCreateField('port', '25565');
      }
    }
  }, [isNew, item, updateCreateField, isServerMode]);

  // --- PRE-LAUNCH FLUSH REGISTRATION ---
  // Register flushNow with AppContext so pending edits are saved before launch
  useEffect(() => {
    if (!isNew && flushNow) {
      registerPreLaunchFlush(flushNow);
      return () => unregisterPreLaunchFlush();
    }
  }, [isNew, flushNow, registerPreLaunchFlush, unregisterPreLaunchFlush]);

  // --- HANDLERS ---
  const handleSave = () => {
    if (isNew) {
      const versionMeta = minecraftVersions.find((v) => v.id === createFormState.version);
      const options: CreateInstanceOption = {
        name: createFormState.name,
        version: createFormState.version,
        java: createFormState.javaPath || undefined,
        maxMemory: createFormState.memory,
        vmOptions: createFormState.vmOptions.split(' ').filter((x) => x.length > 0),
        mcOptions: createFormState.mcOptions.split(' ').filter((x) => x.length > 0),
        runtime: {
          minecraft: createFormState.version,
          forge: '',
          fabricLoader: '',
          quiltLoader: '',
        },
        icon,
      };

      if (isServerMode) {
        options.server = {
          host: createFormState.host,
          port: parseInt(createFormState.port, 10) || 25565,
        };
      }

      creationHook.createVanillaInstance(options, versionMeta, []).then((newPath) => {
        onSave({ ...options, instancePath: newPath } as any);
      });
    } else {
      saveEdit().then(() => {
        onSave({
          name: editData.name,
          version: editData.version,
          runtime: editData.runtime,
          icon: editData.icon,
          instancePath: instance!.path,
        } as any);
      });
    }
  };

  // --- DERIVED STATE ---
  const name = isNew ? createFormState.name : editData.name;
  const version = isNew ? createFormState.version : editData.version;
  const memory = isNew ? createFormState.memory : editMaxMemory;
  const vmOptions = isNew ? createFormState.vmOptions : editHook.vmOptions;
  const javaPath = isNew ? createFormState.javaPath : editData.javaPath;

  const updateName = (v: string) => (isNew ? updateCreateField('name', v) : updateEditField('name', v));
  const updateVersion = (v: string) => (isNew ? updateCreateField('version', v) : updateEditField('version', v));
  const updateMemory = (v: number) => (isNew ? updateCreateField('memory', v) : updateEditField('maxMemory', v));
  const updateVmOptions = (v: string) =>
    isNew ? updateCreateField('vmOptions', v) : updateEditField('vmOptions', v);
  const updateJavaPath = (v: string) =>
    isNew ? updateCreateField('javaPath', v) : updateEditField('javaPath', v);

  // --- RENDER ---
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 flex items-center justify-center bg-black/20 rounded-lg border border-white/10">
          {getIconComponent(icon, true)}
        </div>
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => updateName(e.target.value)}
            placeholder={`${itemTypeName} Name`}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-md px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-starmade-accent"
          />
          <button
            onClick={() => setIconPickerOpen(true)}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <span>Change Icon</span>
          </button>
        </div>
      </div>

      {/* Version Selection */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Version</label>
        <CustomDropdown
          options={minecraftVersions.map((v) => ({ value: v.id, label: `${v.id} (${v.type})` }))}
          value={version}
          onChange={updateVersion}
        />
      </div>

      {/* Server Host */}
      {isServerMode && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Host</label>
          <input
            type="text"
            value={isNew ? createFormState.host : editData.host}
            onChange={(e) =>
              isNew ? updateCreateField('host', e.target.value) : updateEditField('host', e.target.value)
            }
            placeholder="Server hostname or IP"
            className="w-full bg-slate-900/80 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-starmade-accent"
          />
        </div>
      )}

      {/* Memory Slider */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Memory Allocation</label>
        <MemorySlider value={memory} onChange={updateMemory} />
      </div>

      {/* Java Path */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Java Executable</label>
        <CustomDropdown
          options={[
            { value: '', label: 'Auto (recommended)' },
            ...javaVersions.filter((j) => j.path).map((j) => ({ value: j.path!, label: `${j.version} - ${j.path}` })),
          ]}
          value={javaPath}
          onChange={updateJavaPath}
        />
      </div>

      {/* More Options */}
      <button
        onClick={() => setShowMoreOptions(!showMoreOptions)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
      >
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${showMoreOptions ? 'rotate-180' : ''}`} />
        <span>{showMoreOptions ? 'Hide' : 'Show'} Advanced Options</span>
      </button>

      {showMoreOptions && (
        <div className="space-y-4 pl-4 border-l-2 border-white/10">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">JVM Arguments</label>
            <textarea
              value={vmOptions}
              onChange={(e) => updateVmOptions(e.target.value)}
              rows={2}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-starmade-accent font-mono text-sm"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md hover:bg-white/10 text-sm font-semibold uppercase tracking-wider text-gray-300 border border-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isCreating || (!isNew && !isModified)}
          className="px-4 py-2 rounded-md bg-starmade-accent hover:bg-starmade-accent/80 text-sm font-semibold uppercase tracking-wider text-white border border-starmade-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Icon Picker Modal */}
      {isIconPickerOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setIconPickerOpen(false)}
        >
          <div
            className="bg-slate-900/90 border border-slate-700 rounded-lg shadow-xl p-6 w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-bold uppercase text-white tracking-wider">Choose an Icon</h2>
              <button onClick={() => setIconPickerOpen(false)} className="p-1.5 rounded-md hover:bg-starmade-danger/20">
                <CloseIcon className="w-5 h-5 text-gray-400 hover:text-starmade-danger-light" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {availableIcons.map(({ icon: iconKey, name: iconName }) => (
                <button
                  key={iconKey}
                  onClick={() => {
                    setIcon(iconKey);
                    if (!isNew) {
                      updateEditField('icon', iconKey);
                    }
                    setIconPickerOpen(false);
                  }}
                  className="flex flex-col items-center justify-center gap-3 p-4 bg-black/20 rounded-lg border border-white/10 hover:border-starmade-accent hover:bg-starmade-accent/10 transition-all group"
                >
                  <div className="w-20 h-20 flex items-center justify-center">{getIconComponent(iconKey, true)}</div>
                  <span className="text-sm font-semibold text-gray-300 group-hover:text-white">{iconName}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallationForm;
