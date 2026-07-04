const sharp = require('sharp');
const toIco = require('to-ico');
const archiver = require('archiver');

// All standard favicon sizes
const FAVICON_SIZES = [16, 32, 48, 64, 128, 256];

// Resize image into all favicon PNG sizes
async function generatePNGs(imageBuffer) {
  return Promise.all(
    FAVICON_SIZES.map(size =>
      sharp(imageBuffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toBuffer()
    )
  );
}

// Generate ICO file from 16, 32 and 48px PNGs
async function generateICO(pngBuffers) {
  // ICO format uses the first three sizes: 16, 32, 48
  return toIco([pngBuffers[0], pngBuffers[1], pngBuffers[2]]);
}

// Package all PNGs + ICO into a single ZIP buffer
async function createZip(pngBuffers, icoBuffer) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    // Add each PNG file to the ZIP
    FAVICON_SIZES.forEach((size, i) => {
      archive.append(pngBuffers[i], {
        name: `favicon-${size}x${size}.png`
      });
    });

    // Add ICO file to the ZIP
    archive.append(icoBuffer, { name: 'favicon.ico' });

    archive.finalize();
  });
}

module.exports = { generatePNGs, generateICO, createZip, FAVICON_SIZES };
