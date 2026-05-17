// Smart AI client: uses Gemini API if key is available, falls back to Ollama

let model;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

if (process.env.GEMINI_API_KEY) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  model = {
    generateContent: async (prompt) => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }
      
      lastRequestTime = Date.now();
      
      try {
        const result = await genAI.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent(prompt);
        return result;
      } catch (error) {
        if (error.status === 429) {
          console.log("⚠️ Gemini rate limited, waiting 35 seconds...");
          await new Promise(resolve => setTimeout(resolve, 35000));
          const result = await genAI.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent(prompt);
          return result;
        }
        throw error;
      }
    }
  };
  
  console.log("🤖 AI Client: Using Google Gemini API with rate limiting");
} else {
  const OLLAMA_URL = "http://localhost:11434/api/generate";
  const MODEL = "mistral";

  model = {
    generateContent: async (prompt) => {
      try {
        const res = await fetch(OLLAMA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            prompt: prompt,
            stream: false
          })
        });

        const data = await res.json();

        return {
          response: {
            text: () => data.response
          }
        };
      } catch (error) {
        console.error("Ollama error:", error.message);
        throw new Error("Ollama service unavailable");
      }
    }
  };
  console.log("🤖 AI Client: Using local Ollama (no GEMINI_API_KEY found)");
}

module.exports = model;