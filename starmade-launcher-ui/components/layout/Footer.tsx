import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon, ChevronRightIcon, DiscordIcon } from '../common/icons';
import useOnClickOutside from '../hooks/useOnClickOutside';
import { useApp } from '../../contexts/AppContext';
import { useData } from '../../contexts/DataContext';
import { useLaunchButton } from '../hooks/useLaunchButton';
import { getIconComponent } from '../../utils/getIconComponent';

const DiscordButton: React.FC = () => {
    const [onlineCount, setOnlineCount] = useState<number | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string>('https://discord.gg/starmade');

    useEffect(() => {
        fetch('https://discordapp.com/api/guilds/100173352475303936/widget.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data?.presence_count) {
                    setOnlineCount(data.presence_count);
                }
                if (data?.instant_invite) {
                    setInviteUrl(data.instant_invite);
                }
            })
            .catch(error => {
                console.error('Failed to fetch Discord widget data:', error);
            });
    }, []);

    return (
        <a 
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2 bg-black/20 rounded-md hover:bg-black/40 transition-colors border border-white/10 group"
        >
            <DiscordIcon className="w-6 text-gray-400 group-hover:text-white transition-colors" />
            <div className="text-left">
                <p className="text-sm font-medium text-white">Join Discord</p>
                {onlineCount !== null ? (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        {onlineCount.toLocaleString()} Online
                    </p>
                ) : (
                    <p className="text-xs text-gray-400">Loading members...</p>
                )}
            </div>
        </a>
    );
};

const InstanceSelector: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(dropdownRef, () => setIsOpen(false));
    
    // Use installations and selectedInstance from DataContext
    const { installations, selectedInstance, selectInstance } = useData();

    // Find the managed item view model for the selected instance
    // This ensures we use the same data (icon, formatted version) as the list
    const currentItem = installations.find(i => i.id === selectedInstance?.path);

    // If no instance is selected or loaded yet
    if (!selectedInstance || !currentItem) {
        return (
            <div className="flex items-center gap-3 pl-4 pr-3 py-2 bg-black/20 rounded-md border border-white/10 opacity-50">
                <span className="text-sm text-gray-400">Select an Instance...</span>
            </div>
        );
    }

    const iconName = currentItem.icon || 'release';

    return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 pl-4 pr-3 py-2 bg-black/20 rounded-md hover:bg-black/40 transition-colors border border-white/10 min-w-[200px]"
      >
        <div className="flex items-center gap-2 flex-1">
            {getIconComponent(iconName)}
            <div className="text-left overflow-hidden">
                <p className="text-sm font-medium text-white truncate max-w-[150px]">{currentItem.name}</p>
                <p className="text-xs text-gray-400 truncate">
                    {currentItem.version}
                </p>
            </div>
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

        {isOpen && (
            <div className="absolute bottom-full mb-2 w-full min-w-[240px] bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-md shadow-lg overflow-hidden z-20 max-h-64 overflow-y-auto">
                <ul>
                    {installations.map(inst => (
                        <li key={inst.id}>
                            <button 
                                onClick={() => {
                                    selectInstance(inst.id);
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700/50 transition-colors"
                            >
                               {getIconComponent(inst.icon)}
                               <div className="flex-1 min-w-0">
                                   <p className="text-sm text-white truncate">{inst.name}</p>
                                   <p className="text-xs text-gray-400 truncate">{inst.version}</p>
                               </div>
                               {selectedInstance.path === inst.id && (
                                   <CheckIcon className="w-4 h-4 text-starmade-accent" />
                               )}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
  );
};

interface SciFiPlayButtonProps {
    text: string;
    color: string;
    loading: boolean;
    progress?: number;
    onClick: () => void;
    disabled: boolean;
}

const SciFiPlayButton: React.FC<SciFiPlayButtonProps> = ({ 
    text, 
    color, 
    loading, 
    progress = 0, 
    onClick, 
    disabled 
}) => {
    const buttonClipPathId = "scifi-button-clip-path";

    // Map color prop to Tailwind classes
    const accentColor = color === 'orange' ? 'bg-orange-500' : 
                        color === 'blue' ? 'bg-blue-500' : 
                        'bg-starmade-accent';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="
                group relative font-display text-xl font-bold uppercase tracking-wider text-white
                h-[60px] w-[260px]
                transition-all duration-300 ease-in-out
                transform active:scale-95
                disabled:cursor-not-allowed disabled:opacity-70
            "
        >
            <svg width="0" height="0" className="absolute">
                <defs>
                    <clipPath id={buttonClipPathId} clipPathUnits="objectBoundingBox">
                       <polygon points="0 0, 1 0, 1 1, 0.95 1, 0 1" />
                    </clipPath>
                </defs>
            </svg>

            <div
                className="
                    absolute inset-0 bg-slate-900/60 border border-slate-700/80
                    transition-all duration-300
                    group-hover:bg-slate-800/80 group-hover:border-slate-600
                    disabled:group-hover:bg-slate-900/60 disabled:group-hover:border-slate-700/80
                "
                style={{ clipPath: `url(#${buttonClipPathId})` }}
            ></div>

            <div
                className={`
                    absolute top-0 left-0 h-full ${accentColor}
                    shadow-[0_0_8px_0px_rgba(34,123,134,0.5)]
                `}
                style={{
                    clipPath: `url(#${buttonClipPathId})`,
                    width: `${progress}%`,
                    opacity: loading ? 1 : 0,
                    transition: progress > 1 ? 'width 0.05s linear' : 'opacity 0.5s ease-out',
                }}
            ></div>

            <div className="relative z-10 flex items-center justify-center h-full w-full gap-2">
                <span>{text}</span>
            </div>
        </button>
    );
};


const Footer: React.FC = () => {
  const { navigate, completeLaunching } = useApp();
  
  // Use the new hook to get button state
  const { text, color, loading, progress, onClick, disabled } = useLaunchButton();

  // Handle completion cleanup
  useEffect(() => {
    if (!loading && progress === 100) {
        completeLaunching();
    }
  }, [loading, progress, completeLaunching]);

  return (
    <footer className="relative z-20 px-6 py-4 bg-black/20 backdrop-blur-sm border-t border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex-1 flex justify-start">
            <DiscordButton />
        </div>
        
        <div className="flex items-center justify-center gap-6">
            <InstanceSelector />

            <SciFiPlayButton 
                text={text}
                color={color}
                loading={loading}
                progress={progress}
                onClick={onClick}
                disabled={disabled}
            />

            <button 
                onClick={() => navigate('Installations', { initialTab: 'servers' })}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-semibold uppercase tracking-wider">
                <span>Start Server</span>
                <ChevronRightIcon className="w-4 h-4" />
            </button>
        </div>

        <div className="flex-1 flex justify-end">
            {/* This space is intentionally left blank to balance the layout */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
