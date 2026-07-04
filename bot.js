require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const {
  generatePNGs,
  generateICO,
  createZip,
  FAVICON_SIZES
} = require('./faviconGenerator');

// Webhook mode — no polling
const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

// ─── Core logic: download image and generate favicons ──
async function handleImage(chatId, fileId) {
  await bot.sendMessage(chatId, '⏳ Generating your favicons, please wait...');

  try {
    // Step 1: Download image from Telegram
    const fileLink = await bot.getFileLink(fileId);
    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    // Step 2: Resize into all PNG sizes
    const pngBuffers = await generatePNGs(imageBuffer);

    // Step 3: Generate ICO file
    const icoBuffer = await generateICO(pngBuffers);

    // Step 4: Package into ZIP
    const zipBuffer = await createZip(pngBuffers, icoBuffer);

    // Step 5: Send 32x32 preview image
    await bot.sendPhoto(chatId, pngBuffers[1], {
      caption: '🖼️ *Preview — 32×32px*',
      parse_mode: 'Markdown'
    });

    // Step 6: Send ZIP file
    const sizeList = FAVICON_SIZES
      .map(s => `   • favicon-${s}x${s}.png`)
      .join('\n');

    await bot.sendDocument(
      chatId,
      zipBuffer,
      {
        caption:
          `✅ *Your Favicon Package is Ready!*\n\n` +
          `📦 *ZIP contains:*\n` +
          `${sizeList}\n` +
          `   • favicon.ico _(16, 32 & 48px combined)_\n\n` +
          `💡 *How to use on your website:*\n` +
          `Put \`favicon.ico\` in your root folder then add to your HTML head:\n` +
          `\`<link rel="icon" href="/favicon.ico">\``,
        parse_mode: 'Markdown'
      },
      {
        filename: 'favicons.zip',
        contentType: 'application/zip'
      }
    );

    await bot.sendMessage(
      chatId,
      '📸 Send another image to generate more favicons!'
    );

  } catch (err) {
    console.error('Favicon generation error:', err.message);
    bot.sendMessage(
      chatId,
      '❌ Something went wrong processing your image.\nPlease try sending it again.'
    );
  }
}

// ─── /start ──────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'there';

  bot.sendMessage(
    chatId,
    `👋 Hello, ${name}!\n\n` +
    `I'm your *Favicon Generator Bot*! 🌐\n\n` +
    `*How it works:*\n` +
    `1️⃣ Send me any image or logo\n` +
    `2️⃣ I resize it into all standard sizes\n` +
    `3️⃣ You get a ZIP file ready for your website!\n\n` +
    `*Sizes I generate:*\n` +
    `• 16×16 — Browser tab\n` +
    `• 32×32 — Taskbar shortcut\n` +
    `• 48×48 — Windows site icon\n` +
    `• 64×64 — Windows site icon\n` +
    `• 128×128 — Chrome Web Store\n` +
    `• 256×256 — Windows Jump List\n` +
    `• favicon.ico — Multi-size browser icon\n\n` +
    `*Commands:*\n` +
    `❓ /help — How to use this bot\n` +
    `ℹ️ /about — About this bot\n\n` +
    `📸 Send me a logo or image to get started!`,
    { parse_mode: 'Markdown' }
  );
});

// ─── /help ───────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `❓ *How to Use Favicon Generator Bot*\n\n` +
    `1. Send any image or logo\n` +
    `2. Wait a few seconds\n` +
    `3. Receive a ZIP file with:\n\n` +
    `   🖼️ *6 PNG files* at all standard sizes\n` +
    `   🗂️ *favicon.ico* for all browsers\n\n` +
    `💡 *Tips for best results:*\n` +
    `• Use a *square* image or logo\n` +
    `• PNG with *transparent background* is ideal\n` +
    `• Higher resolution = better quality\n` +
    `• Simple logos look clearest at small sizes\n\n` +
    `📸 Send me an image to try it now!`,
    { parse_mode: 'Markdown' }
  );
});

// ─── /about ──────────────────────────────────────────
bot.onText(/\/about/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `ℹ️ *About Favicon Generator Bot*\n\n` +
    `This bot converts any image into a complete favicon package for your website.\n\n` +
    `*Size guide:*\n` +
    `• 16×16 — Browser tab icon\n` +
    `• 32×32 — Taskbar / bookmark icon\n` +
    `• 48×48 — Windows site icon\n` +
    `• 64×64 — Windows site icon HD\n` +
    `• 128×128 — Chrome Web Store icon\n` +
    `• 256×256 — Windows Jump List icon\n` +
    `• favicon.ico — Universal browser support\n\n` +
    `Built with Node.js + Sharp\n` +
    `Hosted on Railway 🚀`,
    { parse_mode: 'Markdown' }
  );
});

// ─── Handle photo messages ────────────────────────────
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  // Use highest quality version (last in array)
  const photo = msg.photo[msg.photo.length - 1];
  await handleImage(chatId, photo.file_id);
});

// ─── Handle images sent as files ─────────────────────
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const doc = msg.document;

  if (!doc.mime_type || !doc.mime_type.startsWith('image/')) {
    bot.sendMessage(
      chatId,
      '⚠️ Please send a valid image file (JPG, PNG, WebP, etc.)'
    );
    return;
  }

  await handleImage(chatId, doc.file_id);
});

// ─── Handle plain text messages ───────────────────────
bot.on('message', (msg) => {
  const text = msg.text;
  if (!text || text.startsWith('/')) return;

  bot.sendMessage(
    msg.chat.id,
    '📸 Please send me an *image or logo* to generate favicons from!',
    { parse_mode: 'Markdown' }
  );
});

module.exports = { bot };
