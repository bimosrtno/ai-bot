
#  WhatsApp Customer Service Bot 

This bot is an automated customer service system that runs on WhatsApp using `whatsapp-web.js`, and responds to customer inquiries with the help of Gemini AI (Google Generative AI).

>  **Important Note**: This bot **does NOT use the official WhatsApp API**. Use a new or secondary WhatsApp number to avoid potential bans by Meta. *Warung ABC* is used only as a **case study**. Please customize the FAQ dataset and prompts according to your own business needs. Chat history is not stored in any database, and the bot runs locally.

---

##  Dependencies

Install the following dependencies in your project:

```bash
npm install whatsapp-web.js qrcode-terminal dotenv @google/generative-ai
```

---

##  Gemini API Key

To use the Gemini AI feature in this bot, you need to obtain an API Key from Google. Follow these steps:

1. Visit Google AI Studio
2. Log in with your Google Account
3. Enable API Access
4. Go to the "API Keys" menu
5. Create a new API Key
6. Save the API Key in the `.env` file

---

##  Environment Configuration (.env)

Create a `.env` file in the root folder and add the following variables:

```env
GEMINI_API_KEY=your_google_gemini_api_key
WHATSAPP_SESSION_NAME=my-wa-session
```

---

##  Installation & Running the Bot

### 1. Clone or Download the Repository

```bash
git clone https://github.com/bimosrtno/ai-bot
cd BE
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up the `.env` File

Create a `.env` file as described above.

### 4. Run the Bot

```bash
node bot.js
```

If successful, a QR code will appear in the terminal. Scan it using WhatsApp on the device you wish to use.

---

##  How to Use the Bot

1. Run the bot using `node bot.js`
2. Scan the QR code that appears with your WhatsApp
3. The bot will start reading incoming messages from customers
4. The bot responds based on the `FAQ_INFO` using Gemini AI

---

##  Key Features

- Automated responses to customer questions
- Natural and polite language
- Random response delay to simulate human behavior
- Directs customer to the owner if AI can't answer

---

##  AI Response System

The bot reads incoming messages and combines them with a predefined **internal FAQ**. This is then sent to **Gemini AI** to generate a response. Customize the content according to your business needs.

```js
const fullPrompt = `
You are a customer service representative for Warung ABC.

Respond to every customer question politely and professionally...
...
`;
```

### Send to Gemini AI

```js
const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
});
```

### Reply to Customer

The AI-generated reply is sent back to the customer with a 2–4 second randomized delay to feel more natural:

```js
setTimeout(() => {
  msg.reply(replyText);
}, delay);
```

---

##  FAQ and Internal Information (Examples)

The bot uses internal data such as:

* Operating hours
* Product list and pricing
* Payment methods
* Owner’s contact info

All information is defined in a `FAQ_INFO` template to help the AI formulate responses. Please customize according to your own business.

---

##  In-Memory Chat History (Context Memory)

###  Purpose

Temporarily store user chat history in RAM so the AI can understand the context when users say things like “how much is the total?”.

- Reduce memory usage (since chat histories are stored in RAM).
- Avoid overly long prompts being sent to the AI model.
- Protect user privacy by not keeping conversations indefinitely.

---

###  Limitations

- No permanent storage: All chat data is lost when the server is stopped or restarted.
- Not suitable for use cases that require long-term history or multi-session continuity.
- No per-user activity filter: All histories are cleared simultaneously, regardless of last activity.

---

### Potential Improvements

- Store chat history in a file or database for persistence.
- Add a timestamp to each message to allow selective cleanup based on idle time.
- Use Redis or an LRU (Least Recently Used) cache for better memory control at scale.

### Data Structure

```js
const chatHistories = {
  "6281234567890@c.us": [
    "indomie goreng 2",
    "good day 1",
    "how much is the total?"
  ]
};
```

### Mechanism

- Each user gets a unique message history array
- A maximum of 5 previous messages are used to construct the prompt
- Nothing is stored in a database or on disk

### Automatic Reset

```js
setInterval(() => {
  for (const userId in chatHistories) {
    chatHistories[userId] = [];
  }
}, 1000 * 60 * 10); // Every 10 minutes
```

### Pros & Cons

✅ Fast and simple  
❌ Volatile (data lost on restart)  
❌ Not ideal for long conversations or persistent sessions

---

##  Exit Bot

To exit the bot gracefully, use Ctrl + C in terminal

```js
process.on('SIGINT', () => {
  console.log('\n exit bot');
  process.exit();
});
```

---

##  Notes

* The bot **will not respond to its own messages** (`if (msg.fromMe) return;`)
* If the AI is unable to respond, the customer will be referred to the owner

---

##  Security

* Never share your Gemini API Key or `.env` file publicly.
* Use a business or secondary WhatsApp number to avoid getting banned by META.

---

##  Status

| Component        | Status         |
| ---------------- | -------------- |
| WhatsApp Client  | ✅ Active       |
| Google Gemini    | ✅ Active       |
| QR Auth          | ✅ One-time scan |
| Response Delay   | ✅ 2–4 seconds  |

---
