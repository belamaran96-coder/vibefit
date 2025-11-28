import React, { useRef } from 'react';

interface FileUploadProps {
  label: string;
  imageSrc: string | null;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, imageSrc, onFileSelect, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      <div
        className={`relative flex-1 rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden group
          ${imageSrc ? 'border-indigo-500/50 bg-gray-900' : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
          disabled={disabled}
        />
        
        {imageSrc ? (
          <img src={imageSrc} alt="Uploaded" className="w-full h-full object-contain p-2" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <svg className="w-8 h-8 mb-2 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs">Click or Drop Image</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;