import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // Increased to 60s for Gemini API latency

export async function GET() {
  // Health check endpoint
  const hasKey = !!process.env.GEMINI_API_KEY
  const keyPreview = hasKey && process.env.GEMINI_API_KEY 
    ? process.env.GEMINI_API_KEY.substring(0, 8) + "..."
    : "NOT SET"
  
  return NextResponse.json({ 
    status: "ok",
    geminiConfigured: hasKey,
    keyPreview,
    model: "gemini-2.0-flash"
  })
}

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType = "image/jpeg", fieldName, cropType } = await req.json();

    // Input validation
    if (!imageBase64) {
      console.error("❌ No image provided in request");
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Check API key exists
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY not configured")
      return NextResponse.json(
        { error: "Server configuration error", details: "GEMINI_API_KEY not set" },
        { status: 500 }
      )
    }

    // Validate image size
    if (imageBase64.length < 100) {
      console.error("❌ Image too small:", imageBase64.length, "chars");
      return NextResponse.json(
        { error: "Image too small or corrupted", details: `Base64 length: ${imageBase64.length}` },
        { status: 400 }
      );
    }

    // Validate MIME type
    const validMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heic"];
    const finalMimeType = validMimeTypes.includes(mimeType) ? mimeType : "image/jpeg";

    console.log("📸 Analysis request received:")
    console.log("   Field:", fieldName || "Unknown")
    console.log("   Crop:", cropType || "Auto-detect")
    console.log("   MIME:", finalMimeType)
    console.log("   Image size:", Math.round(imageBase64.length * 0.75 / 1024), "KB")
    console.log("   Base64 length:", imageBase64.length)

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 1024,
      }
    })

    const prompt = `You are an expert agricultural plant pathologist AI specialized in Indian crops. Analyze this crop image carefully.

Context:
- Field Name: ${fieldName || "Not specified"}
- Crop Type: ${cropType || "Auto-detect from image"}
- Location: India

IMPORTANT: Respond ONLY with a valid JSON object. No markdown. No backticks. No explanation. Start with { and end with }.

Required JSON structure:
{
  "cropType": "crop name",
  "isHealthy": boolean,
  "disease": "disease name or null",
  "pestDetected": "pest name or null",
  "severity": "healthy" | "mild" | "moderate" | "severe",
  "confidence": 0-100,
  "affectedAreaPercent": 0-100,
  "cause": "fungal" | "bacterial" | "viral" | "pest" | "nutrient_deficiency" | "unknown",
  "symptoms": ["string"],
  "treatment": {
    "chemical": "specific chemical name",
    "dosage": "dosage per acre",
    "applicationMethod": "spray/soil drench/foliar",
    "frequency": "how often"
  },
  "organicAlternative": "organic treatment or null",
  "urgency": "immediate" | "within_3_days" | "within_a_week" | "monitor_only",
  "spreadRisk": "high" | "medium" | "low",
  "estimatedYieldLoss": "percentage",
  "preventionTips": ["tip1", "tip2", "tip3"],
  "nextScanRecommended": "when to scan again"
}`;

    console.log("🤖 Sending to Gemini API...");

    const result = await model.generateContent([
      { text: prompt },
      { 
        inlineData: { 
          mimeType: finalMimeType, 
          data: imageBase64 
        } 
      }
    ]);

    const responseText = result.response.text();
    console.log("📥 Gemini response received, length:", responseText.length);
    console.log("   First 200 chars:", responseText.substring(0, 200));

    // Clean response
    let cleaned = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Extract JSON object
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("❌ No JSON found in response:", cleaned.substring(0, 300));
      return NextResponse.json(
        { 
          error: "AI returned invalid format", 
          details: "Response did not contain a JSON object",
          raw: cleaned.substring(0, 200)
        },
        { status: 500 }
      );
    }

    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
      console.log("✅ Parsed analysis:", {
        crop: analysis.cropType,
        disease: analysis.disease || "healthy",
        severity: analysis.severity,
        confidence: analysis.confidence
      });
    } catch (parseErr: any) {
      console.error("❌ JSON parse error:", parseErr.message);
      console.error("   Attempted to parse:", cleaned.substring(0, 300));
      return NextResponse.json(
        { 
          error: "AI response parsing failed", 
          details: parseErr.message,
          raw: cleaned.substring(0, 200)
        },
        { status: 500 }
      );
    }

    // Validate required fields with defaults
    if (analysis.confidence === undefined) analysis.confidence = 70;
    if (!analysis.severity) analysis.severity = "unknown";
    if (analysis.isHealthy === undefined) analysis.isHealthy = !analysis.disease;

    return NextResponse.json({ success: true, analysis });

  } catch (err: any) {
    console.error("=== GEMINI API ERROR ===");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Stack:", err.stack);
    
    // Determine hint based on error
    let hint = "Unknown error. Check Vercel function logs.";
    let status = 500;
    
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("api_key") || msg.includes("403") || msg.includes("invalid")) {
      hint = "GEMINI_API_KEY is invalid or missing. Get a new key from aistudio.google.com";
      status = 401;
    } else if (msg.includes("429") || msg.includes("quota") || msg.includes("exceeded")) {
      hint = "Rate limit or quota exceeded. Wait 60 seconds and try again.";
      status = 429;
    } else if (msg.includes("400") || msg.includes("invalid image") || msg.includes("bad request")) {
      hint = "Invalid image format. Try JPEG or PNG under 10MB.";
      status = 400;
    } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("econnreset")) {
      hint = "Network error reaching Gemini API. Check Vercel outbound network.";
      status = 502;
    } else if (msg.includes("not found") || msg.includes("404")) {
      hint = "Model 'gemini-2.0-flash' not found. Check model name.";
      status = 404;
    }

    return NextResponse.json(
      { 
        error: "Analysis failed", 
        details: err.message,
        hint,
        name: err.name
      },
      { status }
    );
  }
}