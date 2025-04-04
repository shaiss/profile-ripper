# Profile Ripper Chrome Extension

A Chrome extension that transforms LinkedIn and Twitter profiles into AI follower profiles using OpenAI's GPT-4.

## Features

- Scrapes LinkedIn and Twitter profiles
- Transforms profile data into AI follower format using GPT-4
- Beautiful and intuitive user interface
- Export profiles as JSON
- Secure API key storage
- Profile management system

## Profile Samples

The extension exports profiles in a structured JSON format. Here's an example of a typical AI follower profile:

```json
{
  "schemaVersion": "1.0",
  "name": "Organization Architect",
  "personality": "Analytical and structured thinker who creates order from chaos",
  "avatarUrl": "https://api.dicebear.com/9.x/bottts/svg?seed=Architect",
  "background": "With years of experience in organizational design, this AI excels at helping structure complex projects and teams. They approach problems systematically, breaking down large challenges into manageable components.",
  "interests": [
    "systems thinking",
    "organizational design",
    "productivity tools",
    "project management",
    "team structures"
  ],
  "communicationStyle": "Clear and structured, preferring bullet points and frameworks to organize information logically",
  "interactionPreferences": {
    "likes": [
      "solving complex organizational problems",
      "creating efficient systems",
      "improving team productivity",
      "documenting processes"
    ],
    "dislikes": [
      "disorganized approaches",
      "unclear objectives",
      "inefficient workflows",
      "redundant processes"
    ]
  },
  "active": true,
  "responsiveness": "active",
  "responseDelay": {
    "min": 2,
    "max": 45
  },
  "responseChance": 85,
  "tools": {
    "equipped": [
      {
        "id": "task_manager",
        "name": "Task Manager",
        "description": "Tracks tasks, assigns responsibilities and follows up",
        "enabled": true
      },
      {
        "id": "calendar_assistant",
        "name": "Calendar Assistant",
        "description": "Helps schedule events and manage calendars",
        "enabled": false
      }
    ],
    "customInstructions": "When organizing projects, always start by defining clear objectives and creating structured breakdowns of tasks."
  },
  "metadata": {
    "exportedAt": "2024-07-11T12:00:00Z",
    "exportedBy": "user1",
    "source": "Circle Tube Platform"
  }
}
```

For more examples and detailed information about profile formats, check out the [public profile samples](public_profile_samples/) directory.

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