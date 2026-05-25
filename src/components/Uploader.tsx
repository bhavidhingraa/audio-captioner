import { useCallback, useRef } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { ProcessingStatus } from '../types';

interface UploaderProps {
  onUpload: (file: File) => void;
  status: ProcessingStatus;
  errorMessage: string | null;
}

export default function Uploader({ onUpload, status, errorMessage }: UploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0]);
    }
  }, [onUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
    // reset input incase same file is chosen again after error
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 flex flex-col gap-6">
        <div className="text-center space-y-2">
           <h2 className="text-3xl font-medium tracking-tight text-white">Upload Audio</h2>
           <p className="text-neutral-400">Select an MP3 file (max 25MB) to generate AI subtitles.</p>
        </div>

        {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
               <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
               <p className="text-sm font-medium">{errorMessage}</p>
            </div>
        )}

        <div 
          className="border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 bg-neutral-900/30 hover:bg-neutral-900/50 transition-all rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer group"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
           <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleChange} 
             accept="audio/mp3,audio/mpeg" 
             className="hidden" 
           />
           <div className="w-16 h-16 bg-neutral-800 group-hover:bg-indigo-500/20 text-neutral-400 group-hover:text-indigo-400 rounded-2xl flex items-center justify-center mb-4 transition-colors">
              <UploadCloud className="w-8 h-8" />
           </div>
           <p className="text-lg font-medium text-neutral-200 mb-1">Click to browse or drag file here</p>
           <p className="text-sm text-neutral-500">MP3 format up to 25MB</p>
        </div>
    </div>
  );
}
