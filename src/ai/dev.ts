
import { config } from 'dotenv';
config();

import '@/ai/flows/parse-accounting-entry.ts';
import '@/ai/flows/suggest-ledger-tags.ts';
import '@/ai/flows/extract-accounting-data.ts';
import '@/ai/flows/chat-with-ai-assistant.ts';
import '@/ai/flows/generate-invoice-details.ts';
