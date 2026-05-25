import { useState } from 'react';
import { ProcessingStatus } from './types';
import Uploader from './components/Uploader';
import Player from './components/Player';
import { Headphones } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [vttContent, setVttContent] = useState<string | null>(null);
  const [chaptersVtt, setChaptersVtt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
       setErrorMessage("Invalid file format. Please upload an MP3.");
       return;
    }
    if (file.size > 25 * 1024 * 1024) {
       setErrorMessage("File exceeds the 25MB limit.");
       return;
    }

    setErrorMessage(null);
    setStatus('uploading');
    
    const localAudioUrl = URL.createObjectURL(file);
    setAudioUrl(localAudioUrl);

    const formData = new FormData();
    formData.append('audio', file);

    try {
      setStatus('transcribing');
      const response = await fetch('/api/generate-subtitles', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin', // Try to ensure cookies are sent if needed
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const responseText = await response.text();
      
      // If we received HTML (like the Auth proxy Cookie Check page), throw an error so it doesn't get rendered as subtitles
      if (responseText.toLowerCase().includes('<!doctype html>')) {
         if (responseText.includes('Cookie check')) {
             throw new Error("Authentication missing. The server returned a security check page. Try opening the app in a new tab.");
         }
         throw new Error("Invalid response from server. Expected JSON containing subtitles.");
      }
      
      const data = JSON.parse(responseText);

      if (!data.subtitles || !data.subtitles.trim().startsWith('WEBVTT')) {
         throw new Error("Invalid response format. Expected WebVTT subtitles.");
      }
      
      setVttContent(data.subtitles);
      setChaptersVtt(data.chapters || null);
      setStatus('ready');

    } catch (error: any) {
      console.error("Transcription error:", error?.message || error);
      setErrorMessage(error?.message || "Subtitle engine unavailable. Playing audio only.");
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setAudioUrl(null);
    setVttContent(null);
    setChaptersVtt(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans">
      <header className="border-b border-neutral-800 bg-neutral-900/50 p-6 flex items-center justify-between">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                 <Headphones className="w-5 h-5" />
             </div>
             <div>
                <h1 className="text-xl font-medium tracking-tight text-white">Vidstack Audio Captioner</h1>
                <p className="text-xs text-neutral-400 mt-0.5 font-medium">Whisper Transcription Pipeline</p>
             </div>
         </div>
         {audioUrl && (
             <button 
                onClick={handleReset}
                className="text-sm px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors rounded-lg font-medium"
             >
                Start Over
             </button>
         )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto p-6 md:p-12 flex flex-col gap-8 w-full">
         {!audioUrl ? (
            <Uploader onUpload={handleUpload} status={status} errorMessage={errorMessage} />
         ) : (
            <Player 
              audioUrl={audioUrl} 
              vttContent={vttContent}
              chaptersVtt={chaptersVtt}
              status={status} 
              errorMessage={errorMessage}
            />
         )}
      </main>
    </div>
  );
}
