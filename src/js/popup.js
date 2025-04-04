/**
 * Popup script for Profile Ripper extension
 * Handles profile management and settings
 */

// Console namespace for filtering logs
const console = {
  log: (...args) => window.console.log('[ProfileRipper]', ...args),
  error: (...args) => window.console.error('[ProfileRipper]', ...args),
  warn: (...args) => window.console.warn('[ProfileRipper]', ...args),
  info: (...args) => window.console.info('[ProfileRipper]', ...args)
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup initialized'); // Debug log

    const openaiKeyInput = document.getElementById('openai-key');
    const anthropicKeyInput = document.getElementById('anthropic-key');
    const modelSelect = document.getElementById('model-select');
    const scrapeProfileButton = document.getElementById('scrape-profile');
    const currentPageInfo = document.getElementById('current-page-info');
    const progressIndicator = document.getElementById('progress-indicator');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    // Load saved settings
    const { openaiKey, anthropicKey, selectedModel } = await chrome.storage.local.get(['openaiKey', 'anthropicKey', 'selectedModel']);
    
    if (openaiKey) {
        openaiKeyInput.value = openaiKey;
    }
    
    if (anthropicKey) {
        anthropicKeyInput.value = anthropicKey;
    }
    
    // Set default model to claude-3-5-haiku-20241022 if not already set
    if (selectedModel) {
        modelSelect.value = selectedModel;
    } else {
        modelSelect.value = 'o3-mini-2025-01-31'; // Set default to OpenAI Mini for now
        await chrome.storage.local.set({ selectedModel: 'o3-mini-2025-01-31' });
    }
    
    // Save API keys when buttons are clicked
    document.getElementById('save-openai-key').addEventListener('click', async () => {
        const key = openaiKeyInput.value.trim();
        if (!key) {
            showNotification('Please enter an OpenAI API key', 'error');
            return;
        }
        
        await chrome.storage.local.set({ openaiKey: key });
        console.log('Saved OpenAI API key');
        showNotification('OpenAI API key saved successfully', 'success');
        
        // Verify it was saved
        const { openaiKey: savedKey } = await chrome.storage.local.get(['openaiKey']);
        console.log('Verified OpenAI key is saved:', !!savedKey);
    });
    
    document.getElementById('save-anthropic-key').addEventListener('click', async () => {
        const key = anthropicKeyInput.value.trim();
        if (!key) {
            showNotification('Please enter an Anthropic API key', 'error');
            return;
        }
        
        // Validate Anthropic API key format (should start with sk-ant-)
        if (!key.startsWith('sk-ant-')) {
            console.warn('Invalid Anthropic key format:', key.substring(0, 10) + '...');
            showNotification('Anthropic API key should start with "sk-ant-"', 'error');
            return;
        }
        
        console.log('Saving Anthropic API key:', key.substring(0, 10) + '...');
        await chrome.storage.local.set({ anthropicKey: key });
        showNotification('Anthropic API key saved successfully', 'success');
        
        // Verify it was saved
        const { anthropicKey: savedKey } = await chrome.storage.local.get(['anthropicKey']);
        console.log('Verified Anthropic key is saved:', !!savedKey, 'starts with sk-ant-:', savedKey?.startsWith('sk-ant-'));
    });
    
    // Handle model selection
    modelSelect.addEventListener('change', async () => {
        const selectedModel = modelSelect.value;
        await chrome.storage.local.set({ selectedModel });
        
        // Check if appropriate API key is set
        const { openaiKey, anthropicKey } = await chrome.storage.local.get(['openaiKey', 'anthropicKey']);
        const isAnthropicModel = selectedModel.startsWith('claude-');
        
        if (isAnthropicModel && !anthropicKey) {
            showNotification('Warning: Anthropic API key not set', 'warning');
        } else if (!isAnthropicModel && !openaiKey) {
            showNotification('Warning: OpenAI API key not set', 'warning');
        } else {
            showNotification(`Model changed to ${selectedModel}`);
        }
    });
    
    // Check current tab for LinkedIn or Twitter profile
    await checkCurrentTab();
    
    // Default profile values for merging (subset needed in popup)
    const DEFAULT_POPUP_VALUES = {
      schemaVersion: "1.0",
      active: true,
      tools: { equipped: [], customInstructions: "" }
    };
    
    // Handle profile extraction orchestration
    scrapeProfileButton.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return showNotification('Error: Could not access current tab', 'error');

        scrapeProfileButton.disabled = true;
        currentPageInfo.style.display = 'none';
        updateProgress(0, 5, 'Starting...'); // 5 steps: Scrape, Creative, Activity, Avatar, Finalize

        let profileData, fullHtml, creativeContent, activityAnalysis;
        const platform = tab.url.includes('linkedin.com') ? 'linkedin' : 'twitter';

        try {
            // --- Step 1: Scrape Data --- 
            updateProgress(1, 5, 'Step 1/5: Extracting profile data...'); 
            const scrapeResult = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: scrapeProfileFromPage,
            });
            if (!scrapeResult?.[0]?.result || scrapeResult[0].result.error) {
                throw new Error(scrapeResult?.[0]?.result?.error || 'Failed to extract profile data.');
            }
            ({ profileData, fullHtml } = scrapeResult[0].result);
            if (!profileData || Object.keys(profileData).length === 0) {
                throw new Error('Scraping returned empty profile data.');
            }
            console.log('Scraping complete:', profileData);

            // --- Check API Keys Before Proceeding --- 
            const { openaiKey, anthropicKey, selectedModel } = await chrome.storage.local.get(['openaiKey', 'anthropicKey', 'selectedModel']);
            const isAnthropicModel = selectedModel && selectedModel.startsWith('claude-');
            if ((isAnthropicModel && !anthropicKey) || (!isAnthropicModel && !openaiKey)) {
                throw new Error(`Please save your ${isAnthropicModel ? 'Anthropic' : 'OpenAI'} API key in settings.`);
            }

            // --- Step 2: Generate Creative Content --- 
            updateProgress(2, 5, 'Step 2/5: Generating persona...');
            const creativeResponse = await chrome.runtime.sendMessage({
                action: 'generateCreativeContent',
                profileData,
                platform
            });
            if (creativeResponse?.error) throw new Error(`Creative generation failed: ${creativeResponse.error}`);
            if (!creativeResponse?.success || !creativeResponse.creativeContent) throw new Error('Invalid response for creative content.');
            creativeContent = creativeResponse.creativeContent;
            console.log('Creative content received:', creativeContent);

            // --- Step 3: Analyze Activity --- 
            updateProgress(3, 5, 'Step 3/5: Analyzing activity...');
            const activityResponse = await chrome.runtime.sendMessage({
                action: 'analyzeActivity',
                fullHtml,
                platform
            });
            if (activityResponse?.error) throw new Error(`Activity analysis failed: ${activityResponse.error}`);
             if (!activityResponse?.success || !activityResponse.activityAnalysis) throw new Error('Invalid response for activity analysis.');
            activityAnalysis = activityResponse.activityAnalysis;
            console.log('Activity analysis received:', activityAnalysis);

            // --- Step 4: Generate Avatar Style Name --- 
            updateProgress(4, 5, 'Step 4/5: Choosing avatar style...');
            const avatarStyleResponse = await chrome.runtime.sendMessage({
                action: 'generateAvatarStyle',
                creativeContent
            });
            if (avatarStyleResponse?.error) throw new Error(`Avatar style selection failed: ${avatarStyleResponse.error}`);
            if (!avatarStyleResponse?.success || !avatarStyleResponse.styleName) throw new Error('Invalid response for avatar style.');
            const chosenStyleName = avatarStyleResponse.styleName;
            console.log('Avatar style name received:', chosenStyleName);

            // --- Step 5: Finalize and Save --- 
            updateProgress(5, 5, 'Step 5/5: Finalizing...');
            
            const finalProfile = {
                ...DEFAULT_POPUP_VALUES,
                ...(creativeContent || {}),
                ...(activityAnalysis || {}),
                // avatarUrl and metadata will be added below
            };
            
            // Generate avatar URL using the chosen style name
            const seed = (finalProfile.name || 'default').toLowerCase().replace(/[^a-z0-9]/g, '');
            let avatarUrl = `https://api.dicebear.com/9.x/${chosenStyleName || 'micah'}/svg?seed=${seed}`;
            
            finalProfile.avatarUrl = avatarUrl;
            console.log('Final Avatar URL:', finalProfile.avatarUrl);
            
            // Add metadata
            const { model } = await getModelConfigFromStorage();
            finalProfile.metadata = {
                exportedAt: new Date().toISOString(),
                exportedBy: 'Profile Ripper Extension',
                source: platform,
                model: model || 'unknown',
                originalUrl: profileData?.profileUrl || 'Not Available',
                originalName: profileData?.name || 'Not Available',
                ...(platform === 'twitter' && profileData?.username ? { originalUsername: profileData.username } : {})
            };

            console.log('Final Profile Ready:', finalProfile);

            // Save the profile
            const { profiles: currentProfiles = [] } = await chrome.storage.local.get(['profiles']);
            currentProfiles.push(finalProfile);
            await chrome.storage.local.set({ profiles: currentProfiles });

            showNotification('Profile transformed and saved!', 'success');
            loadProfiles(); // Refresh list

        } catch (error) {
            console.error('Error during profile extraction process:', error);
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            // Always re-enable button and hide progress
            scrapeProfileButton.disabled = false;
            scrapeProfileButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="white"/></svg> Extract Profile';
            currentPageInfo.style.display = 'block';
            hideProgress();
        }
    });
    
    // Helper to get model name for metadata
    async function getModelConfigFromStorage() {
        const { selectedModel } = await chrome.storage.local.get(['selectedModel']);
        return { model: selectedModel || 'o3-mini-2025-01-31' };
    }
    
    // Function to check current tab and update UI
    async function checkCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                updateCurrentPageInfo(false);
                return;
            }
            
            const isLinkedIn = tab.url.includes('linkedin.com');
            const isTwitter = tab.url.includes('twitter.com') || tab.url.includes('x.com');
            
            if (isLinkedIn || isTwitter) {
                const platform = isLinkedIn ? 'LinkedIn' : 'Twitter/X';
                updateCurrentPageInfo(true, platform);
            } else {
                updateCurrentPageInfo(false);
            }
        } catch (error) {
            console.error('Error checking current tab:', error);
            updateCurrentPageInfo(false);
        }
    }
    
    // Update current page info UI
    function updateCurrentPageInfo(isProfilePage, platform = null) {
        if (isProfilePage) {
            currentPageInfo.textContent = `Current page: ${platform} profile detected`;
            currentPageInfo.style.color = '#10b981';
            scrapeProfileButton.disabled = false;
        } else {
            currentPageInfo.textContent = 'No profile detected. Open a LinkedIn or Twitter profile page.';
            currentPageInfo.style.color = '#ef4444';
            scrapeProfileButton.disabled = true;
        }
    }
    
    // Show notification function
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Load and display profiles
    async function loadProfiles() {
        console.log('Loading profiles...'); // Debug log
        const { profiles } = await chrome.storage.local.get(['profiles']);
        const profilesList = document.getElementById('profiles-list');
        profilesList.innerHTML = '';
        
        if (profiles && profiles.length > 0) {
            console.log(`Found ${profiles.length} profiles to display`); // Debug log
            // Sort profiles by date, newest first
            profiles.sort((a, b) => new Date(b.metadata.exportedAt) - new Date(a.metadata.exportedAt));
            
            profiles.forEach((profile, index) => {
                console.log(`Creating card for profile ${index}: "${profile.name}"`); // Debug log
                const profileCard = document.createElement('div');
                profileCard.className = 'profile-card';
                
                // Store the profile name in a data attribute for verification
                profileCard.dataset.profileName = profile.name;
                
                profileCard.innerHTML = `
                    <div class="profile-card-main">
                        <img src="${profile.avatarUrl || 'https://api.dicebear.com/9.x/bottts/svg?seed=default'}" 
                             alt="${profile.name} Avatar" class="profile-card-avatar" loading="lazy">
                        <div class="profile-card-details">
                            <h3>${profile.name}</h3>
                            ${profile.metadata?.originalIdentifier ? 
                              `<small class="original-name-ref">(from: ${profile.metadata.originalIdentifier})</small>` : ''}
                            <div class="profile-meta-line">
                                ${profile.metadata?.originalUrl ? 
                                  `<a href="${profile.metadata.originalUrl}" target="_blank" 
                                      title="${profile.metadata.originalUrl}" class="source-link">
                                      ${profile.metadata.source}</a>` : 
                                  `<span title="Source Platform">${profile.metadata?.source || 'Unknown'}</span>`}
                                <span class="separator">|</span>
                                <span title="AI Model Used">${profile.metadata?.model || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="profile-actions">
                        <button class="btn secondary export-btn" data-profile-index="${index}">Export</button>
                        <button class="btn danger delete-btn" data-profile-index="${index}">Delete</button>
                    </div>
                `;
                
                profilesList.appendChild(profileCard);
                
                // Attach event listeners with debug logging
                const exportBtn = profileCard.querySelector('.export-btn');
                if (exportBtn) {
                    exportBtn.addEventListener('click', function() {
                        const profileIndex = parseInt(this.dataset.profileIndex, 10);
                        const profileName = this.closest('.profile-card').dataset.profileName;
                        console.log(`Export clicked for profile ${profileIndex}: "${profileName}"`);
                        exportProfile(profileIndex, profileName);
                    });
                }
            });
        } else {
            console.log('No profiles found');
            profilesList.innerHTML = '<p class="no-profiles">No profiles saved yet</p>';
        }
    }
    
    // Export profile function with debug logging
    async function exportProfile(index, expectedName) {
        console.log(`=== EXPORT PROFILE START ===`);
        console.log(`Exporting profile at index: ${index}, expected name: "${expectedName}"`);
        
        let { profiles } = await chrome.storage.local.get(['profiles']);
        console.log(`Total profiles in storage (before sorting): ${profiles?.length}`);
        
        if (!profiles || profiles.length === 0) {
            console.error('No profiles found in storage for export.');
            showNotification('Error: No profiles available to export', 'error');
            return;
        }

        // IMPORTANT: Sort the profiles exactly as done in loadProfiles
        try {
            profiles.sort((a, b) => new Date(b.metadata.exportedAt) - new Date(a.metadata.exportedAt));
            console.log('Profiles sorted by date successfully.');
        } catch (sortError) {
            console.error('Error sorting profiles during export:', sortError);
            showNotification('Error sorting profiles for export', 'error');
            // Optionally, proceed with unsorted or handle differently
            return; 
        }

        // Now access the profile using the index on the sorted array
        if (index < 0 || index >= profiles.length) {
            console.error(`Invalid index ${index} after sorting (length ${profiles.length})`);
            showNotification('Error: Profile index out of bounds after sorting', 'error');
            return;
        }
        
        const profile = profiles[index];
        console.log('Profile selected after sorting:', {
            index,
            name: profile?.name,
            expectedName,
            matches: profile?.name === expectedName
        });
        
        if (!profile || !profile.name) {
            console.error('Profile data or name is missing after sorting:', profile);
            showNotification('Error: Profile data incomplete for export', 'error');
            return;
        }
        
        // Verify we're exporting the correct profile (should match now)
        if (profile.name !== expectedName) {
            console.error(`Profile name mismatch after sorting! Expected: "${expectedName}", Got: "${profile.name}"`);
            // This error ideally shouldn't happen now, but good to keep as a safeguard
            showNotification('Error: Profile index mismatch detected', 'error');
            return;
        }
        
        // Filename generation with logging
        console.log('Filename generation:');
        console.log('1. Original name:', profile.name);
        const lowercased = profile.name.toLowerCase();
        console.log('2. Lowercase:', lowercased);
        const sanitized = lowercased.replace(/[^a-z0-9]/g, '-');
        console.log('3. Sanitized:', sanitized);
        const truncated = sanitized.substring(0, 50);
        console.log('4. Truncated:', truncated);
        const filename = `${truncated}.json`;
        console.log('5. Final filename:', filename);
        
        // Create and trigger download
        const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification(`Profile "${profile.name}" exported successfully`);
        console.log(`=== EXPORT PROFILE END ===`);
    }
    
    // Delete profile
    async function deleteProfile(index) {
        const { profiles } = await chrome.storage.local.get(['profiles']);
        profiles.splice(index, 1);
        await chrome.storage.local.set({ profiles });
        loadProfiles();
        showNotification('Profile deleted');
    }
    
    // Export all profiles
    document.getElementById('export-all').addEventListener('click', async () => {
        const { profiles } = await chrome.storage.local.get(['profiles']);
        
        if (!profiles || profiles.length === 0) {
            showNotification('No profiles to export', 'warning');
            return;
        }
        
        const blob = new Blob([JSON.stringify(profiles, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'all-profiles.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('All profiles exported successfully');
    });
    
    // Clear all profiles
    document.getElementById('clear-profiles').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete all profiles?')) {
            await chrome.storage.local.set({ profiles: [] });
            loadProfiles();
            showNotification('All profiles cleared');
        }
    });

    // Helper function to update progress
    function updateProgress(step, totalSteps, text) {
        const percentage = Math.max(0, Math.min(100, (step / totalSteps) * 100));
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = text;
        progressIndicator.style.display = 'block';
        console.log(`Progress: ${step}/${totalSteps} - ${text}`); // Add log
    }

    function hideProgress() {
        progressIndicator.style.display = 'none';
        progressBar.style.width = `0%`; // Reset bar
        console.log('Progress hidden'); // Add log
    }
});

