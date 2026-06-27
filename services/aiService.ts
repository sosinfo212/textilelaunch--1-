import { aiAPI } from '../src/utils/api';
import { ProductAttribute } from '../types';

/** Format size/color/etc. variations for the LLM prompt. */
export function formatVariationsForPrompt(attributes: ProductAttribute[]): string {
  if (!attributes?.length) return 'Aucune variation définie.';
  return attributes
    .map((a) => `- ${a.name}: ${a.options.join(', ')}`)
    .join('\n');
}

/** Include attribute being edited in the form but not yet saved to the list. */
export function mergeAttributesForPrompt(
  attributes: ProductAttribute[],
  newAttrName?: string,
  newAttrOptions?: string,
  editIndex?: number | null
): ProductAttribute[] {
  const merged = [...attributes];
  const name = newAttrName?.trim();
  const options = (newAttrOptions || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!name || options.length === 0) return merged;
  if (editIndex != null && editIndex >= 0) {
    merged[editIndex] = { name, options };
  } else {
    merged.push({ name, options });
  }
  return merged;
}

/** Strip markdown code fences and keep HTML-only output from the LLM. */
export function normalizeGeneratedHtml(raw: string): string {
  let text = raw.trim();
  const fenceMatch = text.match(/^```(?:html)?\s*([\s\S]*?)```$/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }
  // Remove accidental markdown fences inside response
  text = text.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
  return text;
}

const HTML_DESCRIPTION_PROMPT = (
  productName: string,
  keywords: string,
  variationsText: string
) => `
Tu es un expert en marketing e-commerce pour une marque de vêtements et textile.

Rédige une description produit vendeuse en arabe darija pour : "${productName}".
Mots-clés / caractéristiques : ${keywords}.

Variations du produit (tailles, couleurs, etc.) :
${variationsText}

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec du HTML valide (pas de markdown, pas de texte avant/après).
- Structure en sections avec des balises sémantiques.
- Mentionne les variations disponibles (tailles, couleurs…) dans le contenu, surtout dans la section détails.
- Utilise exactement cette structure (adapte le contenu au produit) :

<section class="product-description">
  <section class="product-intro">
    <h2>Titre accrocheur du produit</h2>
    <p>Paragraphe d'introduction vendeur (2-3 phrases).</p>
  </section>
  <section class="product-benefits">
    <h3>Pourquoi vous allez l'adorer</h3>
    <ul>
      <li>Bénéfice 1</li>
      <li>Bénéfice 2</li>
      <li>Bénéfice 3</li>
    </ul>
  </section>
  <section class="product-details">
    <h3>Détails &amp; qualité</h3>
    <p>Paragraphe sur les matériaux, le confort ou l'usage.</p>
    <p>Mentionne les variations : tailles, couleurs ou autres options listées ci-dessus.</p>
  </section>
</section>

- Ton professionnel et chaleureux. Émojis avec parcimonie (dans le texte uniquement).
- Pas de balises <html>, <head> ou <body>. Uniquement les <section> et leur contenu.
`;

export const generateProductDescription = async (
  productName: string,
  keywords: string,
  model?: string,
  attributes: ProductAttribute[] = []
): Promise<string> => {
  try {
    const variationsText = formatVariationsForPrompt(attributes);
    const prompt = HTML_DESCRIPTION_PROMPT(productName, keywords, variationsText);
    const response = await aiAPI.generate(prompt, productName, keywords, model);
    const text = normalizeGeneratedHtml(response.text?.trim() || '');
    return text || 'Impossible de générer la description.';
  } catch (error: unknown) {
    console.error('Error generating description:', error);
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('OpenRouter non configuré')) {
      return '❌ OpenRouter non configuré sur le serveur. Contactez l’administrateur.';
    }
    if (message.includes('non configurée') || message.includes('not configured')) {
      return '❌ Clé API OpenRouter non configurée. Ajoutez-la dans Paramètres → API.';
    }
    if (message.toLowerCase().includes('invalid') || message.includes('401')) {
      return '❌ Clé API OpenRouter invalide. Vérifiez-la dans Paramètres → API.';
    }
    if (message.toLowerCase().includes('credit') || message.includes('402')) {
      return '❌ Crédits OpenRouter insuffisants.';
    }
    if (message) {
      return `❌ Erreur: ${message}`;
    }

    return 'Une erreur est survenue lors de la génération. Vérifiez OpenRouter dans Paramètres → API.';
  }
};
