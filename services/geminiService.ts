import { geminiAPI } from '../src/utils/api';

export const generateProductDescription = async (productName: string, keywords: string, apiKey?: string): Promise<string> => {
  try {
    const prompt = `
      Tu es un expert en marketing pour une marque de vêtements.
      Rédige une description produit attrayante, courte et vendeuse (environ 3-4 phrases) pour un produit nommé "${productName}".
      Mots-clés ou caractéristiques à inclure : ${keywords}.
      Le ton doit être professionnel mais chaleureux. Utilise des émojis avec parcimonie.
      Réponds uniquement avec la description.
    `;

    const response = await geminiAPI.generate(prompt, productName, keywords);
    return response.text?.trim() || "Impossible de générer la description.";
  } catch (error: any) {
    console.error("Error generating description:", error);
    
    // Provide more specific error messages
    if (error.message && error.message.includes('API key not configured')) {
      return "❌ Clé API Gemini non configurée. Veuillez ajouter votre clé API dans Paramètres > Général.";
    } else if (error.message && error.message.includes('Invalid Gemini API key')) {
      return "❌ Clé API Gemini invalide. Veuillez vérifier votre clé API dans Paramètres > Général.";
    } else if (error.message && error.message.includes('quota')) {
      return "❌ Quota API Gemini dépassé. Veuillez vérifier votre utilisation de l'API.";
    } else if (error.message) {
      return `❌ Erreur: ${error.message}`;
    }
    
    return "Une erreur est survenue lors de la génération de la description. Vérifiez votre clé API dans les Paramètres.";
  }
};