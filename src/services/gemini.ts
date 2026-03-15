import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AnalysisResult {
  direction: "BUY" | "SELL" | "WAIT";
  confidence: number;
  pattern?: string;
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
            text: `You are a Senior Quantitative Analyst and Technical Chart Specialist. Analyze this chart with surgical precision and temporal awareness.
            
            Current Time: ${localTime}
            Mode: ${isLive ? 'LIVE SCALPING (High Sensitivity)' : 'STRUCTURAL ANALYSIS (High Reliability)'}
            
            Technical Requirements:
            1. PATTERN RECOGNITION: Identify specific chart patterns (e.g., Head & Shoulders, Double Bottom, Rising Wedge, Flag, Pennant). Be explicit about the pattern name.
            2. CANDLESTICKS: Identify exact high-probability patterns (e.g., Pin Bar, Engulfing, Morning Star, Doji at key levels).
            3. TREND ALIGNMENT: Confirm if the trend is accelerating, exhausting, or reversing relative to the current time and session.
            4. LEVELS: Identify immediate and secondary Support/Resistance zones.
            5. INDICATORS: Synergy check (RSI divergence, MACD crossovers, Bollinger Band squeezes).
            6. SUSTAINABILITY: Estimate how long this signal will remain valid based on the current market momentum.
            
            Output (JSON):
            - "direction": BUY, SELL, or WAIT.
            - "confidence": 0-100 (be conservative, 85+ only for high-probability setups).
            - "pattern": Name of the primary chart pattern identified.
            - "entryZone": Exact price range for entry.
            - "targetZone": Expected price level for profit taking.
            - "indicators": Summary of technical indicators and their alignment.
            - "suggestedDuration": How long the trade is expected to sustain (e.g., "Next 5-15 mins", "Next 1-4 hours", "End of Session").
            - "reasoning": Array of concise bullet points explaining the logic.
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
