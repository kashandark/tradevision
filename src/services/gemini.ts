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
            text: `You are a professional Technical Analyst and Trading Bot. 
            Analyze this trading chart screenshot (likely from a platform like Pocket Option).
            
            Current System Time: ${localTime}
            Analysis Mode: ${isLive ? 'LIVE REAL-TIME (Priority: Immediate Scalping)' : 'STATIC SCREENSHOT (Priority: Detailed Technical Analysis)'}
            
            Tasks:
            1. Identify the current time displayed on the chart (look at the clock or X-axis).
            2. Identify the current trend (Bullish, Bearish, Sideways).
            3. Locate immediate Support and Resistance levels.
            4. Look for candlestick patterns (e.g., Pin Bar, Engulfing, Doji).
            5. Analyze visible indicators (RSI, MACD, Bollinger Bands) if present.
            6. Suggest a clear action: BUY (Call), SELL (Put), or WAIT (Neutral).
            7. Provide specific entry and exit price suggestions.
            8. Suggest an optimal TRADE DURATION or EXPIRATION (e.g., 1 min, 5 min, End of Hour) based on the time and volatility.
            9. Provide a confidence score (0-100%).
            
            IMPORTANT FOR LIVE MODE:
            - Focus on the LAST COMPLETED CANDLE and the CURRENT FORMING CANDLE.
            - If the price is at a major level, prioritize a REVERSAL or BREAKOUT signal.
            - Be extremely precise with the "suggestedDuration" (e.g., "M1" for 1-minute expiration).
            
            Return the analysis in strict JSON format with the following structure:
            {
              "direction": "BUY" | "SELL" | "WAIT",
              "confidence": number,
              "reasoning": string[],
              "keyLevels": { "support": "string", "resistance": "string" },
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
