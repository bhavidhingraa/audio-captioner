import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

function findAvailablePort(startPort: number, maxAttempts = 100): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = startPort;
    let attempts = 0;

    const tryListen = () => {
      const server = app.listen(port, '0.0.0.0', () => {
        server.close(() => resolve(port));
      });
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
          attempts++;
          port++;
          tryListen();
        } else {
          reject(err);
        }
      });
    };
    tryListen();
  });
}

// Setup Multer for secure 25MB file upload handling
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory storage is not used since the OpenAI client `.createReadStream` expects a file blob or path. Let's use disk storage.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.mp3');
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
  fileFilter: (req, file, cb) => {
    // Only accept MP3 files although Whisper accepts more, but FR-001 requires MP3
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload an MP3.'));
    }
  }
});

const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is missing.");
    }
    return new OpenAI({ apiKey });
};

// Health check endpoint for Vercel
app.get('/api/health', (req, res) => {
    console.log('[DEBUG] Health check hit');
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            HAS_OPENAI_KEY: !!process.env.OPENAI_API_KEY,
            HAS_GEMINI_KEY: !!process.env.GEMINI_API_KEY,
        }
    });
});

// API Route for chunking audio
console.log('[DEBUG] Registering POST /api/generate-subtitles route');
app.post('/api/generate-subtitles', (req, res, next) => {
    console.log('[DEBUG] Request received at /api/generate-subtitles');
    console.log('[DEBUG] Headers:', JSON.stringify(req.headers));
    console.log('[DEBUG] Content-Type:', req.get('content-type'));
    upload.single('audio')(req, res, function (err) {
        console.log('[DEBUG] Multer middleware executed, err:', err);
        if (err instanceof multer.MulterError) {
             if (err.code === 'LIMIT_FILE_SIZE') {
                 console.log('[DEBUG] MulterError: FILE_TOO_LARGE');
                 return res.status(413).json({ error: 'Payload Too Large. Maximum size is 25MB.'});
             }
             console.log('[DEBUG] MulterError:', err.message);
             return res.status(400).json({ error: err.message });
        } else if (err) {
             console.log('[DEBUG] Upload error:', err.message);
             return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
  console.log('[DEBUG] Handler executing, req.file:', req.file);
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided.' });
  }

  const filePath = req.file.path;
  console.log('[DEBUG] File path:', filePath);

  try {
    const openai = getOpenAIClient();

    // The transcription engine only takes a stream if using fs
    const fileStream = fs.createReadStream(filePath);

    // Explicitly ask for VTT
    console.log('[DEBUG] Calling OpenAI transcription...');
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      response_format: 'vtt',
    });
    console.log('[DEBUG] Transcription complete, chars:', transcription.length);

    let chaptersVtt = "";
    try {
      if (process.env.GEMINI_API_KEY) {
          console.log('[DEBUG] Calling Gemini for chapters...');
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const prompt = `Based on the following WebVTT transcript, generate a WebVTT file containing logical chapters.
Format it EXACTLY like this example:
WEBVTT

00:00.000 --> 01:13.000
The Forest

01:13.000 --> 02:31.000
Camp Site

Make sure the timestamps align generally with the topics discussed in the transcript. Group things into a few logical chapters (e.g. 3-8 chapters depending on length). Just output the raw WebVTT text, no markdown blocks.

Transcript:
${transcription}`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt
          });

          chaptersVtt = response.text || "";
          chaptersVtt = chaptersVtt.replace(/```(?:vtt)?/gi, '').trim();
          console.log('[DEBUG] Gemini chapters complete, chars:', chaptersVtt.length);
      }
    } catch (e) {
      console.error("[DEBUG] Failed to generate chapters:", e);
    }

    // Clean up temporary file
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    console.log('[DEBUG] Sending response, subtitles chars:', transcription.length, 'chapters chars:', chaptersVtt.length);
    res.json({ subtitles: transcription, chapters: chaptersVtt });
  } catch (error: any) {
    console.error('[DEBUG] Transcription error:', error);

    // Make sure we clean up the file even if there was an error
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    res.status(500).json({ error: error.message || 'Failed to generate subtitles.' });
  }
});

// Setup Vite middleware for development
async function startServer() {
  console.log('[DEBUG] Starting server, NODE_ENV:', process.env.NODE_ENV);
  console.log('[DEBUG] PORT:', PORT);
  console.log('[DEBUG] OPENAI_API_KEY set:', !!process.env.OPENAI_API_KEY);
  console.log('[DEBUG] GEMINI_API_KEY set:', !!process.env.GEMINI_API_KEY);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    console.log('[DEBUG] Production mode, serving static from:', distPath);
    app.use(express.static(distPath));
    // SPA fallback must be last
    app.get('*', (req, res) => {
      console.log('[DEBUG] SPA fallback for:', req.path);
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = await findAvailablePort(Number(PORT));
  app.listen(port, '0.0.0.0', () => {
    console.log(`[DEBUG] Server running on port ${port}`);
  });
}

startServer();
