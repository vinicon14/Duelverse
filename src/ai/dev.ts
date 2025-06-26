
import { config } from 'dotenv';
config();

import '@/ai/flows/oracle-rules.ts';
import '@/ai/flows/card-info-flow.ts';
import '@/ai/flows/yugioh-quiz-flow.ts'; // Added new quiz flow
