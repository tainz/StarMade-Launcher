import React, { useState, useRef } from 'react';
import { ChevronDownIcon } from './icons';
import useOnClickOutside from '../hooks/useOnClickOutside';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface CustomDropdownProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  icon?: React.ReactNode;
  className?: string;
  // NEW: allow the menu to open upwards instead of downwards
  dropUp?: boolean;
}

function CustomDropdown<T extends string>({
  options,
  value,
  onChange,
  icon,
  className,
  dropUp = false,
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useOnClickOutside(dropdownRef, () => setIsOpen(false));

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className ?? ''}`} ref={dropdownRef}>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
            {icon}
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full bg-slate-900/80 border border-slate-700 rounded-md py-2 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-starmade-accent ${
            icon ? 'pl-10' : 'pl-3'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selectedOption?.label ?? 'Select...'}
        </button>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDownIcon
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {isOpen && (
        <div
          className={`absolute w-full bg-slate-900 border border-slate-700 rounded-md z-20 max-h-60 overflow-y-auto ${
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-slate-800"
              role="option"
              aria-selected={value === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomDropdown;
