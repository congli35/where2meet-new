/**
 * AI Model Configuration
 * Uses Google Gemini 2.0 Flash via Vercel AI SDK
 */

import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'

// Configure Gemini model
export const textModel = google('gemini-2.5-flash')

// Re-export generateObject for convenience
export { generateObject }
