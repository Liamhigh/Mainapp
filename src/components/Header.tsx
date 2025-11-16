import React from 'react';
import { LogoIcon } from './icons';

interface HeaderProps {
    onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset }) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onReset();
    }
  };
  
  return (
    <header 
        className="flex items-center justify-between pb-4 border-b border-gray-700/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm"
        onClick={onReset}
        onKeyDown={handleKeyDown}
        title="Reset Application"
        role="button"
        tabIndex={0}
        aria-label="Verum Omnis, click to reset"
    >
      <div className="flex items-center space-x-3">
        <LogoIcon className="w-8 h-8 text-blue-500" />
        <h1 className="text-2xl font-bold tracking-wider text-gray-100 font-roboto-mono">
          Verum Omnis
        </h1>
      </div>
      <div className="hidden md:block text-sm text-gray-500 font-mono">
        Adaptive Threat Intelligence Engine
      </div>
    </header>
  );
};
