import { ReactNode } from 'react';
import { Download } from 'lucide-react';

interface TranscriptViewerProps {
  vttContent: string;
  title: string;
  icon: ReactNode;
  filename: string;
}

export default function TranscriptViewer({ vttContent, title, icon, filename }: TranscriptViewerProps) {
  if (!vttContent) return null;

  const handleDownload = () => {
    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col gap-6 pt-8 border-t border-neutral-800">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                     {icon}
                 </div>
                 <h3 className="font-medium text-lg text-white">{title}</h3>
            </div>
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-lg transition-colors"
                title={`Download ${filename}`}
            >
                <Download className="w-4 h-4" />
                <span>Download</span>
            </button>
        </div>
        
        <div className="bg-neutral-950 p-6 rounded-2xl max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-sm text-neutral-300 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
            {vttContent}
        </div>
    </div>
  );
}

