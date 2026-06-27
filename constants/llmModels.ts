/** Popular OpenRouter models for product description generation */
export const LLM_MODEL_OPTIONS = [
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini 1.5 Flash' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct', label: 'Mistral Small 3.1' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
] as const;

export const DEFAULT_LLM_MODEL = 'google/gemini-2.0-flash-001';

export const LLM_MODEL_CUSTOM = '__custom__';
