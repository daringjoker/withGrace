"use client";

import { ReactNode } from "react";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface RadioButtonGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  className?: string;
  cols?: 1 | 2 | 3 | 4;
}

export function RadioButtonGroup({ 
  name, 
  value, 
  onChange, 
  options, 
  className = "", 
  cols = 2 
}: RadioButtonGroupProps) {
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2", 
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  }[cols];

  return (
    <div className={`grid ${gridClass} gap-3 ${className}`}>
      {options.map((option) => (
        <label
          key={option.value}
          className={`
            relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
            ${option.disabled ? 
              'opacity-50 cursor-not-allowed' : 
              'hover:border-indigo-300 hover:bg-indigo-50'
            }
            ${value === option.value ? 
              'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 ring-opacity-20' : 
              'border-gray-200 bg-white'
            }
          `}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            disabled={option.disabled}
            className="sr-only"
          />
          
          {/* Selection indicator */}
          <div className={`
            flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3
            ${value === option.value ? 
              'border-indigo-500 bg-indigo-500' : 
              'border-gray-300 bg-white'
            }
          `}>
            {value === option.value && (
              <div className="w-full h-full rounded-full bg-white scale-50"></div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              {option.icon && (
                <div className={`mr-3 ${value === option.value ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {option.icon}
                </div>
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${value === option.value ? 'text-indigo-900' : 'text-gray-900'}`}>
                  {option.label}
                </p>
                {option.description && (
                  <p className={`text-xs mt-1 ${value === option.value ? 'text-indigo-600' : 'text-gray-500'}`}>
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}