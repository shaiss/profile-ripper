import { getModelConfig, makeModelCall } from '../utils/api_utils.js';
import { safeJSONParse } from '../utils/json_utils.js';

// Console namespace for filtering logs
const log = (...args) => console.log('[ProfileRipper]', ...args);
const error = (...args) => console.error('[ProfileRipper]', ...args);
const warn = (...args) => console.warn('[ProfileRipper]', ...args);
const info = (...args) => console.info('[ProfileRipper]', ...args);

/**
 * Default values for the AI Follower Profile based on the schema.
 * Note: responsiveness, responseDelay and responseChance will be overwritten by dynamic analysis.
 */
const DEFAULT_PROFILE_VALUES = {
  schemaVersion: "1.0",
  active: true,
  responsiveness: "active", // Default if analysis fails
  responseDelay: { min: 3601, max: 28800 }, // Default: Casual (1-8 hrs)
  responseChance: 50, // Default: 50%
  tools: { equipped: [], customInstructions: "" },
  avatarUrl: "", // Placeholder, will be generated
};

// --- Function to Generate Creative Content --- 
/**
 * Generates the core creative elements of the profile using an LLM.
 * Uses HTML as a fallback if initial scraping missed key details like name.
 * @param {object} profileData - The structured (potentially incomplete) profile data from scraping.
 * @param {string} platform - The source platform ('linkedin' or 'twitter').
 * @param {string} fullHtml - The full HTML of the profile page.
 * @returns {Promise<object>} Object containing name, personality, background, etc.
 */
export async function generateCreativeContent(profileData, platform, fullHtml) {
  log(`Generating creative content for ${platform} profile. Initial data:`, profileData);
  const config = await getModelConfig();

  // Truncate HTML for the prompt
  const truncatedHtml = fullHtml ? fullHtml.substring(0, 8000) : 'No HTML provided';

  const systemPrompt = `You are an expert AI persona creator. Your task is to analyze social media profile data and potentially accompanying HTML to generate the core creative elements for an engaging, archetype-based AI follower persona.

  Input Data Provided:
  - profileData: Pre-scraped data (might be incomplete, e.g., name could be "Unknown Name").
  - htmlSnippet: A portion of the profile page's HTML.

  Your Process:
  1.  **Verify/Extract Name:** If profileData.name is "Unknown Name" or missing, analyze the htmlSnippet to determine the profile owner's full name. Use this corrected name for subsequent steps.
  2.  **Generate Persona:** Based on the corrected name (if necessary), profileData, and context from htmlSnippet, generate the following creative fields:
      - name: Create a descriptive persona title/role.
      - personality: Define a clear personality archetype.
      - background: Write a brief, engaging narrative background story.
      - communicationStyle: Describe the persona's communication style.
      - interests: List interests relevant to the persona's role.
      - interactionPreferences: Define likes/dislikes reflecting the persona's mindset.

  IMPORTANT: Respond ONLY with a valid JSON object containing ONLY the generated creative fields (name, personality, background, etc.). Do not include the original name if you extracted it. Ensure all string values are properly escaped.`;

  const userPrompt = `Analyze this ${platform} profile data and generate creative content:

  Profile Data:
  ${JSON.stringify(profileData, null, 2)}

  HTML Snippet:
  ${truncatedHtml}`;

  try {
    const response = await makeModelCall(
      config,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { temperature: 0.7, maxTokens: 1000 }
    );

    const creativeContent = safeJSONParse(response);
    log('Generated creative content:', creativeContent);
    return { ...DEFAULT_PROFILE_VALUES, ...creativeContent };
  } catch (err) {
    error('Error generating creative content:', err);
    throw err;
  }
}

// --- Function to Generate Avatar Style Name --- 
/**
 * Asks LLM to choose a DiceBear style name based on profile persona.
 * @param {object} creativeProfileData - The generated creative content (name, personality, etc.).
 * @returns {Promise<string>} The chosen DiceBear style name (e.g., "micah").
 */
export async function generateAvatarStyleName(creativeProfileData) { // Renamed & simplified
  console.log('Generating DiceBear avatar style name based on:', creativeProfileData);
  const config = await getModelConfig(); 

  // Define suitable DiceBear styles
  const availableStyles = ["micah", "personas", "pixel-art-neutral", "adventurer-neutral", "bottts"]; // Added bottts back

  const systemPrompt = `You are an AI visual style consultant. Analyze the provided AI persona details (personality, background, interests) and choose the *single most appropriate* DiceBear avatar style name from the provided list to visually represent this persona.
  
  Available Style Names: ${JSON.stringify(availableStyles)}
  
  Consider:
  -   'micah', 'personas': More human-like, good for professional or relatable personas.
  -   'pixel-art-neutral', 'adventurer-neutral': Stylized, potentially good for creative or tech roles.
  -   'bottts': Robotic, best for explicitly tech/AI focused personas.
  
  IMPORTANT: Respond ONLY with a valid JSON object containing a single key "styleName" and the chosen style name as its string value. Example: { "styleName": "micah" }`;

  const userPrompt = `Analyze this AI persona:
  Name: ${creativeProfileData.name}
  Personality: ${creativeProfileData.personality}
  Background: ${creativeProfileData.background}
  Interests: ${creativeProfileData.interests?.join(', ')}
  Communication Style: ${creativeProfileData.communicationStyle}

  Choose the best DiceBear style name from [${availableStyles.map(s=>`"${s}"`).join(', ')}] to represent this persona.
  
  Return ONLY a valid JSON object with the key "styleName".`;

  try {
    const content = await makeModelCall(
      config,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { temperature: 0.5, maxTokens: 50 } // Lower temp, very short response needed
    );
    
    const result = safeJSONParse(content);
    console.log('LLM suggested style:', result);
    
    // Validate response and ensure style is in our list
    if (typeof result?.styleName === 'string' && availableStyles.includes(result.styleName)) {
        return result.styleName;
    }
     
    console.warn('LLM did not return a valid style name from the list. Defaulting to micah.');
    return 'micah'; // Default style if LLM fails or returns invalid style

  } catch (error) {
    console.error('Failed to generate avatar style name:', error);
    return 'micah'; // Default style on error
  }
}

// --- Removed generateAvatarOptions function ---
// The orchestration (calling these functions sequentially and merging) 
// will now happen in popup.js. 