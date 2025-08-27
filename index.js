const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
console.log(process.env.GEMINI_API_KEY);
// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI client
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.warn(
    "GEMINI_API_KEY is not set. Set it in .env for local and in Vercel for prod."
  );
}
const genAI = new GoogleGenerativeAI(geminiApiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message, conversationHistory, apiKey } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const systemPrompt = {
      role: "user",
      parts: [
        "You are an expert assistant. Always provide a clear, helpful response no matter what. " +
          "If the user asks something ambiguous, clarify it politely. " +
          "Never say 'I cannot respond' — always give the best possible guidance.",
      ],
    };

    const formattedHistory = [
      systemPrompt,
      ...conversationHistory.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: Array.isArray(msg.content) ? msg.content : [msg.content],
      })),
    ];
    // Prepare conversation history for Gemini
    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    // Send message to Gemini
    const result = await chat.sendMessage(message);
    const aiResponse = result.response.text();
    console.log(aiResponse, "here is express.response");
    if (aiResponse.trim().length > 0) {
      return res.json({ response: aiResponse });
    }

    // If Gemini gave empty response → fallback
    return res.json({
      response:
        "I am your expert assistant. It seems the system couldn’t generate a detailed answer right now, but I’m here to help. Please rephrase or try again.",
    });
  } catch (error) {
    console.error("Error in chat endpoint:", error);

    // Handle Gemini API errors
    if (error.message && error.message.includes("API_KEY_INVALID")) {
      return res.status(401).json({
        error:
          "Invalid API key. Please check your Gemini API key and try again.",
      });
    }

    if (error.message && error.message.includes("QUOTA_EXCEEDED")) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
      });
    }

    // Return mock response for other errors
    res.json({
      response: `I'm experiencing some technical difficulties right now. Here's a mock response to your message: "${req.body.message}". Please try again later or check your API configuration.`,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "ChatGPT Lite Backend is running with Gemini AI",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "ChatGPT Lite Backend API (Powered by Gemini)",
    endpoints: {
      "POST /chat": "Send a message and get AI response",
      "GET /health": "Health check",
    },
    aiProvider: "Google Gemini Pro",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong on the server",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 ChatGPT Lite Backend server running on port ${PORT}`);
  console.log(`🤖 Powered by Google Gemini AI`);
  console.log(`📱 Mobile app should connect to: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
