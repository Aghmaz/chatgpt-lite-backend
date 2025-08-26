const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

function createModel(apiKey) {
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Set it in Vercel Project Settings → Environment Variables."
    );
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

app.post("/chat", async (req, res) => {
  try {
    const { message, conversationHistory, apiKey } = req.body || {};
    if (!message) return res.status(400).json({ error: "Message is required" });

    const model = createModel(apiKey || process.env.GEMINI_API_KEY);
    const chat = model.startChat({
      history: conversationHistory
        ? conversationHistory.map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: msg.content,
          }))
        : [],
      generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
    });

    const result = await chat.sendMessage(message);
    const aiResponse = result.response.text();
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    if (error.message?.includes("API_KEY_INVALID")) {
      return res.status(401).json({ error: "Invalid API key." });
    }
    if (error.message?.includes("QUOTA_EXCEEDED")) {
      return res.status(429).json({ error: "Rate limit exceeded." });
    }
    res.json({
      response: `I'm experiencing some technical difficulties right now. Here's a mock response to your message: "${req?.body?.message}". Please try again later or check your API configuration.`,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend (Vercel) is running with Gemini AI",
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "ChatGPT Lite Backend API (Powered by Gemini)",
    endpoints: {
      "POST /chat": "Send a message",
      "GET /health": "Health check",
    },
    aiProvider: "Google Gemini Pro",
  });
});

module.exports = (req, res) => app(req, res);
