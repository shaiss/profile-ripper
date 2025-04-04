import { OPENAI_API_URL, ANTHROPIC_API_URL, MODEL_CONFIGS } from '../config/api_config.js';

// Console namespace for filtering logs
const console = {
  log: (...args) => (self.console || window.console).log('[ProfileRipper]', ...args),
  error: (...args) => (self.console || window.console).error('[ProfileRipper]', ...args),
  warn: (...args) => (self.console || window.console).warn('[ProfileRipper]', ...args),
  info: (...args) => (self.console || window.console).info('[ProfileRipper]', ...args)
};

/**
 * Get the current model configuration
 * @returns {Promise<Object>} Model configuration and API key
 */
export async function getModelConfig() {
  const { selectedModel, openaiKey, anthropicKey } = await chrome.storage.local.get(['selectedModel', 'openaiKey', 'anthropicKey']);
  console.log('Loaded model and keys:', { selectedModel, hasOpenAI: !!openaiKey, hasAnthropic: !!anthropicKey });
  
  const model = selectedModel || 'o3-mini-2025-01-31'; // Default to OpenAI Mini
  const config = MODEL_CONFIGS[model];
  
  const isAnthropicModel = model.startsWith('claude-');
  const provider = isAnthropicModel ? 'anthropic' : 'openai';
  const apiKey = isAnthropicModel ? anthropicKey : openaiKey;
  
  if (!apiKey) {
    throw new Error(`${isAnthropicModel ? 'Anthropic' : 'OpenAI'} API key not found. Please save your API key in the extension popup.`);
  }
  
  // Log masked API key for debugging
  const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
  console.log(`Using ${provider} API key: ${maskedKey}`);
  
  return {
    ...config,
    model,
    provider,
    apiKey
  };
}

/**
 * Make an API call to OpenAI or Anthropic
 * @param {Object} config - Model configuration
 * @param {Array} messages - Messages for the conversation
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Model response
 */
export async function makeModelCall(config, messages, options = {}) {
  console.log(`Making API call to ${config.model} (${config.provider})`);
  
  // Prepare request based on provider
  let url, headers, body;
  
  if (config.provider === 'openai') {
    // OpenAI API request
    url = OPENAI_API_URL;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    };
    body = {
      model: config.model,
      messages,
      max_tokens: options.maxTokens || config.maxTokens,
      temperature: options.temperature || config.temperature
    };
  } else {
    // Anthropic API request - using their native API format
    url = ANTHROPIC_API_URL;
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
    
    // Convert messages from OpenAI format to Anthropic format
    let systemMessage = '';
    let userMessages = [];
    
    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemMessage += msg.content + "\n";
      } else if (msg.role === 'user') {
        userMessages.push({
          role: 'user',
          content: msg.content
        });
      }
    });
    
    // If we have no user messages, create a default one
    if (userMessages.length === 0) {
      userMessages.push({
        role: 'user',
        content: 'Please analyze the data.'
      });
    }
    
    body = {
      model: config.model,
      system: systemMessage.trim(),
      messages: userMessages,
      max_tokens: options.maxTokens || config.maxTokens,
      temperature: options.temperature || config.temperature
    };
  }

  try {
    console.log(`Sending ${config.provider} request to ${url}`);
    console.log('Request headers:', headers);
    console.log('Request body:', body);
    
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      console.error('API error response:', errorData);
      
      // Extract error message based on provider
      let errorMessage;
      if (config.provider === 'openai') {
        errorMessage = errorData.error?.message || `OpenAI API request failed with status ${response.status}`;
      } else {
        errorMessage = errorData.error?.message || errorData.error || `Anthropic API request failed with status ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }

    const responseText = await response.text();
    console.log('API response text:', responseText);
    
    const data = JSON.parse(responseText);
    console.log('Parsed API response:', data);
    
    // Extract content based on provider
    let content;
    if (config.provider === 'openai') {
      content = data.choices[0].message.content;
    } else {
      // Anthropic's native response format
      content = data.content[0].text;
    }
    
    return content;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
} 