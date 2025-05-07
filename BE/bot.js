require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  apiVersion: "v1beta"
});

// Dataset FAQ  
const FAQ_INFO = `
Informasi penting dari Warung abc:
1. Jam operasional: Setiap hari buka, tutup kalau kiamat atau sakit
2. Produk tersedia: sembako, kopi, mie instan, es krim dan lain-lain
3. list sembako : beras, minyak goreng, telur, susu 
4. list beras : beras cianjur Rp.13.000 1 kilo, beras lele Rp.13.500 1 kilo, beras garut Rp.14.000 1 kilo
5. list kopi : nescafe Rp.1000, top kopi Rp. 1500, indocafe Rp. 2000, good day Rp. 2000, 
6. list mie instan : indomie goreng Rp.2500, indomie kuah Rp.3000, indomie ramen Rp.4000 , mie sedap goreng Rp.3500, mie sedap kuah Rp.4000, mie sukses isi 2 Rp.5000
7. list es krim : walls cokelat Rp.8000, campina monas Rp.5000,  es serut Rp.2000
8. Hutang: tidak boleh berhutang kalau kepepet silahkan hubungi owner
9. Pembayaran: cash, qris, dan transfer.
10. Nomor rekening : 666 bank sesat atas nama warung abc
11. Nomor owner: 081-666-666 (hanya untuk kendala teknis dan pembayaran).
12. Layanan antar antara 10-30 menit tergantung jarak.
13. list gas lpg : 12kilo Rp.120000 3kilo 25000.
14. telur omega Rp.20000/pack
`;

// temporary chat history in local memory
const chatHistories = {};

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

  const fullPrompt = `
Kamu adalah customer service dari Warung Abc. Tugasmu menjawab pertanyaan pelanggan dengan ramah dan profesional, serta mampu menghitung total harga pesanan secara akurat berdasarkan daftar harga yang tersedia.

 Penting:
- Jika pelanggan menyebut jumlah barang (misalnya: "indomie goreng 2" atau "good day 1"), kamu wajib menjumlahkan total harga dari **item-item yang disebut saja**, dan jangan menghitung item lain yang tidak diminta.
- Jika pelanggan bertanya “totalnya berapa?” setelah menyebut jumlah barang di chat sebelumnya, gunakan riwayat percakapan untuk menghitung **semua item yang disebut beserta jumlahnya** secara akurat. Hindari kesalahan jumlah atau penjumlahan.
  Contoh:
  - "indomie goreng 2" (Rp2500 x 2 = Rp5000)
  - "good day 1" (Rp2000 x 1 = Rp2000)
  Maka total = Rp7000. BUKAN Rp8000 atau Rp9000.

 Untuk pertanyaan ketersediaan barang:
- Jika produk tersedia, jawab: "Ada, harganya Rp[...]."
- Jika tidak tersedia, jawab: "Maaf, kami tidak menjual produk tersebut."

 Gaya Bahasa:
- Gunakan sapaan hanya di awal percakapan.
- Setelahnya, jawab to the point, tidak perlu menyapa ulang atau bertanya balik jika pertanyaan belum jelas.
- Gaya bahasa harus natural, sopan, tidak terdengar seperti robot atau AI.

Jika informasi tidak tersedia, cukup jawab: “Maaf, Silakan hubungi owner secara langsung ya.” lalu beri nomornya.

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
