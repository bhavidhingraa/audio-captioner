<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Audio Captioner

Generate captions and chapters for audio files using Whisper transcription and Gemini.

## Features

- **Audio Transcription** — Whisper-powered speech-to-text
- **Chapter Generation** — Gemini AI creates structured chapter markers
- **Export** — Download transcriptions and chapter data

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add your API keys to `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

## Run Locally

```bash
npm run dev
```

## Deploy

One-click deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bhavidhingraa/audio-captioner)

Set `GEMINI_API_KEY` and `OPENAI_API_KEY` environment variables in Vercel dashboard.