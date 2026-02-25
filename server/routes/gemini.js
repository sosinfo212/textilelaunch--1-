import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Proxy endpoint for Gemini API
// Uses @google/genai: ai.models.generateContent() — do NOT use getGenerativeModel (removed in this SDK).
// If you see "getGenerativeModel is not a function", restart the Node server so it loads this file.
router.post('/generate', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authenticate middleware
    const { prompt, productName, keywords } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's Gemini API key from settings
    const [settings] = await db.execute(
      'SELECT gemini_api_key FROM app_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0 || !settings[0].gemini_api_key || settings[0].gemini_api_key.trim() === '') {
      return res.status(400).json({ error: 'Gemini API key not configured. Please add your API key in Settings.' });
    }

    const apiKey = settings[0].gemini_api_key.trim();
    
    // Validate API key format (should start with AIzaSy)
    if (!apiKey.startsWith('AIzaSy') || apiKey.length < 30) {
      return res.status(400).json({ error: 'Invalid Gemini API key format. API keys should start with "AIzaSy" and be at least 30 characters long.' });
    }

    // Initialize Gemini (@google/genai: use ai.models.generateContent, not getGenerativeModel)
    const ai = new GoogleGenAI({ apiKey });

    // Build the prompt
    const fullPrompt = prompt || 
      `Génère une description de produit en français pour "${productName}". 
      Mots-clés: ${keywords || 'textile, mode, confort, qualité'}. 
      La description doit être engageante, professionnelle et optimisée pour la vente.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: fullPrompt,
    });
    const text = response.text ?? '';

    res.json({ text });
  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate content';
    if (error.message && error.message.includes('API_KEY')) {
      errorMessage = 'Invalid Gemini API key. Please check your API key in Settings.';
    } else if (error.message && error.message.includes('quota')) {
      errorMessage = 'Gemini API quota exceeded. Please check your API usage.';
    } else if (error.message) {
      errorMessage = `Gemini API error: ${error.message}`;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
