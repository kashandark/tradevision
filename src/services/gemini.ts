import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AnalysisResult {
  direction: "BUY" | "SELL" | "WAIT";
  confidence: number;
  reasoning: string[];
  keyLevels: {
    support: string;
    resistance: string;
  };
  entryZone?: string;
  targetZone?: string;
  indicators: string;
  suggestedDuration?: string;
  timestamp?: string;
}

export async function analyzeChart(imageUri: string, localTime: string, isLive: boolean = false): Promise<AnalysisResult> {
  if (!imageUri || !imageUri.includes(",")) {
    throw new Error("Invalid image data provided for analysis.");
  }

  const base64Data = imageUri.split(",")[1];
  if (!base64Data || base64Data.length < 100) {
    throw new Error("Image data is too small or corrupted.");
  }

  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `You are a Senior Quantitative Analyst. Analyze this chart with surgical precision.
            
            Current Time: ${localTime}
            Mode: ${isLive ? 'LIVE SCALPING' : 'STRUCTURAL ANALYSIS'}
            
            Technical Requirements:
            1. CANDLESTICKS: Identify exact patterns (e.g., Pin Bar, Engulfing, Morning Star).
            2. TREND: Confirm if trend is accelerating or exhausting.
            3. LEVELS: Identify immediate Support/Resistance.
            4. INDICATORS: Synergy check (RSI, MACD, BB).
            
            Output (JSON):
            - "direction": BUY, SELL, or WAIT.
            - "confidence": 0-100 (conservative).
            - "entryZone": Exact price range.
            - "targetZone": Expected price level.
            - "indicators": Summary of technical indicators.
            - "suggestedDuration": Expiration (e.g., M1, M5).
            - "reasoning": Array of concise bullet points (strings).
            - "keyLevels": { "support": "string", "resistance": "string" }
            
            Return ONLY strict JSON.
            
            Disclaimer: Always state that this is for educational purposes and not financial advice.`
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageUri.split(",")[1]
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  const result = await model;
  const text = result.text;
  try {
    const parsed = JSON.parse(text || "{}") as AnalysisResult;
    parsed.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini response", text);
    throw new Error("Failed to analyze chart data.");
  }
}
