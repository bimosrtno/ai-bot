require('dotenv').config();
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  apiVersion: "v1beta"
});

// temporary chat history in local memory
const chatHistories = {};

const FAQ_INFO = JSON.parse(fs.readFileSync(process.env.FAQ_INFO_PATH)).faq.join('\n');
const BASE_PROMPT = JSON.parse(fs.readFileSync(process.env.PROMPT_CS_PATH)).prompt;

// Inisialisasi WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: process.env.WHATSAPP_SESSION_NAME }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', qr => {
  console.clear();
  qrcode.generate(qr, { small: true });
  console.log('Silakan scan QR dengan WhatsApp.');
});

client.on('ready', () => console.log('Bot Customer Service Siap Digunakan'));

// chat filer
client.on('message', async msg => {
  if (msg.fromMe) return;

  // filer for personal chat only
  if (
    !msg.from.endsWith('@c.us') || // personal chat
    msg.from === 'status@broadcast' || // ignore broadcast
    msg.type !== 'chat' // only text
  ) return;

  const userId = msg.from;
  const userMessage = msg.body;
  console.log(`[${userId}] → ${userMessage}`);

  // history temporary per user
  if (!chatHistories[userId]) {
    chatHistories[userId] = [];
  }
  chatHistories[userId].push(userMessage);

  // get recent history (max 5 messages)
  const recentHistory = chatHistories[userId].slice(-5).join('\n');

  const fullPrompt = `${BASE_PROMPT}

  Gunakan informasi berikut untuk membantu menjawab:
  ${FAQ_INFO}
  
  Riwayat percakapan terakhir:
  ${recentHistory}
  
  Pesan terbaru dari pelanggan:
  "${userMessage}"
  
  Berikan jawaban berdasarkan konteks dan logika yang masuk akal.
  `;

  try {
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: fullPrompt }]
      }]
    });

    const response = await result.response;
    const replyText = response.text();

    const delay = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000; // 2–4 sec
    console.log(`Menunggu ${delay / 1000} detik sebelum membalas`);

    setTimeout(() => {
      client.sendMessage(userId, replyText);
    }, delay);

  } catch (err) {
    console.error('Error saat akses Gemini:', err);
    await msg.reply("Sistem sedang error. Silakan coba lagi nanti.");
  }
});

// reset chat history after 10 minutes
setInterval(() => {
  for (const userId in chatHistories) {
    chatHistories[userId] = [];
  }
  console.log('Semua chat history telah dibersihkan.');
}, 1000 * 60 * 10); // 10 minutes

// Initialize bot
client.initialize();

// Exit 
process.on('SIGINT', () => {
  console.log('\n exit bot');
  process.exit();
});
