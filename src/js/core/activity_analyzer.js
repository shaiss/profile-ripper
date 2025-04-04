import { getModelConfig, makeModelCall } from '../utils/api_utils.js';
import { safeJSONParse } from '../utils/json_utils.js';

// Console namespace for filtering logs
const console = {
  log: (...args) => (self.console || window.console).log('[ProfileRipper]', ...args),
  error: (...args) => (self.console || window.console).error('[ProfileRipper]', ...args),
  warn: (...args) => (self.console || window.console).warn('[ProfileRipper]', ...args),
  info: (...args) => (self.console || window.console).info('[ProfileRipper]', ...args)
};

// Define mappings from responsiveness category string to delay ranges (in seconds)
const RESPONSIVENESS_TO_DELAY_MAP = {
    "instant": { min: 1, max: 300 },        // < 5 min
    "active": { min: 301, max: 3600 },       // 5-60 min
    "casual": { min: 3601, max: 28800 },     // 1-8 hrs
    "zen": { min: 28801, max: 86400 },      // 8-24 hrs
    "unknown": { min: 3601, max: 28800 }      // Default: Casual (1-8 hrs) if unsure
};

// Define the valid responsiveness enum values from the schema
const VALID_RESPONSIVENESS_VALUES = ["instant", "active", "casual", "zen"];

/**
 * Analyzes profile HTML to estimate activity levels using an LLM.
 * @param {string} fullHtml - The full HTML content of the profile page.
 * @param {string} platform - The platform ('linkedin' or 'twitter').
 * @returns {Promise<{responsiveness: string, responseDelay: {min: number, max: number}, responseChance: number}>}
 */
export async function analyzeProfileActivity(fullHtml, platform) {
  console.log(`Analyzing ${platform} activity from HTML`);

  // Define ultimate fallback defaults
  const fallbackResult = {
      responsiveness: "active",
      responseDelay: RESPONSIVENESS_TO_DELAY_MAP["active"],
      responseChance: 50
  };

  if (!fullHtml) {
    console.warn('No HTML provided for activity analysis. Using defaults.');
    return fallbackResult;
  }
  
  const config = await getModelConfig();

  // Truncate HTML
  const truncatedHtml = fullHtml.substring(0, 8000); 

  // --- Updated Prompts for Responsiveness Category --- 
  const systemPrompt = `You are an expert social media activity analyst. Your task is to analyze the provided HTML of a social media profile page and estimate the user's responsiveness category and likelihood.
  
  Focus on:
  -   Timestamps of posts, comments, REPLIES, likes, etc.
  -   Density and recency of activities, especially engagement (replies).
  -   Phrases in the bio suggesting openness to interaction (e.g., "DM open", "Let's connect").
  
  Output Requirements:
  -   Estimate Responsiveness Category: Choose the BEST fit from ["instant", "active", "casual", "zen"]. AVOID using "unknown" unless absolutely no activity information is present.
  -   Estimate Response Chance: Provide a number between 0 and 100, representing the likelihood the user would respond to a relevant interaction.
  
  IMPORTANT: Respond ONLY with a valid JSON object containing exactly the two fields: "estimatedResponsiveness" and "estimatedResponseChance". Do not include explanations or any other text.`;

  const userPrompt = `Analyze the following HTML snippet from a ${platform} profile page and estimate the user's responsiveness.
  
  HTML Snippet (truncated):
  ${truncatedHtml}
  
  Based on the HTML, estimate:
  1.  Responsiveness Category (choose ONE: "instant", "active", "casual", "zen") - typical time to reply. Choose the most likely category based on the evidence.
  2.  Response Chance (0-100 likelihood)
  
  Return ONLY a valid JSON object:
  {
    "estimatedResponsiveness": "<your_category_estimate>",
    "estimatedResponseChance": <your_chance_estimate_number>
  }`; 
  // --- End of Updated Prompts --- 

  try {
    const content = await makeModelCall(
      config,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { temperature: 0.5, maxTokens: 100 } 
    );

    const analysisResult = safeJSONParse(content);
    console.log('Activity analysis result:', analysisResult);

    // Validate the response structure
    if (!analysisResult || typeof analysisResult.estimatedResponsiveness !== 'string' || typeof analysisResult.estimatedResponseChance !== 'number') {
        throw new Error('Invalid response format from activity analysis LLM.');
    }
    
    // Validate and normalize responsiveness category
    let responsivenessCategory = analysisResult.estimatedResponsiveness.toLowerCase();
    if (!VALID_RESPONSIVENESS_VALUES.includes(responsivenessCategory)) {
        console.warn(`Invalid responsiveness category "${responsivenessCategory}" received, using default.`);
        responsivenessCategory = 'active'; // Default to active if invalid
    }

    // Map responsiveness category to delay range
    const responseDelay = RESPONSIVENESS_TO_DELAY_MAP[responsivenessCategory] || RESPONSIVENESS_TO_DELAY_MAP["active"]; // Fallback needed?
    
    // Clamp response chance between 0 and 100
    const responseChance = Math.max(0, Math.min(100, analysisResult.estimatedResponseChance));

    return {
      responsiveness: responsivenessCategory,
      responseDelay,
      responseChance
    };

  } catch (error) {
    console.error('Activity analysis failed:', error);
    // Fallback to defaults in case of error
    return fallbackResult;
  }
} 