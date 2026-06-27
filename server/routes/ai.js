import express from 'express';
import { db } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

async function getAiSettings(userId) {
  try {
    const [rows] = await db.execute(
      'SELECT openrouter_api_key, llm_model FROM app_settings WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (rows.length === 0) return { apiKey: null, model: DEFAULT_MODEL };
    return {
      apiKey: rows[0].openrouter_api_key?.trim() || null,
      model: rows[0].llm_model?.trim() || DEFAULT_MODEL,
    };
  } catch (e) {
    if (e.code === 'ER_BAD_FIELD_ERROR') {
      return { apiKey: null, model: DEFAULT_MODEL, columnsMissing: true };
    }
    throw e;
  }
}

async function generateWithOpenRouter(apiKey, model, prompt) {
  const siteUrl = (process.env.FRONTEND_URL || 'https://trendycosmetix.com').replace(/\/$/, '');
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': siteUrl,
      'X-Title': 'TextileLaunch',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error?.message || data?.error || response.statusText || 'OpenRouter request failed';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text || !String(text).trim()) {
    throw new Error('Empty response from OpenRouter');
  }
  return String(text).trim();
}

router.post('/generate', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { prompt, productName, keywords, model: bodyModel } = req.body || {};
    const { apiKey, model: storedModel, columnsMissing } = await getAiSettings(userId);

    if (columnsMissing) {
      return res.status(503).json({
        error: 'OpenRouter non configuré. Exécutez database/add-openrouter-columns.sql sur la base.',
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'Clé API OpenRouter non configurée. Ajoutez-la dans Paramètres → API.',
      });
    }

    const model = (bodyModel && String(bodyModel).trim()) || storedModel || DEFAULT_MODEL;

    const fullPrompt = prompt ||
      `Génère une description produit en HTML (sections <section>) en français pour "${productName}".
Mots-clés: ${keywords || 'textile, mode, confort, qualité'}.
Réponds uniquement avec du HTML valide, sans markdown.`;

    const text = await generateWithOpenRouter(apiKey, model, fullPrompt);
    res.json({ text, model });
  } catch (error) {
    console.error('OpenRouter API error:', error);
    let errorMessage = 'Échec de la génération';
    if (error.message?.includes('401') || error.message?.toLowerCase().includes('unauthorized')) {
      errorMessage = 'Clé API OpenRouter invalide. Vérifiez-la dans Paramètres → API.';
    } else if (error.message?.includes('402') || error.message?.toLowerCase().includes('credit')) {
      errorMessage = 'Crédits OpenRouter insuffisants. Rechargez votre compte OpenRouter.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
