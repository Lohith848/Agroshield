import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType = "image/jpeg", fieldName, cropType } = await req.json();

    if (!imageBase64) {
      return new NextResponse(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are an expert agricultural plant pathologist and pest specialist AI trained on Indian crop diseases. Analyze this crop image carefully.

Field: ${fieldName || "Unknown Field"}
Crop Type (if known): ${cropType || "Auto-detect from image"}

Respond ONLY with a valid JSON object. No markdown. No explanation. Just JSON.

{
  "cropType": "detected crop name in English",
  "isHealthy": true or false,
  "disease": "exact disease name or null if healthy",
  "pestDetected": "pest name if visible or null",
  "severity": "healthy" or "mild" or "moderate" or "severe",
  "confidence": number between 0 and 100,
  "affectedAreaPercent": number between 0 and 100,
  "cause": "fungal" or "bacterial" or "viral" or "pest" or "nutrient_deficiency" or "unknown",
  "symptoms": ["symptom 1", "symptom 2", "symptom 3"],
  "treatment": {
    "chemical": "specific chemical name and brand if applicable",
    "dosage": "dosage per acre in ml or grams",
    "applicationMethod": "spray/soil drench/foliar etc",
    "frequency": "how often to apply"
  },
  "organicAlternative": "organic/natural treatment option",
  "urgency": "immediate" or "within_3_days" or "within_a_week" or "monitor_only",
  "spreadRisk": "high" or "medium" or "low",
  "estimatedYieldLoss": "percentage yield loss if untreated",
  "preventionTips": ["tip 1", "tip 2", "tip 3"],
  "icarReference": "relevant ICAR guideline if known or null",
  "nextScanRecommended": "when to scan again e.g. in 3 days"
}`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: imageBase64
        }
      }
    ]);

    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(cleaned);

    return new NextResponse(JSON.stringify({ success: true, analysis }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Gemini error:", err);
    return new NextResponse(JSON.stringify({
      error: "Analysis failed",
      details: err.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}