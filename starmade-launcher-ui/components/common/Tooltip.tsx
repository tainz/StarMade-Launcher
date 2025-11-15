import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div
        className={`
          absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap 
          bg-slate-900/90 text-white text-xs font-semibold rounded-md px-2.5 py-1.5 
          shadow-lg z-30 pointer-events-none 
          transform transition-all duration-150 ease-out
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'}
        `}
      >
        {text}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900/90"></div>
      </div>
    </div>
  );
};

export default Tooltip;
