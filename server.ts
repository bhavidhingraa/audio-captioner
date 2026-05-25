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

// API Route for chunking audio
app.post('/api/generate-subtitles', (req, res, next) => {
    upload.single('audio')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
             if (err.code === 'LIMIT_FILE_SIZE') {
                 return res.status(413).json({ error: 'Payload Too Large. Maximum size is 25MB.'});
             }
             return res.status(400).json({ error: err.message });
        } else if (err) {
             return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided.' });
  }

  const filePath = req.file.path;

  try {
    const openai = getOpenAIClient();

    // The transcription engine only takes a stream if using fs
    const fileStream = fs.createReadStream(filePath);
    
    // Explicitly ask for VTT
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      response_format: 'vtt',
    });

    let chaptersVtt = "";
    try {
      if (process.env.GEMINI_API_KEY) {
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
      }
    } catch (e) {
      console.error("Failed to generate chapters:", e);
    }

    // Clean up temporary file
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    res.json({ subtitles: transcription, chapters: chaptersVtt });
  } catch (error: any) {
    console.error('Transcription error:', error);
    
    // Make sure we clean up the file even if there was an error
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    res.status(500).json({ error: error.message || 'Failed to generate subtitles.' });
  }
});

// Setup Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
