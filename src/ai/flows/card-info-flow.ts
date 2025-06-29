
'use server';
/**
 * @fileOverview A Yu-Gi-Oh! card information AI agent that uses AI to correct user input and fetches data and descriptions in the user's language, with robust fallbacks and translation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import axios from 'axios';

// --- Schemas ---
const CardInfoInputSchema = z.object({ cardName: z.string().describe('The name of the Yu-Gi-Oh! card to get information about.') });
export type CardInfoInput = z.infer<typeof CardInfoInputSchema>;

const CardInfoOutputSchema = z.object({
  name: z.string(), type: z.string(), attribute: z.string().optional(), level: z.number().optional(),
  monsterType: z.string().optional(), atk: z.number().optional(), def: z.number().optional(),
  effect: z.string(), visualDescription: z.string(), imageUrl: z.string().optional()
});
export type CardInfoOutput = z.infer<typeof CardInfoOutputSchema>;

// --- Helper Functions ---
const langCodeToName = (code: string): string => {
    const map: { [key: string]: string } = { 'pt': 'Portuguese', 'es': 'Spanish', 'de': 'German', 'fr': 'French', 'it': 'Italian' };
    return map[code] || 'English';
};

// --- AI Flows ---
const LanguageDetectionOutputSchema = z.object({ languageCode: z.string().length(2) });
const languageDetectionPrompt = ai.definePrompt({ name: 'languageDetectionPrompt', input: { schema: CardInfoInputSchema }, output: { schema: LanguageDetectionOutputSchema }, prompt: `Detect the primary language of the text. Respond with only the two-letter ISO 639-1 code (e.g., en, pt, es). Input: {{{cardName}}}` });
const languageDetectionFlow = ai.defineFlow({ name: 'languageDetectionFlow', inputSchema: CardInfoInputSchema, outputSchema: LanguageDetectionOutputSchema }, async (input) => (await languageDetectionPrompt(input)).output || { languageCode: 'en' });

const CorrectedNameOutputSchema = z.object({ correctedName: z.string().describe('The official English name of the card.') });
const nameCorrectionPrompt = ai.definePrompt({ name: 'nameCorrectionPrompt', input: { schema: CardInfoInputSchema }, output: { schema: CorrectedNameOutputSchema }, prompt: `You are a Yu-Gi-Oh! card name expert. A user provided a name that might be misspelled, incomplete, or in another language. Determine the single, most likely, official English card name. Return only the name. Examples: "mago negro" -> "Dark Magician", "Ocultador de efeitos" -> "Effect Veiler". Input: {{{cardName}}}` });
const nameCorrectionFlow = ai.defineFlow({ name: 'nameCorrectionFlow', inputSchema: CardInfoInputSchema, outputSchema: CorrectedNameOutputSchema }, async (input) => (await nameCorrectionPrompt(input)).output || { correctedName: input.cardName });

const VisualDescriptionOutputSchema = z.object({ visualDescription: z.string() });
const visualDescriptionPrompt = ai.definePrompt({ name: 'visualDescriptionPrompt', input: { schema: z.object({ cardName: z.string() }) }, output: { schema: VisualDescriptionOutputSchema }, prompt: `Describe the artwork of the Yu-Gi-Oh! card named {{{cardName}}}. Be brief and descriptive. Respond in English.` });
const visualDescriptionFlow = ai.defineFlow({ name: 'visualDescriptionFlow', inputSchema: z.object({ cardName: z.string() }), outputSchema: VisualDescriptionOutputSchema }, async (input) => (await visualDescriptionPrompt(input)).output || { visualDescription: "No visual description available." });

const TranslationInputSchema = z.object({ text: z.string(), targetLanguage: z.string() });
const TranslationOutputSchema = z.object({ translatedText: z.string() });
const translationPrompt = ai.definePrompt({ name: 'translationPrompt', input: { schema: TranslationInputSchema }, output: { schema: TranslationOutputSchema }, prompt: `Translate the following text into {{{targetLanguage}}}. Return only the translated text. Text: {{{text}}}` });
const translationFlow = ai.defineFlow({ name: 'translationFlow', inputSchema: TranslationInputSchema, outputSchema: TranslationOutputSchema }, async (input) => (await translationPrompt(input)).output || { translatedText: input.text });

// --- Main Function with Full Translation and Fallback ---
export async function getCardInfo(input: CardInfoInput): Promise<CardInfoOutput> {
  const [langResponse, correctedNameResponse] = await Promise.all([ languageDetectionFlow(input), nameCorrectionFlow(input) ]);
  const detectedLang = langResponse.languageCode;
  const correctedCardName = correctedNameResponse.correctedName;

  let cardDataFromApi;
  let wasFallbackNeeded = false;
  const supportedLangs = ['pt', 'fr', 'de', 'it', 'es'];
  const cardNameForApi = encodeURIComponent(correctedCardName);

  try {
    let apiUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${cardNameForApi}`;
    if (supportedLangs.includes(detectedLang)) apiUrl += `&language=${detectedLang}`;
    const response = await axios.get(apiUrl);
    if (!response.data?.data?.[0]) throw new Error("Card not found with specified language.");
    cardDataFromApi = response.data.data[0];
  } catch (error) {
    wasFallbackNeeded = true;
    try {
      const fallbackUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${cardNameForApi}`;
      const response = await axios.get(fallbackUrl);
      if (!response.data?.data?.[0]) throw new Error(`Card "${correctedCardName}" not found even in English.`);
      cardDataFromApi = response.data.data[0];
    } catch (finalError) {
      throw new Error(`Não foi possível encontrar a carta "${input.cardName}". A IA tentou corrigir para "${correctedCardName}", mas não obteve sucesso na busca.`);
    }
  }

  const englishVisualDescription = (await visualDescriptionFlow({ cardName: cardDataFromApi.name })).visualDescription;
  let effectText = cardDataFromApi.desc;
  let visualDescription = englishVisualDescription;

  if (detectedLang !== 'en' && wasFallbackNeeded) {
    const targetLanguageName = langCodeToName(detectedLang);
    console.log(`Fallback occurred. Translating texts to ${targetLanguageName}.`);
    try {
        const [effectTranslation, visualTranslation] = await Promise.all([
            translationFlow({ text: effectText, targetLanguage: targetLanguageName }),
            translationFlow({ text: englishVisualDescription, targetLanguage: targetLanguageName })
        ]);
        effectText = effectTranslation.translatedText;
        visualDescription = visualTranslation.translatedText;
    } catch (translationError) {
        console.error("Could not translate texts, falling back to English.", translationError);
    }
  } else if (detectedLang !== 'en') {
      // This handles the case where the API returns official data in the correct language, but we still need to translate the AI-generated visual description.
      const targetLanguageName = langCodeToName(detectedLang);
      try {
          const visualTranslation = await translationFlow({ text: englishVisualDescription, targetLanguage: targetLanguageName });
          visualDescription = visualTranslation.translatedText;
      } catch (translationError) {
          console.error("Could not translate visual description, falling back to English.", translationError);
      }
  }
  
  return {
    name: cardDataFromApi.name, type: cardDataFromApi.type, effect: effectText, attribute: cardDataFromApi.attribute,
    monsterType: cardDataFromApi.race, level: cardDataFromApi.level || cardDataFromApi.rank || cardDataFromApi.linkval,
    atk: cardDataFromApi.atk, def: cardDataFromApi.def, imageUrl: cardDataFromApi.card_images?.[0]?.image_url,
    visualDescription: visualDescription,
  };
}
