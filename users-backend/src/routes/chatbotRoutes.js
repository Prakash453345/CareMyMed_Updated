const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const { streamPoCResponse } = require('../services/aiChatbotPoC');
const { authenticate } = require('../middleware/authenticate');
const {
  aiChatRateLimiter,
  aiChatIpRateLimiter,
  aiChatPatientRateLimiter,
  aiChatSessionRateLimiter,
} = require('../middleware/rateLimiter');
const AuditLog = require('../models/AuditLog');
const emergencyConfig = require('../config/emergency_phrases.json');
const AIChatSession = require('../models/AIChatSession');

const PYTHON_API = process.env.PYTHON_API || null;

// Configure Multer for in-memory storage and strict filtering (audio + image attachments)
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedAudio = [
      'audio/m4a',
      'audio/mp4',
      'audio/mpeg',
      'audio/webm',
      'audio/x-m4a',
      'audio/aac',
      'audio/wav',
      'audio/x-wav',
      'audio/3gp',
      'audio/caf',
      'application/octet-stream',
    ];
    const allowedImages = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (allowedAudio.includes(file.mimetype) || allowedImages.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed: audio (m4a, mp3, aac) and images (jpeg, png, webp).`
        )
      );
    }
  },
  storage: multer.memoryStorage(),
});

// Helper to standardize errors
function buildErrorResponse(stage, errorMsg) {
  return {
    success: false,
    stage: stage,
    error: errorMsg,
  };
}

// Helper to resolve patient ID for a request
async function getPatientId(req, bodyPatientId) {
  if (req.auth?.userType === 'Patient') {
    return req.auth.userId;
  }
  if (req.auth?.userType === 'Companion') {
    let resolvedPatientId = bodyPatientId || req.query.patientId;
    if (!resolvedPatientId) {
      const CompanionAccess = require('../models/CompanionAccess');
      const access = await CompanionAccess.findOne({
        companion_id: req.auth.userId,
        is_active: true,
        status: 'accepted',
      });
      if (access) {
        resolvedPatientId = access.patient_id;
      }
    }
    return resolvedPatientId;
  }
  return null;
}

/**
 * GET /api/chatbot/sessions
 * List active sessions for the patient (sorted by updatedAt desc)
 */
router.get(
  '/sessions',
  authenticate,
  aiChatSessionRateLimiter,
  async (req, res) => {
    try {
      const patientId = await getPatientId(req);
      if (!patientId) {
        return res.status(400).json({ error: 'Patient context not found.' });
      }

      const sessions = await AIChatSession.find({
        patient_id: patientId,
        is_active: true,
      })
        .select('-messages')
        .sort({ updated_at: -1 });

      res.json(sessions);
    } catch (err) {
      console.error('[ChatbotRoutes] Get sessions error:', err);
      res.status(500).json({ error: 'Failed to fetch chat sessions.' });
    }
  }
);

/**
 * POST /api/chatbot/sessions
 * Create a new chat session (limit 10 concurrent active sessions)
 */
router.post(
  '/sessions',
  authenticate,
  aiChatSessionRateLimiter,
  async (req, res) => {
    try {
      const patientId = await getPatientId(req, req.body.patientId);
      if (!patientId) {
        return res.status(400).json({ error: 'Patient context not found.' });
      }

      const activeCount = await AIChatSession.countDocuments({
        patient_id: patientId,
        is_active: true,
      });
      if (activeCount >= 10) {
        return res.status(400).json({
          error:
            'Limit reached: You can have at most 10 active chats. Please delete some chats first.',
        });
      }

      const disclaimer = {
        role: 'assistant',
        text: 'CareMyMed AI provides educational guidance and assistance. It does not replace a licensed medical professional. For emergencies, contact emergency services or your healthcare provider immediately.',
        timestamp: new Date(),
      };

      const newSession = await AIChatSession.create({
        patient_id: patientId,
        title: 'New Chat',
        is_active: true,
        is_generating: false,
        message_count: 1,
        messages: [disclaimer],
      });

      res.status(201).json(newSession);
    } catch (err) {
      console.error('[ChatbotRoutes] Create session error:', err);
      res.status(500).json({ error: 'Failed to create chat session.' });
    }
  }
);

/**
 * GET /api/chatbot/sessions/:id
 * Get details of a single session
 */
router.get('/sessions/:id', authenticate, async (req, res) => {
  try {
    const patientId = await getPatientId(req);
    if (!patientId) {
      return res.status(400).json({ error: 'Patient context not found.' });
    }

    const session = await AIChatSession.findOne({
      _id: req.params.id,
      patient_id: patientId,
      is_active: true,
    });
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found.' });
    }

    res.json(session);
  } catch (err) {
    console.error('[ChatbotRoutes] Get session details error:', err);
    res.status(500).json({ error: 'Failed to fetch chat session details.' });
  }
});

/**
 * DELETE /api/chatbot/sessions/:id
 * Soft delete a chat session
 */
router.delete(
  '/sessions/:id',
  authenticate,
  aiChatSessionRateLimiter,
  async (req, res) => {
    try {
      const patientId = await getPatientId(req);
      if (!patientId) {
        return res.status(400).json({ error: 'Patient context not found.' });
      }

      const result = await AIChatSession.updateOne(
        { _id: req.params.id, patient_id: patientId, is_active: true },
        { $set: { is_active: false } }
      );

      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ error: 'Chat session not found or already deleted.' });
      }

      res.json({
        success: true,
        message: 'Chat session deleted successfully.',
      });
    } catch (err) {
      console.error('[ChatbotRoutes] Delete session error:', err);
      res.status(500).json({ error: 'Failed to delete chat session.' });
    }
  }
);

/**
 * POST /api/chatbot/chat
 * SSE Streaming endpoint.
 * Accepts multipart/form-data.
 * - If `audio` is provided, proxies it to Python for transcription, then streams RAG.
 * - If `query` text is provided, streams RAG directly.
 *
 * SSE Event Types:
 *   { type: "meta",        transcribedText: "..." }     — STT result (audio only)
 *   { type: "chunk",       text: "..." }                 — Token-by-token AI response
 *   { type: "suggestions", items: ["...", "...", "..."] } — Follow-up suggestion chips
 *   { type: "done" }                                      — Stream complete
 *   { type: "error",       message: "..." }               — Error during stream
 */
router.post(
  '/chat',
  authenticate,
  aiChatRateLimiter,
  aiChatIpRateLimiter,
  aiChatPatientRateLimiter,
  upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'image', maxCount: 1 }]),
  async (req, res) => {
    let patientId = null;
    let sessionId = req.body.sessionId;

    try {
      const { targetLanguage, query, audioDuration, patientId: bodyPatientId } = req.body;

      // Securely resolve patient context
      patientId = await getPatientId(req, bodyPatientId);

      if (!patientId) {
        return res
          .status(401)
          .json(
            buildErrorResponse(
              'validation',
              'User is not fully authenticated or profile is missing.'
            )
          );
      }

      const audioFile = req.files?.audio?.[0] || (req.file?.fieldname === 'audio' ? req.file : null);
      const imageFile = req.files?.image?.[0] || (req.file?.fieldname === 'image' ? req.file : null);

      let extractedQuery = (query || '').trim();
      let transcribedText = null;

      // 1. Audio Proxy Phase (STT) — runs BEFORE we open the SSE stream
      if (audioFile) {
        console.log(
          `[ChatbotRoute] Received audio file: ${audioFile.originalname} (${audioFile.mimetype}, ${audioFile.size || 0} bytes)`
        );

        let audioTranscriptionSuccess = false;

        // 1a. Attempt primary Python STT Service if PYTHON_API is explicitly configured
        if (PYTHON_API) {
          try {
            const internalForm = new FormData();
            internalForm.append('audio_file', audioFile.buffer, {
              filename: audioFile.originalname || 'voice_note.m4a',
              contentType: audioFile.mimetype || 'audio/m4a',
            });

            console.log(`[ChatbotRoute] Proxying audio to Python STT Service (${PYTHON_API})...`);
            const sttResponse = await axios.post(
              `${PYTHON_API}/analyze-audio`,
              internalForm,
              {
                headers: { ...internalForm.getHeaders() },
                timeout: 10000,
              }
            );

            if (
              sttResponse.data &&
              sttResponse.data.success &&
              sttResponse.data.text
            ) {
              transcribedText = sttResponse.data.text.trim();
              audioTranscriptionSuccess = true;
              console.log(`[ChatbotRoute] Python STT Success: "${transcribedText}"`);
            }
          } catch (sttError) {
            console.warn(`[ChatbotRoute] Python STT Proxy Error:`, sttError.message);
          }
        }

        // 1b. Fallback to Groq Whisper STT API if Python STT is offline or failed
        if (!audioTranscriptionSuccess && process.env.GROQ_API_KEY) {
          try {
            console.log(`[ChatbotRoute] Fallback to Groq Whisper STT API...`);
            const groqForm = new FormData();
            groqForm.append('file', audioFile.buffer, {
              filename: 'voice_note.m4a',
              contentType: 'audio/m4a',
            });
            groqForm.append('model', 'whisper-large-v3-turbo');

            const groqRes = await axios.post(
              'https://api.groq.com/openai/v1/audio/transcriptions',
              groqForm,
              {
                headers: {
                  ...groqForm.getHeaders(),
                  Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                },
                timeout: 25000,
              }
            );

            if (groqRes.data && groqRes.data.text) {
              transcribedText = groqRes.data.text.trim();
              audioTranscriptionSuccess = true;
              console.log(`[ChatbotRoute] Groq Whisper STT Success: "${transcribedText}"`);
            }
          } catch (groqErr) {
            console.error(`[ChatbotRoute] Groq Whisper STT Fallback Error:`, groqErr.message);
          }
        }

        // Combine text query & audio transcription safely
        if (transcribedText) {
          if (extractedQuery) {
            extractedQuery = `${extractedQuery}\n[Voice Note Transcribed: "${transcribedText}"]`;
          } else {
            extractedQuery = transcribedText;
          }
        } else if (!extractedQuery) {
          // Both STT failed AND user provided no text query
          return res
            .status(500)
            .json(
              buildErrorResponse(
                'transcription',
                'Could not understand audio or STT service is down.'
              )
            );
        } else {
          console.log(
            `[ChatbotRoute] Audio STT unavailable/failed, but user text query provided: "${extractedQuery}". Proceeding with text query.`
          );
        }
      }

      // 2. Vision AI / Image Attachment Phase
      if (imageFile) {
        console.log(
          `[ChatbotRoute] Received medical image attachment: ${imageFile.originalname} (${imageFile.mimetype}, ${imageFile.size} bytes)`
        );

        let visionContextText = '';
        let docClassification = 'General Medical Document';

        if (PYTHON_API) {
          try {
            // Attempt to proxy to Python Vision AI endpoint
            const visionForm = new FormData();
            visionForm.append('image_file', imageFile.buffer, {
              filename: imageFile.originalname || 'medical_image.jpg',
              contentType: imageFile.mimetype,
            });

            console.log(`[ChatbotRoute] Proxying image to Python Vision AI Service...`);
            const visionRes = await axios.post(
              `${PYTHON_API}/analyze-vision`,
              visionForm,
              {
                headers: { ...visionForm.getHeaders() },
                timeout: 15000,
              }
            );

            if (visionRes.data && visionRes.data.extractedText) {
              visionContextText = visionRes.data.extractedText;
              docClassification = visionRes.data.classification || docClassification;
            }
          } catch (visionErr) {
            console.warn(`[ChatbotRoute] Python Vision service offline/fallback:`, visionErr.message);
            visionContextText = `Medical image uploaded (${imageFile.originalname}).`;
          }
        } else {
          visionContextText = `Medical image uploaded (${imageFile.originalname}).`;
        }

        const userCaption = extractedQuery;
        const structuredContext = [
          `[SYSTEM: ATTACHED MEDICAL DOCUMENT]`,
          `Document Classification: ${docClassification}`,
          `Extracted Information:\n${visionContextText}`,
          `User Caption / Question: ${userCaption || 'Please analyze this medical document and explain its key details.'}`
        ].join('\n\n');

        extractedQuery = structuredContext;
      }

      // 3. Validate query
      if (!extractedQuery) {
        return res
          .status(400)
          .json(
            buildErrorResponse(
              'validation',
              'Neither audio, image, nor text query was provided.'
            )
          );
      }

      // Query length check (anti-abuse)
      if (extractedQuery.length > 1000) {
        return res
          .status(400)
          .json(
            buildErrorResponse(
              'validation',
              'Query exceeds the limit of 1000 characters.'
            )
          );
      }

      // Server-Side Emergency Filter
      const lowercaseQuery = extractedQuery.toLowerCase();
      const matchedPhrase = emergencyConfig.emergency_phrases.find((phrase) =>
        lowercaseQuery.includes(phrase)
      );
      if (matchedPhrase) {
        console.warn(
          `[ChatbotRoute] Emergency detected (matched phrase: "${matchedPhrase}"). Intercepting and alerting.`
        );

        // Log security and safety incident to AuditLog
        try {
          const mongoose = require('mongoose');
          await AuditLog.createLog({
            supabaseUid: req.auth?.userId || 'unknown_patient',
            action: 'emergency_warning_triggered',
            resourceType: 'patient',
            resourceId: patientId
              ? new mongoose.Types.ObjectId(patientId)
              : undefined,
            outcome: 'success',
            dataClassification: 'restricted',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            details: {
              query: extractedQuery,
              matchedPhrase,
            },
          });
        } catch (auditError) {
          console.error(
            '[ChatbotRoute] Failed to write emergency audit log:',
            auditError.message
          );
        }

        // Immediately start SSE and write emergency response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        if (transcribedText) {
          res.write(
            `data: ${JSON.stringify({ type: 'meta', transcribedText })}\n\n`
          );
        }

        const warningMsg =
          '🚨 **Emergency Alert**\n\nIf you are experiencing severe symptoms like **chest pain, severe dizziness, loss of consciousness, fainting, stroke symptoms, seizure, uncontrolled bleeding, difficulty breathing, or a hypertensive crisis**, please call emergency services immediately.\n\nOur CareMyMed coordinators are dedicated to regular health check-ins and care plans, but **they are not emergency first responders**.';
        res.write(
          `data: ${JSON.stringify({ type: 'chunk', text: warningMsg })}\n\n`
        );
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
        return;
      }

      // 3. Resolve Session history and Concurrency lock
      let historyMessages = [];
      if (sessionId) {
        const session = await AIChatSession.findOne({
          _id: sessionId,
          patient_id: patientId,
          is_active: true,
        });
        if (!session) {
          return res
            .status(404)
            .json(buildErrorResponse('validation', 'Chat session not found.'));
        }
        if (session.is_generating) {
          return res
            .status(409)
            .json(
              buildErrorResponse(
                'concurrency',
                'Please wait for the current response to finish before sending another message.'
              )
            );
        }

        // Apply lock
        session.is_generating = true;
        await session.save();

        // Load last 10 messages for memory (excluding system disclaimers if needed, but we pass all)
        const lastMessages = session.messages.slice(-10);
        historyMessages = lastMessages.map((m) => ({
          role: m.role,
          content: m.text,
        }));

        // Append user query to database
        session.messages.push({
          role: 'user',
          text: extractedQuery,
          audioDuration: audioDuration ? Number(audioDuration) : undefined,
          timestamp: new Date(),
        });

        // Auto-generate title from first message if it's default 'New Chat'
        if (session.title === 'New Chat') {
          session.title =
            extractedQuery.substring(0, 40) +
            (extractedQuery.length > 40 ? '...' : '');
        }

        session.message_count = session.messages.length;
        await session.save();
      }

      console.log(
        `[ChatbotRoute] Streaming RAG pipeline for query: "${extractedQuery}"`
      );

      // 4. Set SSE headers and begin streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if behind proxy
      res.flushHeaders();

      // Handle client disconnect (abort / cancellation)
      let clientDisconnected = false;
      res.on('close', () => {
        clientDisconnected = true;
        console.log('[ChatbotRoute] Client disconnected, aborting stream.');
      });

      // 5. Stream the response
      await streamPoCResponse(
        patientId,
        extractedQuery,
        targetLanguage,
        res,
        transcribedText,
        sessionId,
        historyMessages
      );

      // 6. Close the SSE stream
      if (!clientDisconnected) {
        res.end();
      }
    } catch (error) {
      console.error('Chatbot API Error:', error);
      // If headers haven't been sent yet, send a normal JSON error
      if (!res.headersSent) {
        res
          .status(500)
          .json(
            buildErrorResponse(
              'server',
              'Internal server error during chat processing.'
            )
          );
      } else {
        // Headers already sent (SSE mode), emit error event
        try {
          res.write(
            `data: ${JSON.stringify({ type: 'error', message: 'Internal server error.' })}\n\n`
          );
          res.end();
        } catch (e) {
          // Response already closed, ignore
        }
      }
    } finally {
      // 7. Ensure Lock Release
      if (sessionId && patientId) {
        try {
          await AIChatSession.updateOne(
            { _id: sessionId, patient_id: patientId },
            { $set: { is_generating: false } }
          );
        } catch (lockErr) {
          console.error(
            '[ChatbotRoute] Failed to release generating lock:',
            lockErr.message
          );
        }
      }
    }
  }
);

module.exports = router;
