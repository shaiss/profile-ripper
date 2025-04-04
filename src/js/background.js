import { generateCreativeContent, generateAvatarStyleName } from './core/profile_processor.js';
import { analyzeProfileActivity } from './core/activity_analyzer.js';
import { getModelConfig, makeModelCall } from './utils/api_utils.js';

/**
 * Background service worker for Profile Ripper extension.
 * Handles specific API calls requested by the popup.
 */

// Console namespace for filtering logs
const log = (...args) => console.log('[ProfileRipper]', ...args);
const error = (...args) => console.error('[ProfileRipper]', ...args);
const warn = (...args) => console.warn('[ProfileRipper]', ...args);
const info = (...args) => console.info('[ProfileRipper]', ...args);

log('Background service worker started.');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Received message in background:', message);
  
  // Route message to the appropriate handler
  switch (message.action) {
    case 'generateCreativeContent':
      generateCreativeContent(message.profileData, message.platform, message.fullHtml)
        .then(creativeContent => {
          log('Creative content generated:', creativeContent);
          sendResponse({ success: true, creativeContent });
        })
        .catch(err => {
          error('Error generating creative content:', err);
          sendResponse({ error: err.message });
        });
      return true; // Indicate async response

    case 'analyzeActivity':
      analyzeProfileActivity(message.fullHtml, message.platform)
        .then(activityAnalysis => {
          log('Activity analysis complete:', activityAnalysis);
          sendResponse({ success: true, activityAnalysis });
        })
        .catch(err => {
          error('Error analyzing activity:', err);
          sendResponse({ error: err.message });
        });
      return true; // Indicate async response

    case 'generateAvatarStyle':
      generateAvatarStyleName(message.creativeContent)
        .then(styleName => {
          log('Avatar style generated:', styleName);
          sendResponse({ success: true, styleName });
        })
        .catch(err => {
          error('Error generating avatar style:', err);
          sendResponse({ error: err.message });
        });
      return true;

    case 'analyzePageStructure':
      // Get model config and analyze the page structure
      getModelConfig()
        .then(config => {
          const systemPrompt = `You are an expert in web page structure analysis. Analyze the provided HTML and suggest the best CSS selector for injecting a button into the profile page's action area.
          
          For LinkedIn profiles, look for:
          - Action areas near the top of the profile
          - Areas containing buttons like "Connect", "Message", "Follow"
          - Container classes like "pv-top-card--actions", "pvs-profile-actions"
          
          For Twitter profiles, look for:
          - Action areas in the profile header
          - Areas containing buttons like "Follow", "Message"
          - Container elements with data-testid attributes
          
          Return ONLY a single CSS selector as a string that will target the appropriate container.`;

          const userPrompt = `Analyze this ${message.platform} profile page HTML and suggest the best selector for injecting a button into the action area:
          
          ${message.html.substring(0, 8000)}`;

          return makeModelCall(
            config,
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            { temperature: 0.3, maxTokens: 100 }
          );
        })
        .then(selector => {
          log('Page structure analysis complete. Suggested selector:', selector);
          sendResponse({ success: true, selector: selector.trim() });
        })
        .catch(err => {
          error('Error analyzing page structure:', err);
          sendResponse({ error: err.message });
        });
      return true;

    default:
      warn('Unknown message action received:', message.action);
      sendResponse({ error: 'Unknown action' });
      break;
  }
  
  // Return true only for async cases handled above
  // For default case, it's synchronous (or no response needed)
  return false;
});

// Optional: Add listeners for extension installation or updates
chrome.runtime.onInstalled.addListener(details => {
  log('Profile Ripper extension installed or updated:', details);
});