
'use server';
/**
 * @fileOverview A Yu-Gi-Oh! card information AI agent.
 *
 * - getCardInfo - A function that retrieves information about a Yu-Gi-Oh! card.
 * - CardInfoInput - The input type for the getCardInfo function.
 * - CardInfoOutput - The return type for the getCardInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CardInfoInputSchema = z.object({
  cardName: z.string().describe('The name of the Yu-Gi-Oh! card to get information about.'),
});
export type CardInfoInput = z.infer<typeof CardInfoInputSchema>;

const CardInfoOutputSchema = z.object({
  name: z.string().describe("The official name of the card."),
  type: z.string().describe("The card type (e.g., Effect Monster, Spell Card, Trap Card)."),
  attribute: z.string().optional().describe("The attribute of the monster (e.g., DARK, LIGHT), if applicable."),
  level: z.number().optional().describe("The level or rank of the monster, if applicable."),
  monsterType: z.string().optional().describe("The monster type (e.g., Spellcaster, Dragon), if applicable."),
  atk: z.number().optional().describe("The Attack points of the monster, if applicable. Should be a number or null if not applicable."),
  def: z.number().optional().describe("The Defense points of the monster, if applicable. Should be a number or null if not applicable."),
  effect: z.string().describe("The card's effect text or description."),
  visualDescription: z.string().describe("A brief description of the card's artwork or visual appearance.")
});
export type CardInfoOutput = z.infer<typeof CardInfoOutputSchema>;

export async function getCardInfo(input: CardInfoInput): Promise<CardInfoOutput> {
  return cardInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'cardInfoPrompt',
  input: {schema: CardInfoInputSchema},
  output: {schema: CardInfoOutputSchema},
  prompt: `You are an expert Yu-Gi-Oh! card oracle. A player is asking for information about a specific card.
Card Name: {{{cardName}}}

Provide the following details for this card:
- Official Name: The exact and official name of the card.
- Card Type: The specific type of card (e.g., Effect Monster, Synchro Monster, Spell Card, Continuous Trap Card).
- Attribute: If the card is a monster, its attribute (e.g., DARK, LIGHT, EARTH, WATER, FIRE, WIND, DIVINE). If not applicable, omit this field.
- Level or Rank: If the card is a monster, its Level (for Main Deck, Fusion, Synchro, Ritual monsters) or Rank (for Xyz monsters) or Link Rating (for Link monsters). If not applicable, omit this field.
- Monster Type: If the card is a monster, its type (e.g., Spellcaster, Dragon, Warrior, Fiend, etc.). If not applicable, omit this field.
- ATK: If the card is a monster, its Attack points. Provide as a number. If it has '?' or is not applicable, you may omit this field or use a special value if the schema allows, but prefer to omit.
- DEF: If the card is a monster, its Defense points. Provide as a number. If it has '?' or is not applicable, you may omit this field or use a special value if the schema allows, but prefer to omit. For Link Monsters, this field is not applicable.
- Card Effect: The full, official effect text of the card. If the card is a Normal Monster, state it's a Normal Monster and provide its flavor text if any.
- Visual Description: A brief but descriptive summary of the card's artwork.

Ensure your response strictly adheres to the requested output schema. If a field like ATK, DEF, Level, Attribute, or Monster Type is not applicable for the given card (e.g., ATK/DEF for a Spell Card), you MUST omit the field or ensure it's explicitly optional in the schema and handle it accordingly. For ATK/DEF, if they are variable (like '?'), describe this in the effect text and omit the numeric ATK/DEF fields.`,
});

const cardInfoFlow = ai.defineFlow(
  {
    name: 'cardInfoFlow',
    inputSchema: CardInfoInputSchema,
    outputSchema: CardInfoOutputSchema,
  },
  async (input: CardInfoInput) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("Failed to get card information from AI.");
    }
    // Ensure ATK/DEF are numbers or undefined, not strings like "N/A"
    if (output.atk !== undefined && typeof output.atk !== 'number') {
        output.atk = undefined;
    }
    if (output.def !== undefined && typeof output.def !== 'number') {
        output.def = undefined;
    }
    return output;
  }
);