// Function to extract profile data from the page
// This function will be injected into the tab
function scrapeProfileFromPage() {
    try {
        console.log('Starting profile scraping...');
        
        let platform = null;
        let profileData = {};
        
        if (window.location.hostname.includes('linkedin.com')) {
            platform = 'linkedin';
            console.log('Detected LinkedIn profile');
            profileData = scrapeLinkedInProfile();
        } else if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
            platform = 'twitter';
            console.log('Detected Twitter profile');
            profileData = scrapeTwitterProfile();
        } else {
            throw new Error('Unsupported platform - only LinkedIn and Twitter are supported');
        }
        
        // Return both structured data and the full HTML for analysis
        return {
            profileData: profileData,
            fullHtml: document.documentElement.outerHTML
        };
        
    } catch (error) {
        console.error('Error scraping profile:', error);
        // Return null or an error indicator if scraping fails
        // Returning null might be problematic if the caller expects an object.
        // Consider returning { error: error.message } instead.
        return { error: `Scraping failed: ${error.message}` };
    }
    
    // Helper function to get text content safely
    function getTextContent(selector, fallbackValue = '', parentElement = document) {
        try {
            // Ensure parentElement is valid, default to document if not
            const context = parentElement instanceof Element ? parentElement : document;
            const element = context.querySelector(selector);
            return element ? element.innerText.trim() : fallbackValue;
        } catch (e) {
            // Log warning but don't stop execution
            console.warn(`Failed to get text for selector ${selector}:`, e);
            return fallbackValue;
        }
    }
    
    // Helper function to get multiple elements safely
    function getElements(selector, parentElement = document) {
        try {
            // Ensure parentElement is valid
            const context = parentElement instanceof Element ? parentElement : document;
            return Array.from(context.querySelectorAll(selector) || []);
        } catch (e) {
            console.warn(`Failed to get elements for selector ${selector}:`, e);
            return [];
        }
    }
    
    // Scrape LinkedIn profile with improved selectors
    function scrapeLinkedInProfile() {
        console.log('Scraping LinkedIn profile...');
        
        // Try multiple selectors for each field to handle different LinkedIn layouts
        const nameSelectors = [
            // More specific structural selectors first
            '.pv-text-details__left-panel h1', // Structure seen in some layouts
            'section.pv-top-card h1', // Targeting h1 within the top card section
            '.pv-top-card-v2-ctas__info h1', // Another common structure
            '.pv-top-card__info h1', // Simpler info container
            '[data-testid="profile-card-name"]', // Potential test ID
            // Class-based selectors (potentially less stable)
            'h1.text-heading-xlarge',
            '.text-heading-xlarge',
            // Fallbacks
            '.ph5.pb5 h1', 
            'main[role="main"] h1' // Broadest fallback within main content
            // '.pv-top-card--list-bullet > li' // Removed this as it's unlikely for name
        ];
        
        const headlineSelectors = [
            '.text-body-medium',
            '.ph5.pb5 .text-body-small',
            '.pv-top-card__headline',
            '[data-test-id="profile-topcard-headline"]'
        ];
        
        const locationSelectors = [
            '.pv-top-card--list-bullet > li:nth-child(2)',
            '.pb2 .text-body-small',
            '.pv-top-card__location',
            '[data-test-id="profile-topcard-location"]'
        ];
        
        const aboutSelectors = [
            '.pv-about-section .inline-show-more-text',
            '.pv-shared-text-with-see-more span',
            '.display-flex.ph5.pv3',
            '.pv-about__summary-text',
            '[data-test-id="about-section"]'
        ];
        
        // Try each selector until we find one that works
        let name = '', headline = '', location = '', about = '', photoUrl = '';
        
        // Get name - with logging
        console.log('Attempting to find name with selectors:', nameSelectors);
        for (const selector of nameSelectors) {
            name = getTextContent(selector);
            if (name) {
                console.log(`Name found with selector: ${selector} -> "${name}"`); // Log the found name
                break; // Exit loop once found
            }
        }
        if (!name) {
            console.warn('Could not find profile name with any selector.');
        }
        
        // Get headline
        for (const selector of headlineSelectors) {
            headline = getTextContent(selector);
            if (headline) break;
        }
        
        // Get location
        for (const selector of locationSelectors) {
            location = getTextContent(selector);
            if (location) break;
        }
        
        // Get about section
        for (const selector of aboutSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                about = element.innerText.trim();
                break;
            }
        }
        
        // Get profile photo - try various selectors
        const photoSelectors = [
            '.pv-top-card-profile-picture__image',
            '.profile-photo-edit__preview',
            '.pv-top-card__photo img',
            '.presence-entity__image'
        ];
        
        for (const selector of photoSelectors) {
            const element = document.querySelector(selector);
            if (element && element.src) {
                photoUrl = element.src;
                break;
            }
        }
        
        // Scrape experience section - try various selectors
        const experienceSelectors = [
            '.experience-section .pv-entity__summary-info',
            '.pvs-list__item--line-separated',
            '.pv-entity__position-group',
            '.pv-profile-section__list-item'
        ];
        
        let experienceItems = [];
        for (const selector of experienceSelectors) {
            const items = getElements(selector);
            if (items.length > 0) {
                experienceItems = items;
                break;
            }
        }
        
        // Parse experience items
        const experience = experienceItems.slice(0, 3).map(item => {
            const title = 
                getTextContent('.pv-entity__secondary-title', '', item) || 
                getTextContent('.t-bold', '', item) || 
                getTextContent('.pv-entity__summary-info-headline', '', item) ||
                '';
                
            const company = 
                getTextContent('.pv-entity__secondary-title', '', item) || 
                getTextContent('.t-normal.t-black--light', '', item) || 
                getTextContent('.pv-entity__company-summary-info > span:nth-child(2)', '', item) ||
                '';
                
            return { title, company };
        });
        
        // Scrape education section - try various selectors
        const educationSelectors = [
            '.education-section .pv-entity__summary-info',
            '.education__list .pv-education-entity',
            '.pv-education-entity',
            '.pv-profile-section__list-item.education-item'
        ];
        
        let educationItems = [];
        for (const selector of educationSelectors) {
            const items = getElements(selector);
            if (items.length > 0) {
                educationItems = items;
                break;
            }
        }
        
        // Parse education items
        const education = educationItems.slice(0, 2).map(item => {
            const school = 
                getTextContent('.pv-entity__school-name', '', item) || 
                getTextContent('.t-bold', '', item) || 
                getTextContent('.pv-entity__degree-info', '', item) ||
                '';
                
            const degree = 
                getTextContent('.pv-entity__degree-name', '', item) || 
                getTextContent('.pv-entity__secondary-title', '', item) || 
                getTextContent('.pv-entity__degree-name .pv-entity__comma-item', '', item) ||
                '';
                
            return { school, degree };
        });
        
        // Scrape skills section - try various selectors
        const skillSelectors = [
            '.pv-skill-category-entity__name-text',
            '.pvs-list .pvs-entity--padded',
            '.pv-skill-category-entity',
            '.skill-category-entity__name'
        ];
        
        let skillItems = [];
        for (const selector of skillSelectors) {
            const items = getElements(selector);
            if (items.length > 0) {
                skillItems = items;
                break;
            }
        }
        
        // Parse skills
        const skills = skillItems.slice(0, 10).map(item => item.innerText.trim());
        
        // Build and return the profile data
        console.log('LinkedIn profile scraped successfully (or partially)');
        return {
            name: name || 'Unknown Name', // Use fallback if loop failed
            headline: headline || 'No headline',
            location: location || 'Unknown location',
            photoUrl: photoUrl || '',
            about: about || '',
            experience: experience.length > 0 ? experience : [],
            education: education.length > 0 ? education : [],
            skills: skills.length > 0 ? skills : [],
            profileUrl: window.location.href
        };
    }
    
    // Scrape Twitter profile with improved selectors
    function scrapeTwitterProfile() {
        console.log('Scraping Twitter profile...');
        
        // Try multiple selectors for each field
        const nameSelectors = [
            '[data-testid="UserName"] span:first-child',
            '.css-1rynq56',
            'a[href$="/photo"] div[dir="auto"]',
            '[data-testid="UserNameDisplay"]'
        ];
        
        const usernameSelectors = [
            '[data-testid="UserName"] span:nth-child(2)',
            '.r-18u37iz.r-1wbh5a2 div',
            '[data-testid="UserProfileHeader_Items"] span'
        ];
        
        const bioSelectors = [
            '[data-testid="UserDescription"]',
            '.css-1dbjc4n.r-1adg3ll',
            '[data-testid="UserProfileHeader_Items"] + div'
        ];
        
        const locationSelectors = [
            '[data-testid="UserLocation"]',
            '.css-1dbjc4n.r-1adg3ll .r-18u37iz:nth-child(2)',
            '[data-testid="UserProfileHeader_Items"] div[dir="auto"]'
        ];
        
        // Try each selector until we find one that works
        let name = '', username = '', bio = '', location = '', photoUrl = '';
        
        // Get name
        for (const selector of nameSelectors) {
            name = getTextContent(selector);
            if (name) break;
        }
        
        // Get username
        for (const selector of usernameSelectors) {
            username = getTextContent(selector);
            if (username) break;
        }
        
        // Get bio
        for (const selector of bioSelectors) {
            bio = getTextContent(selector);
            if (bio) break;
        }
        
        // Get location
        for (const selector of locationSelectors) {
            location = getTextContent(selector);
            if (location) break;
        }
        
        // Get profile photo - try various selectors
        const photoSelectors = [
            '[data-testid="UserAvatar"] img',
            '.css-1dbjc4n.r-sdzlij.r-1udh08x img',
            '[data-testid="UserProfileHeader_Items"] img'
        ];
        
        for (const selector of photoSelectors) {
            const element = document.querySelector(selector);
            if (element && element.src) {
                photoUrl = element.src;
                break;
            }
        }
        
        // Get stats (following/followers) using multiple selectors
        const followingSelectors = [
            '[data-testid="following"] span',
            '.css-1dbjc4n.r-18u37iz .r-1mf7evn:nth-child(1) .r-qvutc0',
            '[data-testid="UserProfileHeader_Items"] a[href$="/following"] span'
        ];
        
        const followersSelectors = [
            '[data-testid="followers"] span',
            '.css-1dbjc4n.r-18u37iz .r-1mf7evn:nth-child(2) .r-qvutc0',
            '[data-testid="UserProfileHeader_Items"] a[href$="/followers"] span'
        ];
        
        let followingCount = '0', followersCount = '0';
        
        // Get following count
        for (const selector of followingSelectors) {
            const count = getTextContent(selector);
            if (count) {
                followingCount = count;
                break;
            }
        }
        
        // Get followers count
        for (const selector of followersSelectors) {
            const count = getTextContent(selector);
            if (count) {
                followersCount = count;
                break;
            }
        }
        
        // Get recent tweets using multiple selectors
        const tweetSelectors = [
            '[data-testid="tweet"]',
            '.css-1dbjc4n.r-1loqt21.r-18u37iz .css-1dbjc4n.r-1iusvr4',
            '[data-testid="tweetText"]'
        ];
        
        let tweetItems = [];
        for (const selector of tweetSelectors) {
            const items = getElements(selector);
            if (items.length > 0) {
                tweetItems = items;
                break;
            }
        }
        
        // Parse tweets
        const tweets = tweetItems.slice(0, 5).map(item => {
            const tweetText = 
                getTextContent('[data-testid="tweetText"]', '', item) || 
                getTextContent('.css-901oao.r-18jsvk2', '', item) || 
                item.innerText.trim();
            return tweetText;
        }).filter(tweet => tweet.length > 0);
        
        // Build and return the profile data
        console.log('Twitter profile scraped successfully');
        return {
            name: name || 'Unknown Name',
            username: username || '',
            bio: bio || '',
            location: location || '',
            photoUrl: photoUrl || '',
            followingCount: followingCount || '0',
            followersCount: followersCount || '0',
            tweets: tweets.length > 0 ? tweets : [],
            profileUrl: window.location.href
        };
    }
} 