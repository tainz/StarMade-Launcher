import React from 'react';
import { CogIcon, FolderIcon, TrashIcon, PlayIcon } from './icons';
import { getIconComponent } from '../../utils/getIconComponent';
import type { ManagedItem } from '../../types';
import Tooltip from './Tooltip';

interface ItemCardProps {
  item: ManagedItem;
  isFeatured?: boolean;
  onEdit: (item: ManagedItem) => void;
  actionButtonText: string;
  statusLabel: string;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, isFeatured, onEdit, actionButtonText, statusLabel }) => (
    <div className={`
        flex items-center gap-6 p-4 rounded-lg bg-black/20 border
        transition-all duration-300
        ${isFeatured ? 'border-starmade-accent/80 shadow-[0_0_15px_0px_#227b8644]' : 'border-white/10 hover:border-white/20 hover:bg-black/30'}
    `}>
        <div className="flex-shrink-0">
            {getIconComponent(item.icon)}
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white">{item.name} <span className="text-sm font-normal text-gray-400">{item.version}</span></h3>
            <p className="text-xs text-gray-500 font-mono truncate">{item.path}</p>
        </div>
        <div className="flex-1 text-right">
            <p className="text-sm text-gray-400">{statusLabel}: {item.lastPlayed}</p>
        </div>
        <div className="flex items-center gap-2">
             <button className="
                flex items-center justify-center gap-2 px-4 py-2 rounded-md
                bg-starmade-accent/80 text-white font-semibold uppercase tracking-wider text-sm
                hover:bg-starmade-accent transition-colors
             ">
                <PlayIcon className="w-4 h-4" />
                <span>{actionButtonText}</span>
            </button>
            <Tooltip text="Open Directory">
                <button className="p-2 rounded-md hover:bg-white/10 transition-colors" aria-label="Open Folder">
                    <FolderIcon className="w-5 h-5 text-gray-400" />
                </button>
            </Tooltip>
            <Tooltip text="Settings">
                <button onClick={() => onEdit(item)} className="p-2 rounded-md hover:bg-white/10 transition-colors" aria-label="Settings">
                    <CogIcon className="w-5 h-5 text-gray-400" />
                </button>
            </Tooltip>
            <Tooltip text="Delete">
                <button className="p-2 rounded-md hover:bg-starmade-danger/20 transition-colors" aria-label="Delete">
                    <TrashIcon className="w-5 h-5 text-gray-400 hover:text-starmade-danger-light" />
                </button>
            </Tooltip>
        </div>
    </div>
);

export default ItemCard;
