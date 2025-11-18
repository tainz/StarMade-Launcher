import React from 'react';
import { ExclamationTriangleIcon, CloseIcon, CheckIcon, BugIcon } from './icons';
import { TaskState } from '@xmcl/runtime-api';
import { useApp } from '../../contexts/AppContext';

/**
 * Shows real-time launch/install status, similar to HomeLaunchStatusDialog in the Vue app.
 * It opens automatically whenever isLaunching is true and there are active tasks.
 */
const LaunchStatusModal: React.FC = () => {
  const { isLaunching, progress, tasks, clearLaunchError, launchError } = useApp();

  const activeTasks = tasks.filter(
    (t) => t.state === TaskState.Running || t.state === TaskState.Waiting,
  );
  const hasContent = isLaunching || activeTasks.length > 0 || !!launchError;

  if (!hasContent) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div className="relative bg-slate-900/90 border border-starmade-accent/40 rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in-scale">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-starmade-accent/20 border border-starmade-accent/60">
              <BugIcon className="w-6 h-6 text-starmade-accent" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white">
                Launch Status
              </h2>
              <p className="text-sm text-gray-300">
                Preparing and launching your game. You can keep this open to monitor progress.
              </p>
            </div>
          </div>
          <button
            onClick={clearLaunchError}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Overall progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Overall Progress
            </span>
            <span className="text-xs font-mono text-gray-300">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-starmade-accent/80 to-starmade-accent"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>

        {/* Launch error (if any) */}
        {launchError && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-starmade-danger/60 bg-starmade-danger-dark/30 p-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-starmade-danger-light mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-starmade-danger-light uppercase tracking-wider">
                {launchError.title}
              </h3>
              <p className="text-sm text-gray-200 mt-1">{launchError.description}</p>
              {launchError.extraText && (
                <p className="mt-1 text-xs text-gray-400 font-mono whitespace-pre-wrap">
                  {launchError.extraText}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Active tasks list */}
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {activeTasks.length === 0 && !launchError && (
            <p className="text-sm text-gray-400">
              No active background tasks. Waiting for the game process to start…
            </p>
          )}

          {activeTasks.map((task) => {
            const pct =
              task.total > 0 ? Math.round((task.progress / task.total) * 100) : 0;

            return (
              <div
                key={task.id}
                className="p-3 rounded-md bg-black/30 border border-white/5 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    {task.message || 'Working…'}
                  </span>
                  <span className="text-xs font-mono text-gray-300">{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-starmade-accent"
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>{task.path || 'Launcher'}</span>
                  <span className="uppercase tracking-wider">
                    {TaskState[task.state] ?? 'Running'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer indicator */}
        <div className="mt-4 flex justify-end items-center gap-2 text-xs text-gray-400">
          {isLaunching ? (
            <>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-starmade-accent animate-pulse" />
                Launch in progress…
              </span>
            </>
          ) : (
            <>
              <CheckIcon className="w-4 h-4 text-starmade-accent" />
              <span>Launch tasks completed. Waiting for game exit.</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaunchStatusModal;
