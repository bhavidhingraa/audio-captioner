# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audio captioning pipeline using Whisper transcription and Gemini chapter generation. Single Express server serves both API and frontend.

## Commands

```bash
npm run dev      # Start development server (tsx server.ts)
npm run build    # Production build (Vite build + esbuild server bundling)
npm run start    # Run production build (node dist/server.cjs)
npm run lint     # TypeScript type checking (tsc --noEmit)
```

## Architecture

### Server (`server.ts`)
- Express handles API routes and static file serving
- `POST /api/generate-subtitles` — accepts MP3 upload, transcribes via Whisper, generates chapters via Gemini
- Multer disk storage for temp file handling (25MB limit)
- In dev: Vite middleware; In prod: serves `dist/` directory

### Frontend (`src/`)
- `App.tsx` — main orchestrator, manages upload → transcription flow
- `Uploader.tsx` — file selection with drag-and-drop
- `Player.tsx` — audio playback with Vidstack, WebVTT captions, and chapter markers
- `TranscriptViewer.tsx` — displays transcript with timestamps

### Tech Stack
- React 19 + Vite 6 (frontend)
- Express 4 + Multer (file upload + API)
- OpenAI Whisper (`whisper-1`) for transcription
- Google Gemini (`gemini-2.5-flash`) for chapter generation
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Vidstack (`@vidstack/react`) for audio player with VTT cue rendering

### Environment Variables
```
OPENAI_API_KEY      # Required for Whisper transcription
GEMINI_API_KEY      # Optional for chapter generation (falls back gracefully if missing)
PORT                # Server port (default: 3000)
```

### File Processing Flow
1. Client uploads MP3 via multipart form
2. Server saves to `uploads/` temp directory
3. Whisper transcribes to WebVTT format
4. If `GEMINI_API_KEY` set, Gemini generates chapter markers in VTT format
5. Temp file deleted after response
6. Client receives `{ subtitles: string, chapters: string }` JSON

# Response Instructions
Use caveman
