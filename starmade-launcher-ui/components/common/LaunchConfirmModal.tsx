import React from 'react';
import { ExclamationTriangleIcon, CloseIcon } from './icons';

interface LaunchConfirmModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onLaunchAnyway: () => void;
    onCancel: () => void;
}

const LaunchConfirmModal: React.FC<LaunchConfirmModalProps> = ({ isOpen, onConfirm, onLaunchAnyway, onCancel }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center"
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="relative bg-starmade-bg/90 border border-starmade-accent/30 rounded-xl shadow-2xl shadow-starmade-accent/10 w-full max-w-lg p-8 animate-fade-in-scale"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-full bg-starmade-danger-dark/50 border-2 border-starmade-danger/50">
                        <ExclamationTriangleIcon className="w-10 h-10 text-starmade-danger-light" />
                    </div>

                    <h2 className="font-display text-2xl font-bold uppercase text-white tracking-wider">
                        Existing Instance Detected
                    </h2>
                    <p className="mt-2 text-gray-300 max-w-sm mx-auto leading-relaxed">
                        Another StarMade process is currently running. To prevent potential issues, it's recommended to terminate the existing process before launching a new one.
                    </p>
                </div>

                <div className="mt-8 flex justify-center items-center gap-4 flex-wrap">
                    <button 
                        onClick={onLaunchAnyway} 
                        className="px-6 py-2 rounded-md bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 transition-colors text-sm font-semibold uppercase tracking-wider"
                    >
                        Launch Anyway
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="px-6 py-2 rounded-md bg-starmade-danger hover:bg-starmade-danger-hover transition-colors text-sm font-bold uppercase tracking-wider shadow-danger hover:shadow-danger-hover"
                    >
                        Terminate & Launch
                    </button>
                </div>
                
                <button 
                    onClick={onCancel} 
                    className="absolute top-3 right-4 p-2 rounded-full hover:bg-starmade-danger/20 transition-colors"
                    aria-label="Close"
                >
                    <CloseIcon className="w-6 h-6 text-gray-400 hover:text-starmade-danger-light" />
                </button>
            </div>
        </div>
    );
};

export default LaunchConfirmModal;
