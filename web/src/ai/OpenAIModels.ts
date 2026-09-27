/** Curated current general-purpose models supported by this app's OpenAI routes. */
export const OPENAI_MODELS = [
  { id: 'gpt-6-astra', label: 'GPT-6 Astra · highest capability' },
  { id: 'gpt-6-sol', label: 'GPT-6 Sol · balanced' },
  { id: 'gpt-6-luna', label: 'GPT-6 Luna · lower cost' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini · low latency' },
] as const;

export type OpenAIModel = typeof OPENAI_MODELS[number]['id'];
export interface ModelSelection { text: OpenAIModel; image: OpenAIModel }
export function isOpenAIModel(value: unknown): value is OpenAIModel {
  return typeof value === 'string' && OPENAI_MODELS.some((model) => model.id === value);
}
