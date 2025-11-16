import React, { useCallback, useState } from 'react';
import { FileIcon } from './icons';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  }, [onFileUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto text-center animate-fade-in">
      <h2 className="text-3xl font-bold text-gray-100 mb-2">Ready for Analysis</h2>
      <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
        Please provide the document for analysis. Your data is processed securely in your browser and is never stored on a server.
      </p>
      
      <label
        htmlFor="file-upload"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative block cursor-pointer group border-2 border-dashed rounded-xl p-8 transition-all duration-300 ease-in-out
          ${isDragging ? 'border-blue-500 bg-gray-800/50' : 'border-gray-600 hover:border-blue-600 hover:bg-gray-800/30'}`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-gray-800 rounded-full border border-gray-700 transition-colors group-hover:bg-gray-700">
            <FileIcon className="w-10 h-10 text-gray-400 transition-colors group-hover:text-blue-400" />
          </div>
          <p className="text-gray-400">
            <span className="font-semibold text-blue-400">Click to upload evidence</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">Supports PDF, DOCX, TXT, images, or pre-compiled .verum.bin reports.</p>
        </div>
        <input
          type="file"
          id="file-upload"
          className="absolute inset-0 w-full h-full opacity-0"
          onChange={handleFileChange}
        />
      </label>
      <div className="mt-8 text-sm text-gray-500 space-y-2">
          <p><span className="font-semibold text-gray-400">100% Stateless & On-Device:</span> No server, no storage. Your data is processed in your browser.</p>
          <p><span className="font-semibold text-gray-400">A New Category of Legal Tech:</span> Gain clarity and protection without needing an institution to interpret the facts.</p>
      </div>
    </div>
  );
};
