// API configurations
export const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Model configurations
export const MODEL_CONFIGS = {
  'o3-mini-2025-01-31': {
    provider: 'openai',
    maxTokens: 4096,
    temperature: 0.5
  },
  'gpt-4o-2024-11-20': {
    provider: 'openai',
    maxTokens: 8192,
    temperature: 0.7
  },
  'claude-3-5-haiku-20241022': {
    provider: 'anthropic',
    maxTokens: 4096,
    temperature: 0.5
  },
  'claude-3-7-sonnet-20250219': {
    provider: 'anthropic',
    maxTokens: 8192,
    temperature: 0.7
  }
}; 