import { GoogleGenAI } from '@google/genai';
import {
  USER_CATEGORIES, REPLY_CATEGORIES, USER_CLASSIFIER, REPLY_CLASSIFIER,
  BALANCED_CHAT, classifierInput,
} from './prompts.js';

export class ModelError extends Error {
  constructor(code, message) { super(message); this.name = 'ModelError'; this.code = code; }
}

export function parseClassification(text, kind) {
  let value;
  try { value = JSON.parse(text); } catch { throw new ModelError('INVALID_CLASSIFICATION', 'Monitoring returned invalid JSON.'); }
  const allowed = kind === 'user' ? USER_CATEGORIES : REPLY_CATEGORIES;
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !Array.isArray(value.categories) || value.categories.some(c => !allowed.includes(c)) ||
      new Set(value.categories).size !== value.categories.length ||
      Object.keys(value).some(k => !['categories', ...(kind === 'reply' ? ['flagged'] : [])].includes(k))) {
    throw new ModelError('INVALID_CLASSIFICATION', 'Monitoring returned an unsupported classification.');
  }
  if (kind === 'reply' && (typeof value.flagged !== 'boolean' || value.flagged !== (value.categories.length > 0))) {
    throw new ModelError('INVALID_CLASSIFICATION', 'Monitoring returned inconsistent reply labels.');
  }
  return value;
}

export function safeModelError(error) {
  if (error instanceof ModelError) return error;
  const status = Number(error?.status ?? error?.statusCode);
  if (status === 429) return new ModelError('QUOTA', 'Gemini quota is exhausted or requests are too frequent. Check AI Studio and wait before retrying; do not enable paid billing.');
  if ([400, 401, 403].includes(status)) return new ModelError('ACCESS', 'Gemini rejected the request. Check your local key, free-tier eligibility, model access, and request configuration.');
  if (status === 404) return new ModelError('MODEL_UNAVAILABLE', 'The configured Gemini model or API route is unavailable. Verify access before changing the model.');
  return new ModelError('MODEL_UNAVAILABLE', 'Gemini could not complete the request. Check the connection and retry later.');
}

export function createGemini({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  client,
} = {}) {
  if (!client && (!apiKey?.trim() || apiKey.includes('YOUR_'))) {
    throw new ModelError('NO_KEY', 'Save a Gemini free-tier API key in the local .env file first. Never paste it in chat.');
  }
  const ai = client || new GoogleGenAI({ apiKey, httpOptions: { timeout: 45000 } });
  async function call(input, instruction, kind = null) {
    try {
      const response = await ai.interactions.create({
        model, input, ...(instruction ? { system_instruction: instruction } : {}), store: false,
        generation_config: { max_output_tokens: kind ? 512 : 1024 },
        ...(kind ? { response_format: { type: 'text', mime_type: 'application/json', schema: {
          type: 'object', properties: {
            categories: { type: 'array', items: { type: 'string', enum: kind === 'user' ? USER_CATEGORIES : REPLY_CATEGORIES } },
            ...(kind === 'reply' ? { flagged: { type: 'boolean' } } : {}),
          }, required: kind === 'reply' ? ['categories', 'flagged'] : ['categories'], additionalProperties: false,
        } } } : {}),
      }, { timeout: 45000, maxRetries: 0 });
      if (!response.output_text?.trim()) throw new ModelError('EMPTY_REPLY', 'Gemini returned no usable text. Please retry later.');
      return response.output_text.trim();
    } catch (error) { throw safeModelError(error); }
  }
  return {
    model,
    async classifyUser(text, context = []) {
      return parseClassification(await call(classifierInput(context, text), USER_CLASSIFIER, 'user'), 'user');
    },
    async classifyReply(text, context = []) {
      return parseClassification(await call(classifierInput(context, text), REPLY_CLASSIFIER, 'reply'), 'reply');
    },
    async generate(messages, { balanced = false } = {}) {
      // Native conversation roles preserve the actual exchange without a hidden
      // role-play task or baseline behavioral instruction.
      try {
        const response = await ai.models.generateContent({
          model,
          contents: messages.map(message => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.text }],
          })),
          config: {
            maxOutputTokens: 1024,
            ...(balanced ? { systemInstruction: BALANCED_CHAT } : {}),
          },
        });
        if (!response.text?.trim()) throw new ModelError('EMPTY_REPLY', 'Gemini returned no usable text. Please retry later.');
        return response.text.trim();
      } catch (error) { throw safeModelError(error); }
    },
  };
}
