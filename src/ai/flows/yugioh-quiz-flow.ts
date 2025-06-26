
'use server';
/**
 * @fileOverview A Yu-Gi-Oh! quiz question generation AI agent.
 *
 * - generateQuizQuestions - Generates a set of Yu-Gi-Oh! quiz questions.
 * - QuizQuestionInput - The input type for the generateQuizQuestions function.
 * - QuizQuestionOutput - The return type for the generateQuizQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs for questions

const QuizQuestionSchema = z.object({
  id: z.string().describe("A unique identifier for the question."),
  question: z.string().describe('The text of the quiz question.'),
  options: z.array(z.string()).length(4).describe('An array of exactly 4 answer options.'),
  correctAnswer: z.string().describe('The exact text of the correct option from the options array.'),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

const QuizInputSchema = z.object({
  numberOfQuestions: z.number().min(1).max(50).default(10)
    .describe('The number of quiz questions to generate.'),
  language: z.string().optional().describe('The language in which to generate the quiz questions (e.g., "English", "Português"). Defaults to English if not specified.'),
});
export type QuizInput = z.infer<typeof QuizInputSchema>;

const QuizOutputSchema = z.object({
  questions: z.array(QuizQuestionSchema).describe('An array of generated quiz questions.'),
});
export type QuizOutput = z.infer<typeof QuizOutputSchema>;

export async function generateQuizQuestions(input: QuizInput): Promise<QuizOutput> {
  const result = await yugiohQuizFlow(input);
  // Ensure each question has a unique ID if not provided by AI (though schema asks AI for it)
  const questionsWithIds = result.questions.map(q => ({
    ...q,
    id: q.id || uuidv4(),
  }));
  return { questions: questionsWithIds };
}

const prompt = ai.definePrompt({
  name: 'yugiohQuizPrompt',
  input: {schema: QuizInputSchema},
  output: {schema: QuizOutputSchema},
  prompt: `You are a Yu-Gi-Oh! Quiz Master.
{{#if language}}
Generate {{{numberOfQuestions}}} unique and challenging multiple-choice quiz questions about Yu-Gi-Oh! TCG rules, card effects, game mechanics, or significant card lore, in the language: {{{language}}}.
{{else}}
Generate {{{numberOfQuestions}}} unique and challenging multiple-choice quiz questions about Yu-Gi-Oh! TCG rules, card effects, game mechanics, or significant card lore, in English.
{{/if}}

Each question must have:
- A unique "id" string for the question.
- The "question" text.
- An array of exactly 4 string "options".
- The "correctAnswer" string, which MUST be one of the provided options.

Ensure questions cover a range of difficulty and topics to genuinely test a player's knowledge for account verification. Avoid overly obscure or trivia-based questions unless they relate to common game understanding.
Focus on questions that require understanding of game play rather than pure memorization of obscure card names or release dates.
Make sure the options are distinct and plausible, with only one unambiguously correct answer.
The generated 'id' for each question should be a unique string.
Example for one question (if language is English):
{
  "id": "q1_unique_string",
  "question": "If 'Skill Drain' is active on the field, what happens to the effects of monsters in the Graveyard?",
  "options": [
    "Their effects are negated.",
    "Their effects activate and resolve normally.",
    "Only Flip effects are negated.",
    "Their effects cannot be activated."
  ],
  "correctAnswer": "Their effects activate and resolve normally."
}
`,
});

const yugiohQuizFlow = ai.defineFlow(
  {
    name: 'yugiohQuizFlow',
    inputSchema: QuizInputSchema,
    outputSchema: QuizOutputSchema,
  },
  async (input: QuizInput) => {
    const {output} = await prompt(input);
    if (!output || !output.questions || output.questions.length === 0) {
        throw new Error("AI failed to generate quiz questions or returned an empty list.");
    }
    // Additional validation to ensure correctAnswer is one of the options
    output.questions.forEach(q => {
        if (!q.options.includes(q.correctAnswer)) {
            // Attempt to fix or log error. For now, let's throw if AI fails consistency
            console.error("AI generated a question where correctAnswer is not in options:", q);
            throw new Error(`AI consistency error: Correct answer for question "${q.question}" is not listed in its options.`);
        }
        if (!q.id) {
          q.id = uuidv4(); // Ensure ID if AI misses it
        }
    });
    return output;
  }
);

