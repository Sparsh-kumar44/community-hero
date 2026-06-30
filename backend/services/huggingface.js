/**
 * Hugging Face Vision-Language Model Service
 * Uses Sparsh141/vision-language-model Gradio Space
 * ONLY responsible for image caption generation
 */
const { Client, handle_file } = require('@gradio/client');

const HF_SPACE = 'Sparsh141/vision-language-model';

/**
 * Generate a caption for an image buffer using the HF Space
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @returns {{ detectedObjects: string, caption: string, answer: string }}
 */
async function generateCaption(imageBuffer, mimeType = 'image/jpeg') {
  try {
    const app = await Client.connect(HF_SPACE);
    const blob = new Blob([imageBuffer], { type: mimeType });

    const result = await app.predict('/analyze_image', [
      handle_file(blob),
      'Describe the community issue visible in this image in detail.'
    ]);

    const [detectedObjects, caption, answer] = result.data || [];

    return {
      detectedObjects: detectedObjects || '',
      caption: caption || answer || 'Community issue requiring attention.',
      answer: answer || ''
    };
  } catch (err) {
    console.error('🔴 Hugging Face caption generation failed:', err.message);
    // Fallback caption if HF Space is down
    return {
      detectedObjects: '',
      caption: 'Community issue detected. Manual review recommended.',
      answer: ''
    };
  }
}

module.exports = { generateCaption };
