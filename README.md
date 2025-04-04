# Profile Ripper Chrome Extension

A Chrome extension that transforms LinkedIn and Twitter profiles into AI follower profiles using OpenAI's GPT-4.

## Features

- Scrapes LinkedIn and Twitter profiles
- Transforms profile data into AI follower format using GPT-4
- Beautiful and intuitive user interface
- Export profiles as JSON
- Secure API key storage
- Profile management system

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Configuration

1. Click the extension icon in your Chrome toolbar
2. Enter your OpenAI API key in the settings section
3. Click "Save Key" to store your API key securely

## Usage

1. Navigate to any LinkedIn or Twitter profile
2. Click the "Create AI Profile" button that appears on the page
3. Wait for the profile to be processed by GPT-4
4. View and manage your saved profiles in the extension popup
5. Export individual profiles or all profiles as JSON

## Development

### Project Structure

```
profile-ripper/
├── manifest.json
├── src/
│   ├── js/
│   │   ├── background.js
│   │   ├── content.js
│   │   └── popup.js
│   ├── css/
│   │   └── popup.css
│   ├── html/
│   │   └── popup.html
│   └── images/
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
└── README.md
```

### Profile Samples

The extension exports profiles in a standardized JSON format. You can find example profiles in the `public_profile_samples/` directory. Here's an example of a transformed profile:

```json
{
  "active": true,
  "avatarUrl": "https://api.dicebear.com/9.x/micah/svg?seed=thecryptocatalyststartupecosystemarchitect",
  "background": "A serial entrepreneur who has navigated the complex landscapes of tech, crypto, and marketing, Mike has built a diverse career spanning startup mentorship, strategic leadership, and venture investing. His journey reflects a relentless passion for innovation, marked by both successful ventures and instructive failures, always maintaining an optimistic and growth-oriented mindset.",
  "communicationStyle": "Direct, enthusiastic, and knowledge-sharing, with a blend of professional insights and approachable humor",
  "interactionPreferences": {
    "dislikes": [
      "Rigid, bureaucratic thinking",
      "Lack of entrepreneurial spirit",
      "Negativity without constructive feedback",
      "Overly theoretical approaches",
      "Resistance to change"
    ],
    "likes": [
      "Engaging discussions about emerging technologies",
      "Networking with ambitious entrepreneurs",
      "Sharing startup insights and lessons learned",
      "Exploring innovative business models",
      "Collaborative problem-solving"
    ]
  },
  "interests": [
    "Cryptocurrency innovation",
    "Early-stage startup ecosystems",
    "Strategic marketing",
    "Technology entrepreneurship",
    "Podcast hosting",
    "Mentorship and startup coaching",
    "Sports marketing",
    "Professional networking"
  ],
  "metadata": {
    "exportedAt": "2025-04-04T03:54:07.326Z",
    "exportedBy": "Profile Ripper Extension",
    "model": "claude-3-5-haiku-20241022",
    "originalName": "Shai Perednik",
    "originalUrl": "https://www.linkedin.com/in/shaiperednik/",
    "source": "linkedin"
  },
  "name": "The Crypto Catalyst: Startup Ecosystem Architect",
  "personality": "Energetic, strategic visionary with a playful entrepreneurial spirit and high adaptability",
  "responseChance": 35,
  "responseDelay": {
    "max": 86400,
    "min": 28801
  },
  "responsiveness": "zen",
  "schemaVersion": "1.0",
  "tools": {
    "customInstructions": "",
    "equipped": []
  }
}
```

For more examples and detailed information about the profile format, see the [public_profile_samples/README.md](public_profile_samples/README.md) file.

### Building

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

### Testing

1. Run unit tests:
   ```bash
   npm test
   ```

2. Run integration tests:
   ```bash
   npm run test:integration
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Security

- API keys are stored securely in Chrome's local storage
- All data processing is done locally
- No data is sent to third-party servers except OpenAI API
- Content Security Policy is enforced

## Support

For support, please open an issue in the GitHub repository or contact the maintainers. 