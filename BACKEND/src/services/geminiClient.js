// Smart AI client: uses Gemini API if key is available, falls back to Ollama

let model;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000;
const MAX_RETRIES = 3;
const BASE_DELAY = 2000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff(fn, retries = MAX_RETRIES) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorStr = error.message?.toLowerCase() || "";
      
      if (errorStr.includes("429") || errorStr.includes("rate limit") || errorStr.includes("quota")) {
        const delay = BASE_DELAY * Math.pow(2, i);
        console.log(`⏳ Rate limited. Retrying in ${delay/1000}s... (attempt ${i+1}/${retries})`);
        await sleep(delay);
      } else if (errorStr.includes("503") || errorStr.includes("unavailable")) {
        const delay = BASE_DELAY * Math.pow(2, i);
        console.log(`⏳ Service unavailable. Retrying in ${delay/1000}s... (attempt ${i+1}/${retries})`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

if (process.env.GEMINI_API_KEY) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  model = {
    generateContent: async (prompt) => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      }
      
      lastRequestTime = Date.now();
      
      return retryWithBackoff(async () => {
        try {
          const result = await genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            generationConfig: {
              maxOutputTokens: 2048,
              temperature: 0.7
            }
          }).generateContent(prompt);
          return result;
        } catch (error) {
          const errorStr = error.message?.toLowerCase() || "";
          if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("rate limit")) {
            throw new Error("RATE_LIMIT");
          }
          throw error;
        }
      });
    }
  };
  
  console.log("🤖 AI Client: Using Google Gemini API with retry logic");
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