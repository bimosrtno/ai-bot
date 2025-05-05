require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  apiVersion: "v1beta"
});

// Dataset FAQ dan informasi CS 
const FAQ_INFO = `
Informasi penting dari Warung abc:
1. Jam operasional: Setiap hari buka, tutup kalau kiamat atau sakit
2. Produk tersedia: sembako, kopi, mie instan, es krim dan lain-lain
3. list sembako : beras, minyak goreng, telur, susu 
4. list beras : beras cianjur Rp.13.000 1 liter, beras lele Rp.13.500 1 liter, beras garut Rp.14.000 1 liter
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

// Inisialisasi WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: process.env.WHATSAPP_SESSION_NAME }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Scan QR
client.on('qr', qr => {
  console.clear();
  qrcode.generate(qr, { small: true });
  console.log('Silakan scan QR dengan WhatsApp.');
});


client.on('ready', () => console.log('Bot Customer Service Siap Digunakan'));

// Pesan masuk
client.on('message', async msg => {
    if (msg.fromMe) return;
  
    const userMessage = msg.body;
    console.log(`[${msg.from}] → ${userMessage}`);
  
    // prompt customer service
    const fullPrompt = `
Kamu adalah customer service dari Warung Abc. selain menjawab pertanyaan kamu juga diharapkan bisa melakukan oprasi matematika sederhana untuk menghitung jumlah pesanan dari pelanggan.

Jawablah setiap pertanyaan pelanggan dengan **ramah, sopan, dan profesional**, menggunakan gaya bahasa yang **natural dan to the point**, tidak terlalu panjang dan tidak terdengar seperti robot atau AI.  
Gunakan sapaan pada saat awal percakapan saja, jangan menggunakan sapaan lainnya. cukup memberi informasi saja jangan bertanya lagi atau pertanyaan belum jelas.
Gunakan informasi berikut untuk membantu menjawab:
${FAQ_INFO}

Pesan dari pelanggan:
"${userMessage}"

Jawab sesuai konteks. Jika tidak tahu jawabannya, arahkan pelanggan untuk menghubungi owner secara sopan.
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
  
      const delay = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000; // 2–4 detik
      console.log(`Menunggu ${delay / 1000} detik sebelum membalas`);
      
      setTimeout(() => {
        client.sendMessage(msg.from, replyText);
      }, delay);
      
    } catch (err) {
      console.error('Error saat akses Gemini:', err);
      await msg.reply("Sistem sedang error. Silakan coba lagi nanti.");
    }
  });
  
// initialize bot
client.initialize();

// exit
process.on('SIGINT', () => {
  console.log('\n exit bot');
  process.exit();
});
