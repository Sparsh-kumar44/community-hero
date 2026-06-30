const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { analyzeImage, validateImage, generateChatResponse, processSpeechTranscript, generatePredictiveInsights } = require('../services/gemini');
const { generateCaption } = require('../services/huggingface');
const { db } = require('../config');

// Setup file upload handling
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ 
  dest: uploadDir,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

/**
 * AI Endpoint: Analyze uploaded image + description
 * Pipeline: Gemini Validation → HuggingFace Caption → Gemini Intelligence
 */
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  let filePath = null;
  try {
    const file = req.file;
    const { description } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No image file uploaded." });
    }

    filePath = file.path;
    const fileBuffer = fs.readFileSync(file.path);
    const mimeType = file.mimetype;

    // Step 1: Validate image with Gemini Vision
    const validation = await validateImage(fileBuffer, mimeType);
    if (!validation.valid) {
      fs.unlinkSync(file.path);
      return res.status(422).json({
        error: `Image rejected: ${validation.reason}`,
        validationFailed: true
      });
    }

    // Step 2: Generate caption with Hugging Face
    const hfResult = await generateCaption(fileBuffer, mimeType);
    const caption = hfResult.caption || '';

    // Step 3: Get structured analysis from Gemini
    const analysis = await analyzeImage(fileBuffer, mimeType, caption, description || '', file.originalname || '');

    // Clean up temp file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    // Return combined result
    res.json({
      ...analysis,
      caption,                          // From HuggingFace
      detectedObjects: hfResult.detectedObjects || '',
      summary: analysis.summary || caption
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    console.error("🔴 AI Image analysis route failed:", error);
    res.status(500).json({ error: error.message || "Failed to analyze image." });
  }
});

/**
 * AI Endpoint: Civic Assistant chatbot
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message content is required." });
    }
    const reply = await generateChatResponse(message, history || []);
    res.json({ reply });
  } catch (error) {
    console.error("🔴 AI Chat route failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response." });
  }
});

/**
 * AI Endpoint: Process speech-to-text transcript
 */
router.post('/speech-to-report', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: "Transcript is required." });
    }
    const reportParams = await processSpeechTranscript(transcript);
    res.json(reportParams);
  } catch (error) {
    console.error("🔴 AI Speech-to-Report route failed:", error);
    res.status(500).json({ error: error.message || "Failed to parse speech transcript." });
  }
});

/**
 * AI Endpoint: Generate predictive insights
 */
router.get('/predictive-insights', async (req, res) => {
  try {
    const reports = await db.getReports();
    const insights = await generatePredictiveInsights(reports);
    res.json(insights);
  } catch (error) {
    console.error("🔴 AI Predictive Insights route failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate predictive insights." });
  }
});

module.exports = router;
