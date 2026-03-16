import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "undefined") return "";
  return key;
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

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
  if (!getApiKey()) {
    throw new Error("Gemini API Key is missing. Please configure it in the Secrets menu or .env file.");
  }

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
            text: `You are an Elite M1 Scalping Bot and Quantitative Analyst. Your goal is to provide ultra-accurate, real-time BUY/SELL signals for the 1-minute (M1) timeframe.
            
            Current Time: ${localTime}
            Mode: ${isLive ? 'REAL-TIME M1 SCALPING' : 'STRUCTURAL ANALYSIS'}
            
            M1 Scalping Strategy Rules:
            1. MICRO-TREND: Identify if the M1 trend is bullish, bearish, or ranging.
            2. CANDLESTICK SIGNALS: Look for high-probability M1 reversal or continuation candles (e.g., Pin Bars, Engulfing, Marubozu).
            3. MOMENTUM: Use the current price action to determine if a move is likely to sustain for the next 60-120 seconds.
            4. PRECISION LEVELS: Identify the exact micro-support and micro-resistance levels visible on the M1 chart.
            5. SIGNAL ACCURACY: Only suggest BUY or SELL if the confidence is above 90%. Otherwise, suggest WAIT.
            
            Output (JSON):
            - "direction": BUY, SELL, or WAIT. (CRITICAL: This is an M1-SPECIFIC signal. Only suggest BUY/SELL if a high-probability 1-minute scalping opportunity exists).
            - "confidence": 0-100 (90+ for high-probability M1 setups).
            - "pattern": The specific M1 pattern identified (e.g., "M1 Bullish Engulfing", "M1 Breakout").
            - "entryZone": The EXACT price for immediate M1 entry (e.g., "1.0842").
            - "targetZone": The EXACT price target for a 1-2 minute trade (e.g., "1.0855").
            - "indicators": Brief summary of M1 indicator alignment.
            - "suggestedDuration": Strictly "1-2 Minutes" for M1 scalping.
            - "reasoning": 3 concise bullet points explaining the M1 momentum.
            - "keyLevels": { "support": "string", "resistance": "string" }

            CRITICAL M1 SCALPING RULES:
            1. Focus ONLY on the 1-minute timeframe dynamics.
            2. Do not flip signals rapidly unless a clear M1 structural shift is visible.
            3. If the current M1 candle is indecisive, suggest WAIT.
            4. Ensure Entry/Target prices are precise for M1 micro-moves.
            
            Return ONLY strict JSON.
            
            Disclaimer: Educational purposes only. Not financial advice.`
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
