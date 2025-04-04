/**
 * Content script for Profile Ripper extension
 * Handles profile scraping functionality
 */

// Console namespace for filtering logs
const console = {
  log: (...args) => window.console.log('[ProfileRipper]', ...args),
  error: (...args) => window.console.error('[ProfileRipper]', ...args),
  warn: (...args) => window.console.warn('[ProfileRipper]', ...args),
  info: (...args) => window.console.info('[ProfileRipper]', ...args)
};

// Platform detection
let currentPlatform = null;
if (window.location.hostname.includes('linkedin.com')) {
  currentPlatform = 'linkedin';
} else if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
  currentPlatform = 'twitter';
}

// Debug mode for testing
const DEBUG_MODE = true;

/**
 * Scrape profile data from the current page
 * @returns {Object} The scraped profile data
 */
async function scrapeProfile() {
  let profileData = {};
  
  if (currentPlatform === 'linkedin') {
    profileData = scrapeLinkedInProfile();
  } else if (currentPlatform === 'twitter') {
    profileData = scrapeTwitterProfile();
  } else {
    throw new Error('Unsupported platform');
  }
  
  return profileData;
}

/**
 * Scrape LinkedIn profile
 * @returns {Object} LinkedIn profile data
 */
function scrapeLinkedInProfile() {
  // Basic profile info
  const name = document.querySelector('.text-heading-xlarge')?.innerText.trim() || 
               document.querySelector('.pv-top-card--list-bullet > li')?.innerText.trim() || 
               'Unknown Name';
  
  const headline = document.querySelector('.text-body-medium')?.innerText.trim() || 
                  document.querySelector('.ph5.pb5 .text-body-small')?.innerText.trim() || 
                  'No headline';
  
  const location = document.querySelector('.pv-top-card--list-bullet > li:nth-child(2)')?.innerText.trim() || 
                  document.querySelector('.pb2 .text-body-small')?.innerText.trim() || 
                  'Unknown location';
  
  // Get profile photo
  const photoElement = document.querySelector('.pv-top-card-profile-picture__image') || 
                      document.querySelector('.profile-photo-edit__preview');
  const photoUrl = photoElement ? (photoElement.src || '') : '';
  
  // Get about section
  const aboutSection = document.querySelector('.pv-about-section .inline-show-more-text') || 
                      document.querySelector('.display-flex.ph5.pv3');
  const about = aboutSection ? aboutSection.innerText.trim() : '';
  
  // Experience
  const experienceItems = document.querySelectorAll('.experience-section .pv-entity__summary-info') || 
                          document.querySelectorAll('.pvs-list__item--line-separated');
  const experience = Array.from(experienceItems).map(item => {
    const title = item.querySelector('.pv-entity__secondary-title')?.innerText.trim() || 
                 item.querySelector('.t-bold')?.innerText.trim() || '';
    const company = item.querySelector('.pv-entity__secondary-title')?.innerText.trim() || 
                   item.querySelector('.t-normal.t-black--light')?.innerText.trim() || '';
    return { title, company };
  }).slice(0, 3);
  
  // Education
  const educationItems = document.querySelectorAll('.education-section .pv-entity__summary-info') || 
                         document.querySelectorAll('.education__list .pv-education-entity');
  const education = Array.from(educationItems).map(item => {
    const school = item.querySelector('.pv-entity__school-name')?.innerText.trim() || 
                  item.querySelector('.t-bold')?.innerText.trim() || '';
    const degree = item.querySelector('.pv-entity__degree-name')?.innerText.trim() || 
                  item.querySelector('.pv-entity__secondary-title')?.innerText.trim() || '';
    return { school, degree };
  }).slice(0, 2);
  
  // Skills
  const skillItems = document.querySelectorAll('.pv-skill-category-entity__name-text') || 
                    document.querySelectorAll('.pvs-list .pvs-entity--padded');
  const skills = Array.from(skillItems).map(item => item.innerText.trim()).slice(0, 10);
  
  return {
    name,
    headline,
    location,
    photoUrl,
    about,
    experience,
    education,
    skills,
    profileUrl: window.location.href
  };
}

/**
 * Scrape Twitter profile
 * @returns {Object} Twitter profile data
 */
function scrapeTwitterProfile() {
  // Basic profile info
  const name = document.querySelector('[data-testid="UserName"] span:first-child')?.innerText.trim() || 
               document.querySelector('.css-1rynq56')?.innerText.trim() || 
               'Unknown Name';
  
  const username = document.querySelector('[data-testid="UserName"] span:nth-child(2)')?.innerText.trim() || 
                  document.querySelector('.r-18u37iz.r-1wbh5a2 div')?.innerText.trim() || 
                  '';
  
  const bio = document.querySelector('[data-testid="UserDescription"]')?.innerText.trim() || 
              document.querySelector('.css-1dbjc4n.r-1adg3ll')?.innerText.trim() || 
              '';
  
  const location = document.querySelector('[data-testid="UserLocation"]')?.innerText.trim() || 
                  document.querySelector('.css-1dbjc4n.r-1adg3ll .r-18u37iz:nth-child(2)')?.innerText.trim() || 
                  '';
  
  // Get profile photo
  const photoElement = document.querySelector('[data-testid="UserAvatar"] img') || 
                      document.querySelector('.css-1dbjc4n.r-sdzlij.r-1udh08x img');
  const photoUrl = photoElement ? (photoElement.src || '') : '';
  
  // Get stats
  const followingCount = document.querySelector('[data-testid="following"] span')?.innerText.trim() || 
                        document.querySelector('.css-1dbjc4n.r-18u37iz .r-1mf7evn:nth-child(1) .r-qvutc0')?.innerText.trim() || 
                        '0';
  
  const followersCount = document.querySelector('[data-testid="followers"] span')?.innerText.trim() || 
                        document.querySelector('.css-1dbjc4n.r-18u37iz .r-1mf7evn:nth-child(2) .r-qvutc0')?.innerText.trim() || 
                        '0';
  
  // Get recent tweets
  const tweetItems = document.querySelectorAll('[data-testid="tweet"]') || 
                    document.querySelectorAll('.css-1dbjc4n.r-1loqt21.r-18u37iz .css-1dbjc4n.r-1iusvr4');
  const tweets = Array.from(tweetItems).map(item => {
    const tweetText = item.querySelector('[data-testid="tweetText"]')?.innerText.trim() || 
                     item.querySelector('.css-901oao.r-18jsvk2')?.innerText.trim() || 
                     item.innerText.trim();
    return tweetText;
  }).slice(0, 5);
  
  return {
    name,
    username,
    bio,
    location,
    photoUrl,
    followingCount,
    followersCount,
    tweets,
    profileUrl: window.location.href
  };
}

// Export the scraping function for use by the popup
window.scrapeProfileFromPage = scrapeProfile; 