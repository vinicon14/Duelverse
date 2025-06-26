// src/ai/flows/oracle-rules.ts
'use server';
/**
 * @fileOverview A Yu-Gi-Oh! rules oracle AI agent.
 *
 * - askOracle - A function that asks the oracle about a Yu-Gi-Oh! rule.
 * - AskOracleInput - The input type for the askOracle function.
 * - AskOracleOutput - The return type for the askOracle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AskOracleInputSchema = z.object({
  ruleQuestion: z.string().describe('The question about a Yu-Gi-Oh! rule.'),
});
export type AskOracleInput = z.infer<typeof AskOracleInputSchema>;

const AskOracleOutputSchema = z.object({
  ruleAnswer: z.string().describe('The answer to the question about the Yu-Gi-Oh! rule.'),
});
export type AskOracleOutput = z.infer<typeof AskOracleOutputSchema>;

export async function askOracle(input: AskOracleInput): Promise<AskOracleOutput> {
  return askOracleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'askOraclePrompt',
  input: {schema: AskOracleInputSchema},
  output: {schema: AskOracleOutputSchema},
  prompt: `You are an expert Yu-Gi-Oh! judge, skilled in all aspects of the Yu-Gi-Oh! TCG rules.

  A player has the following question about a rule:
  {{ruleQuestion}}

  Answer the question clearly and concisely, citing the relevant sections of the rulebook if possible.`,
});

const askOracleFlow = ai.defineFlow(
  {
    name: 'askOracleFlow',
    inputSchema: AskOracleInputSchema,
    outputSchema: AskOracleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
