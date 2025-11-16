
import React, { useState, useEffect } from 'react';

const analysisBrains = [
    { id: 'B1', name: 'LEGAL-FRAMEWORK', status: 'ONLINE' },
    { id: 'B2', name: 'BEHAVIORAL-ANALYSIS', status: 'ONLINE' },
    { id: 'B3', name: 'FINANCIAL-TRACE', status: 'ONLINE' },
    { id: 'B4', name: 'PATTERN-RECOGNITION', status: 'ONLINE' },
    { id: 'B5', name: 'CONTRADICTION-ENGINE', status: 'ONLINE' },
    { id: 'B6', name: 'EVIDENCE-INTEGRITY', status: 'ONLINE' },
    { id: 'B7', name: 'TIMELINE-RECONSTRUCTION', status: 'ONLINE' },
    { id: 'B8', name: 'FORENSIC-SERIALIZER', status: 'ONLINE' },
    { id: 'B9', name: 'R&D-ADAPTATION', status: 'ADAPTING TO THREATS...' },
];

const finalMessages = [
    "Synthesizing multi-brain report...",
    "Applying cryptographic seal...",
    "Finalizing actionable output...",
]

interface LoaderProps {
    fileName: string;
    message?: string | null;
}

export const Loader: React.FC<LoaderProps> = ({ fileName, message }) => {
    const [activeBrainIndex, setActiveBrainIndex] = useState(0);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [finalMessageIndex, setFinalMessageIndex] = useState(0);

    useEffect(() => {
        if (message) return; // Don't run step animation if a custom message is provided

        const brainInterval = setInterval(() => {
            setActiveBrainIndex(prev => {
                if (prev < analysisBrains.length - 1) {
                    return prev + 1;
                }
                clearInterval(brainInterval);
                setIsFinalizing(true);
                return prev;
            });
        }, 500);

        return () => clearInterval(brainInterval);
    }, [message]);
    
    useEffect(() => {
        if (!isFinalizing) return;
        
        const finalInterval = setInterval(() => {
            setFinalMessageIndex(prev => {
                if(prev < finalMessages.length - 1) {
                    return prev + 1;
                }
                clearInterval(finalInterval);
                return prev;
            });
        }, 1000);

        return () => clearInterval(finalInterval);
    }, [isFinalizing])

  return (
    <div className="flex flex-col items-center justify-center text-center mt-16 animate-fade-in">
        <div className="relative flex items-center justify-center w-24 h-24">
            <div className="absolute w-full h-full border-4 border-gray-700 rounded-full"></div>
            <div className="absolute w-full h-full border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
            <svg className="w-10 h-10 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
        </div>
        <h2 className="mt-8 text-2xl font-bold text-gray-200">
            {message ? 'Processing Report' : 'Analyzing Document'}
        </h2>
        <p className="text-gray-400 mb-4">{fileName}</p>
        <div className="mt-2 text-blue-300 font-mono w-full text-center h-5">
            {message ? (
                 <p className="animate-fade-in">{message}</p>
            ) : isFinalizing ? (
                <p key={finalMessageIndex} className="animate-fade-in-out">{finalMessages[finalMessageIndex]}</p>
            ) : (
                <p key={activeBrainIndex} className="animate-fade-in-out">
                    [BRAIN: {analysisBrains[activeBrainIndex].id}] {analysisBrains[activeBrainIndex].name} // STATUS: {analysisBrains[activeBrainIndex].status}
                </p>
            )}
        </div>
    </div>
  );
};
