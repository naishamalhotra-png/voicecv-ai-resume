/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ========================
// CONFIG
// ========================



let aiClient: any = null;

async function getGeminiClient() {
  if (!aiClient) {
    const { GoogleGenAI } = await import("@google/genai");
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// ========================
// MIDDLEWARE
// ========================

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ========================
// DATABASE (Mongo + Memory fallback)
// ========================

const MONGODB_URI = process.env.MONGODB_URI;
let useMemoryDb = true;

const UserSchema = new mongoose.Schema({
  userId: String,
  email: String,
  name: String,
  createdAt: String,
  updatedAt: String,
});

const ResumeSchema = new mongoose.Schema({
  userId: String,
  title: String,
  resumeData: mongoose.Schema.Types.Mixed,
  atsScore: Number,
  atsAnalysis: mongoose.Schema.Types.Mixed,
  templateId: String,
  createdAt: String,
  updatedAt: String,
});

let MongoUser: any;
let MongoResume: any;

try {
  MongoUser = mongoose.model("User", UserSchema);
} catch {
  MongoUser = mongoose.model("User");
}

try {
  MongoResume = mongoose.model("Resume", ResumeSchema);
} catch {
  MongoResume = mongoose.model("Resume");
}

let memoryUsers: any[] = [];
let memoryResumes: any[] = [];

if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log("🍃 MongoDB connected");
      useMemoryDb = false;
    })
    .catch((err) => {
      console.log("⚠️ MongoDB fallback to memory:", err.message);
      useMemoryDb = true;
    });
}

// ========================
// HELPERS
// ========================

function base64ToBuffer(base64: string) {
  return Buffer.from(base64, "base64");
}

// ========================
// SARVAM STT (FIXED)
// ========================

app.post("/api/speech/transcribe", async (req, res) => {
  try {
    const { audio, languageCode } = req.body;

    if (!audio) {
      return res.status(400).json({ error: "Audio required" });
    }

    const sarvamApiKey = process.env.SARVAM_API_KEY;
    const targetLang = languageCode || "hi-IN";

    if (sarvamApiKey && sarvamApiKey.trim()) {
      console.log("🎙️ Using Sarvam STT...");

      const audioBuffer = base64ToBuffer(audio);
      const formData = new FormData();

      const blob = new Blob([audioBuffer], { type: "audio/wav" });
      formData.append("file", blob, "audio.wav");
      formData.append("language_code", targetLang);
      formData.append("model", "saarika:v2.5");

      const response = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: {
          "api-subscription-key": sarvamApiKey, // ✅ FIXED
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Sarvam STT error:", err);

        return res.status(503).json({
          error: "Speech-to-text failed",
          details: err,
        });
      }

      const data: any = await response.json();
      return res.json({ transcript: data.transcript || "" });
    }

    return res.status(400).json({
      error: "Missing SARVAM_API_KEY",
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// TRANSLATION (SAFE)
// ========================

app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text required" });
    }

    const sarvamApiKey = process.env.SARVAM_API_KEY;

    const src = sourceLanguage || "hi-IN";
    const tgt = targetLanguage || "en-IN";

    if (sarvamApiKey && sarvamApiKey.trim()) {
      const response = await fetch("https://api.sarvam.ai/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": sarvamApiKey,
        },
        body: JSON.stringify({
          input: text,
          source_language_code: src,
          target_language_code: tgt,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({
          error: "Translation failed",
          details: err,
        });
      }

      const data: any = await response.json();
      return res.json({ translatedText: data.translated_text || "" });
    }

    return res.status(400).json({ error: "Missing Sarvam API key" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// GEMINI (CONTROLLED ONLY)
// ========================

app.post("/api/resume/generate", async (req, res) => {
  try {
    

    const { input } = req.body;
    const ai = await getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: input,
    });

    res.json({ result: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// ATS (CONTROLLED)
// ========================

app.post("/api/resume/ats", async (req, res) => {
  try {
    

    const { resumeData } = req.body;
    const ai = await getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: JSON.stringify(resumeData),
    });

    res.json({ result: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// VITE START
// ========================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), "dist");
    app.use(express.static(dist));

    app.get("*", (_, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();