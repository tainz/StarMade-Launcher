import React from 'react';
import {
  ExclamationTriangleIcon,
  CloseIcon,
  BugIcon,
  FolderIcon,
} from './icons';
import { useApp } from '../../contexts/AppContext';

/**
 * Shows a crash/exit dialog when Minecraft exits with a non‑zero code.
 * Uses gameExitError from AppContext, similar in spirit to AppGameExitDialog in Vue.
 */
const GameExitModal: React.FC = () => {
  const { gameExitError, clearGameExitError } = useApp();

  if (!gameExitError) return null;

  const { code, crashReportLocation, crashReport, errorLog } = gameExitError;

  const title =
    code !== 0 ? 'Game Crashed' : 'Game Exited With Error';

  const subtitle =
    code !== 0
      ? `Minecraft exited with code ${code}.`
      : 'Minecraft exited unexpectedly.';

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div className="relative bg-slate-900/95 border border-starmade-danger/50 rounded-xl shadow-2xl w-full max-w-3xl p-6 animate-fade-in-scale">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-starmade-danger-dark/50 border border-starmade-danger/70">
              <BugIcon className="w-6 h-6 text-starmade-danger-light" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white">
                {title}
              </h2>
              <p className="text-sm text-gray-300">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={clearGameExitError}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Crash report summary */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <ExclamationTriangleIcon className="w-4 h-4 text-starmade-danger-light" />
            <span>
              Exit code: <span className="font-mono">{code}</span>
            </span>
          </div>

          {crashReportLocation && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <FolderIcon className="w-4 h-4 text-gray-300" />
              <span className="truncate">
                Crash report saved at:{' '}
                <span className="font-mono text-xs break-all">
                  {crashReportLocation}
                </span>
              </span>
            </div>
          )}

          {crashReport && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <FolderIcon className="w-4 h-4 text-gray-300" />
              <span className="truncate">
                Crash report file:{' '}
                <span className="font-mono text-xs break-all">
                  {crashReport}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Error log */}
        {errorLog && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Error Log
            </h3>
            <div className="max-h-64 overflow-auto rounded-md bg-black/60 border border-white/10 p-3">
              <pre className="text-xs text-gray-200 font-mono whitespace-pre-wrap">
                {errorLog}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={clearGameExitError}
            className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-sm font-semibold uppercase tracking-wider text-gray-100 border border-slate-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameExitModal;
