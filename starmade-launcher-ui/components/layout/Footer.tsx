import React from 'react';
import { PlayIcon, CheckIcon } from '../common/icons';
import { useApp } from '../../contexts/AppContext';
import { useData } from '../../contexts/DataContext';
import { useLaunchButton } from '../hooks/useLaunchButton';

/**
 * Phase 2.1: Footer launch button now delegates ALL orchestration to useLaunchButton.
 * 
 * This component is a pure UI shell that:
 * 1. Calls useLaunchButton for click handler and display state
 * 2. Renders button with appropriate styling
 * 
 * No launch logic, diagnosis, or error handling in JSX.
 */
const Footer: React.FC = () => {
  const data = useData();
  const {
    startLaunching,
    setIsLaunchModalOpen,
    isLaunching,
    registerPreLaunchFlush,
    unregisterPreLaunchFlush,
  } = useApp();

  // Phase 2.1: All launch orchestration logic in useLaunchButton
  const launchButton = useLaunchButton(
    data,
    async () => {
      // Execute all registered pre-launch flush listeners
      const listeners = []; // Get from context
      await Promise.all(listeners.map((l) => l()));
    },
    startLaunching,
    setIsLaunchModalOpen,
    isLaunching,
    data.globalSettings,
    data.javaVersions
  );

  // Register autosave pre-launch flush (example)
  React.useEffect(() => {
    const autosaveFlush = async () => {
      console.log('Pre-launch: Auto-saving instance changes...');
      // TODO: Implement actual autosave logic
    };

    registerPreLaunchFlush(autosaveFlush);
    return () => unregisterPreLaunchFlush(autosaveFlush);
  }, [registerPreLaunchFlush, unregisterPreLaunchFlush]);

  return (
    <footer className="bg-slate-900/95 border-t border-slate-700 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Instance info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center">
            {data.selectedInstance?.icon ? (
              <img
                src={data.selectedInstance.icon}
                alt=""
                className="w-8 h-8"
              />
            ) : (
              <PlayIcon className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {data.selectedInstance?.name ?? 'No Instance Selected'}
            </h3>
            <p className="text-xs text-gray-400">
              {data.selectedInstance?.version ?? 'Select an instance to play'}
            </p>
          </div>
        </div>

        {/* Launch button - Phase 2.1: Pure UI rendering */}
        <button
          onClick={launchButton.onClick}
          disabled={launchButton.disabled}
          className={`
            px-8 py-3 rounded-md font-semibold uppercase tracking-wider
            transition-all transform hover:scale-105
            flex items-center gap-2
            ${
              launchButton.disabled
                ? 'bg-slate-700 text-gray-400 cursor-not-allowed'
                : launchButton.hasUserIssue ||
                  launchButton.hasVersionIssue ||
                  launchButton.hasFileIssue ||
                  launchButton.hasJavaIssue
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                : 'bg-starmade-accent hover:bg-starmade-accent-light text-white'
            }
          `}
        >
          {launchButton.isLaunching ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {launchButton.text}
            </>
          ) : (
            <>
              {launchButton.hasUserIssue ||
              launchButton.hasVersionIssue ||
              launchButton.hasFileIssue ||
              launchButton.hasJavaIssue ? (
                <CheckIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5" />
              )}
              {launchButton.text}
            </>
          )}
        </button>
      </div>
    </footer>
  );
};

export default Footer;