/**
 * Safely parse JSON from model response
 * @param {string} content - The content to parse
 * @returns {Object} Parsed JSON object
 */
export function safeJSONParse(content) {
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Initial JSON parse failed:', e);
    try {
      // Attempt to extract JSON wrapped in text or markdown code blocks
      const jsonMatch = content.match(/```json\n(\{[\s\S]*\})\n```|(\{[\s\S]*\})/);
      if (jsonMatch) {
        const extractedJson = jsonMatch[1] || jsonMatch[2];
        if (extractedJson) {
          console.log('Attempting to parse extracted JSON:', extractedJson);
          return JSON.parse(extractedJson);
        }
      }
    } catch (e2) {
      console.error('Failed to parse JSON after extraction:', e2);
    }
    throw new Error('Failed to parse response as JSON. API returned malformed data.');
  }
} 