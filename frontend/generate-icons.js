/**
 * Run this script with Node.js to generate placeholder PWA icons.
 * Requires: npm install canvas
 * Usage:    node generate-icons.js
 *
 * Or install a proper icon and use a tool like PWA-Asset-Generator:
 *   npx pwa-asset-generator icon.png src/assets/icons
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join(__dirname, 'src', 'assets', 'icons');

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#3f51b5';
  ctx.fillRect(0, 0, size, size);

  // Text "S"
  ctx.fillStyle = '#ffffff';
  ctx.font      = `bold ${Math.round(size * 0.55)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', size / 2, size / 2);

  fs.writeFileSync(path.join(outDir, `icon-${size}x${size}.png`), canvas.toBuffer('image/png'));
  console.log(`Generated icon-${size}x${size}.png`);
});
