const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const sourceSvg = path.join(__dirname, '../src/images/icon.svg');
const outputDir = path.join(__dirname, '../src/images');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate PNG files for each size
sizes.forEach(size => {
  sharp(sourceSvg)
    .resize(size, size)
    .png()
    .toFile(path.join(outputDir, `icon${size}.png`))
    .then(() => console.log(`Generated ${size}x${size} icon`))
    .catch(err => console.error(`Error generating ${size}x${size} icon:`, err));
}); 