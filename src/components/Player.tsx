import { MediaPlayer, MediaProvider, Track } from '@vidstack/react';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/audio.css';
import { DefaultAudioLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import { ProcessingStatus } from '../types';
import { Loader2, CheckCircle2, AlertTriangle, FileAudio, FileText, List } from 'lucide-react';
import TranscriptViewer from './TranscriptViewer';

interface PlayerProps {
  audioUrl: string;
  vttContent: string | null;
  chaptersVtt: string | null;
  status: ProcessingStatus;
  errorMessage: string | null;
}

export default function Player({ audioUrl, vttContent, chaptersVtt, status, errorMessage }: PlayerProps) {
  return (
    <div className="w-full flex flex-col mt-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-8">
            
            <div className="flex border-b border-neutral-800 pb-8 items-start justify-between gap-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-400">
                        <FileAudio className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-medium text-lg text-white">Audio Playback</h3>
                        <div className="flex items-center gap-2 mt-1">
                           <StatusIndicator status={status} />
                        </div>
                    </div>
                 </div>
            </div>

            {errorMessage && status === 'error' && (
                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-4 rounded-xl flex items-start gap-3 text-sm">
                   <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                   <p>{errorMessage}</p>
                </div>
            )}

            <div className="w-full bg-neutral-950 rounded-2xl overflow-hidden ring-1 ring-white/5 shadow-inner">
                {/* 
                  Vidstack uses a unified player. 
                  We map the WebVTT url directly into the tracks prop.
                */}
                <MediaPlayer 
                   src={audioUrl} 
                   className="w-full"
                >
                    <MediaProvider />
                    <DefaultAudioLayout icons={defaultLayoutIcons} />
                </MediaPlayer>
            </div>

            {vttContent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <TranscriptViewer title="Full Transcript" icon={<FileText className="w-5 h-5" />} vttContent={vttContent} filename="subtitles.vtt" />
                {chaptersVtt && (
                  <TranscriptViewer title="Chapters" icon={<List className="w-5 h-5" />} vttContent={chaptersVtt} filename="chapters.vtt" />
                )}
              </div>
            )}
        </div>
    </div>
  );
}

function StatusIndicator({ status }: { status: ProcessingStatus }) {
    if (status === 'uploading') {
        return (
            <div className="flex items-center gap-1.5 text-indigo-400 text-sm font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading stream...</span>
            </div>
        );
    }
    if (status === 'transcribing') {
        return (
            <div className="flex items-center gap-1.5 text-amber-400 text-sm font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Whisper AI processing...</span>
            </div>
        );
    }
    if (status === 'ready') {
        return (
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Transcription ready</span>
            </div>
        );
    }
    if (status === 'error') {
        return (
             <div className="flex items-center gap-1.5 text-orange-400 text-sm font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Engine degraded (Audio only)</span>
            </div>
        );
    }
    return null;
}
