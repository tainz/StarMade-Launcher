import React, { useState } from 'react';
import CustomDropdown from '../../common/CustomDropdown';

const SettingRow: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div className="flex justify-between items-center bg-black/20 p-4 rounded-lg border border-white/10">
        <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
        </div>
        <div>
            {children}
        </div>
    </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-starmade-accent' : 'bg-slate-600'}`}
        role="switch"
        aria-checked={checked}
    >
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const LauncherSettings: React.FC = () => {
    const [checkForUpdates, setCheckForUpdates] = useState(true);
    const [showLog, setShowLog] = useState(false);
    const [language, setLanguage] = useState('English (US)');
    const [closeBehavior, setCloseBehavior] = useState('Close launcher');

    const languageOptions = [
        { value: 'English (US)', label: 'English (US)' },
        { value: 'Deutsch', label: 'Deutsch' },
        { value: 'Français', label: 'Français' },
    ];
    
    const closeBehaviorOptions = [
        { value: 'Close launcher', label: 'Close launcher' },
        { value: 'Hide launcher', label: 'Hide launcher' },
        { value: 'Keep the launcher open', label: 'Keep the launcher open' },
    ];

    return (
        <div className="h-full flex flex-col">
            <h2 className="flex-shrink-0 font-display text-xl font-bold uppercase tracking-wider text-white mb-4 pb-2 border-b-2 border-white/10">
                General
            </h2>

            <div className="flex-grow overflow-y-auto pr-4">
                <div className="space-y-4">
                    <SettingRow title="Language" description="Choose the language for the launcher UI.">
                        <CustomDropdown 
                            className="w-64"
                            options={languageOptions} 
                            value={language} 
                            onChange={setLanguage} 
                        />
                    </SettingRow>
                    <SettingRow title="After Launching Game" description="Control what happens to the launcher after the game starts.">
                         <CustomDropdown 
                            className="w-64"
                            options={closeBehaviorOptions} 
                            value={closeBehavior} 
                            onChange={setCloseBehavior} 
                        />
                    </SettingRow>
                </div>

                <div className="mt-8">
                    <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white mb-4 pb-2 border-b-2 border-white/10">
                        Updates & Java
                    </h2>
                    <div className="space-y-4">
                        <SettingRow title="Check for launcher updates" description="Automatically check for updates when the launcher starts.">
                            <ToggleSwitch checked={checkForUpdates} onChange={setCheckForUpdates} />
                        </SettingRow>
                         <SettingRow title="Check for updates now" description="Manually check for a new version of the launcher.">
                            <button className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors text-sm font-semibold uppercase tracking-wider">
                                Check Now
                            </button>
                        </SettingRow>
                        <SettingRow title="Manage Bundled Java Runtimes" description="View and manage the Java runtimes used by the launcher.">
                            <button className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors text-sm font-semibold uppercase tracking-wider">
                                Manage Java
                            </button>
                        </SettingRow>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white mb-4 pb-2 border-b-2 border-white/10">
                        Game Log
                    </h2>
                    <div className="space-y-4">
                        <SettingRow title="Show StarMade Log" description="Shows a window that streams the log after the game has started.">
                            <ToggleSwitch checked={showLog} onChange={setShowLog} />
                        </SettingRow>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LauncherSettings;