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
            text: `You are a Senior Quantitative Technical Analyst and Precision Trading Bot. 
            Analyze this trading chart screenshot with surgical precision.
            
            Current System Time: ${localTime}
            Analysis Mode: ${isLive ? 'LIVE REAL-TIME (Priority: Scalping & Immediate Momentum)' : 'STATIC SCREENSHOT (Priority: Structural & Trend Analysis)'}
            
            Technical Requirements:
            1. CANDLESTICK PRECISION: Identify exact patterns (e.g., Three White Soldiers, Morning Star, Bearish Harami, Exhaustion Gaps).
            2. TREND CONTEXT: Determine if the trend is accelerating, slowing down (exhaustion), or consolidating.
            3. KEY LEVELS: Identify the MOST RECENT and RELEVANT Support/Resistance. Do not use old levels.
            4. INDICATOR SYNERGY: Look for RSI overbought/oversold conditions, MACD crossovers, or Bollinger Band squeezes/rejections.
            5. TIME-PRICE ALIGNMENT: Check the chart clock. If a candle is about to close (e.g., 59th second), factor that into the "suggestedDuration".
            
            Output Requirements:
            - "direction": Must be BUY, SELL, or WAIT.
            - "confidence": Be conservative. Only 90%+ if multiple indicators align.
            - "entryZone": The exact price or range to enter (e.g., "1.08450 - 1.08460").
            - "targetZone": The expected price level for the trade to be successful.
            - "suggestedDuration": Specific expiration (e.g., "M1 (60s)", "M5 (300s)", "End of 15m Candle").
            
            IMPORTANT FOR LIVE MODE:
            - Analyze the MICRO-TREND.
            - If price is hovering at a level, look for "rejection wicks" or "breakout volume".
            
            Return the analysis in strict JSON format:
            {
              "direction": "BUY" | "SELL" | "WAIT",
              "confidence": number,
              "reasoning": string[],
              "keyLevels": { "support": "string", "resistance": "string" },
              "entryZone": "string",
              "targetZone": "string",
              "indicators": "string summary",
              "suggestedDuration": "string"
            }
            
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
