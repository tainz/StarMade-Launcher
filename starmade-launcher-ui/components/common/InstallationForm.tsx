import React, { useEffect, useMemo, useState } from 'react';
import {
  FolderIcon,
  MonitorIcon,
  ChevronDownIcon,
  CloseIcon,
  PencilIcon,
} from './icons';
import type { ManagedItem, ItemType } from '../../types';
import { getIconComponent } from '../../utils/getIconComponent';
import CustomDropdown from './CustomDropdown';
import MemorySlider from './MemorySlider';
import { useData } from '../../contexts/DataContext';
import { useInstanceCreation } from '../hooks/useInstanceCreation';
import { CreateInstanceOption, EditInstanceOptions } from '@xmcl/runtime-api';

interface InstallationFormProps {
  item: ManagedItem;
  isNew: boolean;
  onSave: (data: CreateInstanceOption | (EditInstanceOptions & { instancePath: string })) => void;
  onCancel: () => void;
  itemTypeName: string;
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

const IconPickerModal: React.FC<IconPickerModalProps> = ({
  onSelect,
  onClose,
}) => {
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
}) => {
  // --- Hook Integration ---
  const { formState, updateField, create, isCreating } = useInstanceCreation();
  const { minecraftVersions, javaVersions } = useData();

  // Local UI state (things that aren't strictly "Instance Configuration" or are UI-only)
  const [icon, setIcon] = useState(item.icon);
  const [type, setType] = useState<ItemType>((item.type === 'latest' ? 'release' : item.type) || 'release');
  const [resolution, setResolution] = useState('1920x1080');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isIconPickerOpen, setIconPickerOpen] = useState(false);
  const [javaSelection, setJavaSelection] = useState<string>('');
  const [customJavaPath, setCustomJavaPath] = useState('');

  // Initialize Form State from Item (Edit Mode) or Defaults
  useEffect(() => {
    updateField('name', item.name);
    updateField('version', item.version);
    updateField('memory', item.maxMemory ?? 4096);
    updateField('vmOptions', item.vmOptions ?? '');
    updateField('javaPath', item.java ?? '');
    
    // Initialize Java UI helpers
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
  }, [item, javaVersions, updateField]);

  // Sync Java Selection to Form State
  useEffect(() => {
    if (javaSelection === CUSTOM_JAVA_VALUE) {
      updateField('javaPath', customJavaPath);
    } else {
      updateField('javaPath', javaSelection);
    }
  }, [javaSelection, customJavaPath, updateField]);

  // Sync Memory to VM Options (Vue Parity Logic)
  useEffect(() => {
    const memoryInGB = formState.memory / 1024;
    const currentArgs = formState.vmOptions;
    const otherArgs = currentArgs
      .split(' ')
      .filter((arg) => !arg.startsWith('-Xm'))
      .join(' ');
    const newArgs = `-Xms${memoryInGB}G -Xmx${memoryInGB}G ${otherArgs}`.trim();
    
    if (newArgs !== currentArgs) {
        updateField('vmOptions', newArgs);
    }
  }, [formState.memory, updateField]);

  // Filter versions based on the selected branch type
  const versionOptions = useMemo(() => {
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
      .map((v) => ({ value: v.id, label: v.id }));
  }, [minecraftVersions, type]);

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
      // Use the Hook's create function for BOTH Installations and Servers
      // This ensures local dedicated servers get the full file installation process.
      const versionMeta = minecraftVersions.find(v => v.id === formState.version);
      try {
        // We pass the metadata so the hook can trigger the install immediately
        await create(versionMeta);
        
        // Notify parent to close view. Data is irrelevant as creation is done.
        onSave({} as any); 
      } catch (e) {
        // Error handled in hook (e.g. showing error state in UI)
        console.error("Creation failed", e);
      }
    } else {
      // Edit Mode: Construct options manually and pass to parent
      const editOptions: EditInstanceOptions & { instancePath: string } = {
        instancePath: item.id,
        name: formState.name,
        version: formState.version,
        icon: icon,
        java: formState.javaPath || undefined,
        maxMemory: formState.memory,
        vmOptions: formState.vmOptions.split(' ').filter(v => v.length > 0),
        runtime: {
            minecraft: formState.version,
            forge: '',
            fabricLoader: '',
            quiltLoader: '',
        }
      };
      onSave(editOptions);
    }
  };

  const title = isNew ? `New ${itemTypeName}` : `Edit ${itemTypeName}`;
  const saveButtonText = isCreating ? 'Creating...' : (isNew ? 'Create' : 'Save');

  return (
    <div className="h-full flex flex-col text-white">
      {isIconPickerOpen && (
        <IconPickerModal
          onSelect={setIcon}
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
            disabled={isCreating}
            className="px-6 py-2 rounded-md bg-starmade-accent hover:bg-starmade-accent-hover transition-colors text-sm font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {saveButtonText}
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-4 space-y-8">
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
                value={formState.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="bg-slate-900/80 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-starmade-accent"
              />
            </FormField>
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
                value={formState.version}
                onChange={(v) => updateField('version', v)}
              />
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          <FormField label="Resolution" htmlFor="resolution">
            <CustomDropdown
              options={resolutions.map(r => ({ value: r, label: r }))}
              value={resolution}
              onChange={setResolution}
              icon={<MonitorIcon className="w-5 h-5 text-gray-400" />}
            />
          </FormField>

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
                    value={formState.memory} 
                    onChange={(v) => updateField('memory', v)} 
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
